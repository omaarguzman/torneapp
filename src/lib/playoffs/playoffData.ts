import type { createClient } from '@/lib/supabase/server'
import { scheduleFixtures, type SlotTemplate } from '@/lib/fixtures/scheduler'
import { mondayOf } from '@/lib/fixtures/fixtureUpdate'
import { todayInMexico } from '@/lib/registration'
import { loadTournamentStats } from '@/lib/stats/tournamentStats'
import {
  firstRound,
  homeAway,
  isStage,
  nextRound,
  STAGE_ORDER,
  tieOutcome,
  type LegResult,
  type PlayoffConfig,
  type Stage,
  type TieOutcome,
  type TiePlan,
  type TieSeed,
} from './bracket'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type TieView = TiePlan & {
  id: string
  stage: Stage
  legs: number
  matches: (LegResult & { id: string; status: string; matchDate: string | null; startTime: string | null })[]
  outcome: TieOutcome
}

export type PlayoffState = {
  config: PlayoffConfig | null
  started: boolean
  seeds: TieSeed[]
  ties: TieView[]
  /** Ronda más reciente creada */
  currentStage: Stage | null
  /** Todas las eliminatorias de la ronda actual tienen ganador */
  currentDone: boolean
  /** Alguna eliminatoria de la ronda actual ya tiene un partido jugado */
  currentHasPlayed: boolean
  teamNames: Record<string, string>
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function configFrom(t: {
  playoff_qualifiers: number | null
  playoff_direct: number | null
  playoff_legs: unknown
  playoff_tiebreak: string | null
}): PlayoffConfig | null {
  if (!t.playoff_qualifiers) return null
  return {
    qualifiers: t.playoff_qualifiers,
    direct: t.playoff_direct ?? t.playoff_qualifiers,
    legs: (t.playoff_legs ?? {}) as PlayoffConfig['legs'],
    tiebreak: t.playoff_tiebreak === 'penalties' ? 'penalties' : 'seed',
  }
}

export const legsFor = (cfg: PlayoffConfig, stage: Stage) => (cfg.legs[stage] === 2 ? 2 : 1)

export async function loadPlayoffState(supabase: Supabase, tournamentId: string): Promise<PlayoffState> {
  const [{ data: t }, { data: seeds }, { data: ties }, { data: teams }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('playoff_qualifiers, playoff_direct, playoff_legs, playoff_tiebreak, playoff_started_at')
      .eq('id', tournamentId)
      .single(),
    supabase.from('playoff_seeds').select('team_id, seed').eq('tournament_id', tournamentId),
    supabase
      .from('playoff_ties')
      .select(
        `id, stage, position, high_team_id, low_team_id, high_seed, low_seed, legs,
         matches (id, leg, status, home_team_id, away_team_id, score_home, score_away,
                  penalties_home, penalties_away, validated_at, match_date, start_time)`
      )
      .eq('tournament_id', tournamentId)
      .order('position'),
    supabase.from('teams').select('id, name').eq('tournament_id', tournamentId),
  ])

  const config = t ? configFrom(t) : null
  const tiebreak = config?.tiebreak ?? 'seed'
  const tieViews: TieView[] = (ties ?? [])
    .filter((x) => isStage(x.stage))
    .map((x) => {
      const plan: TiePlan = {
        position: x.position,
        high: { teamId: x.high_team_id, seed: x.high_seed },
        low: { teamId: x.low_team_id, seed: x.low_seed },
      }
      const matches = ((x.matches ?? []) as {
        id: string
        leg: number | null
        status: string
        home_team_id: string
        away_team_id: string
        score_home: number | null
        score_away: number | null
        penalties_home: number | null
        penalties_away: number | null
        validated_at: string | null
        match_date: string | null
        start_time: string | null
      }[])
        .map((m) => ({
          id: m.id,
          leg: m.leg ?? 1,
          status: m.status,
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          scoreHome: m.score_home,
          scoreAway: m.score_away,
          penaltiesHome: m.penalties_home,
          penaltiesAway: m.penalties_away,
          final: m.status === 'played' && !!m.validated_at,
          matchDate: m.match_date,
          startTime: m.start_time,
        }))
        .sort((a, b) => a.leg - b.leg)
      return { ...plan, id: x.id, stage: x.stage as Stage, legs: x.legs, matches, outcome: tieOutcome(plan, x.legs, matches, tiebreak) }
    })

  const created = STAGE_ORDER.filter((s) => s !== 'tercer_lugar' && tieViews.some((v) => v.stage === s))
  const currentStage = created[created.length - 1] ?? null
  const current = tieViews.filter((v) => v.stage === currentStage)

  return {
    config,
    started: !!t?.playoff_started_at,
    seeds: (seeds ?? []).map((s) => ({ teamId: s.team_id, seed: s.seed })).sort((a, b) => a.seed - b.seed),
    ties: tieViews,
    currentStage,
    currentDone: current.length > 0 && current.every((v) => v.outcome.status === 'decided'),
    currentHasPlayed: current.some((v) => v.matches.some((m) => m.status !== 'scheduled' && m.status !== 'pending')),
    teamNames: Object.fromEntries((teams ?? []).map((x) => [x.id, x.name])),
  }
}

/** Lugares de la tabla general (solo fase regular) para arrancar la liguilla. */
export async function currentSeeds(supabase: Supabase, tournamentId: string): Promise<TieSeed[]> {
  const stats = await loadTournamentStats(supabase, tournamentId)
  return stats.standings.map((s, i) => ({ teamId: s.teamId, seed: i + 1 }))
}

/** La ronda que toca: la primera (si no ha empezado) o la siguiente con los ganadores. */
export function plannedRound(state: PlayoffState, seeds: TieSeed[]) {
  if (!state.config) return null
  if (!state.currentStage) return firstRound(seeds, state.config)
  if (!state.currentDone) return null
  const seedOf = new Map(state.seeds.map((s) => [s.teamId, s.seed]))
  const winners = state.ties
    .filter((v) => v.stage === state.currentStage && v.outcome.status === 'decided')
    .map((v) => {
      const winner = (v.outcome as Extract<TieOutcome, { status: 'decided' }>).winner
      return { teamId: winner, seed: seedOf.get(winner) ?? 99 }
    })
  return nextRound(state.currentStage, winners, state.seeds, state.config)
}

export type RoundPayload = {
  stage: Stage
  ties: { id: string; position: number; high: string; low: string; high_seed: number; low_seed: number; legs: number }[]
  matchdays: {
    leg: number | null
    week_start: string
    matches: { tie: string; leg: number; home: string; away: string; venue: string; date: string; start: string; end: string }[]
  }[]
}

/**
 * Programa una ronda con las canchas y horarios del torneo: la ida en una
 * semana y la vuelta en la siguiente. Empieza la semana después de la última
 * jornada (o esta semana, si eso ya pasó).
 */
export async function buildRoundPayload(
  supabase: Supabase,
  tournamentId: string,
  stage: Stage,
  ties: TiePlan[],
  legs: number
): Promise<RoundPayload | { error: string }> {
  const [{ data: venues }, { data: closures }, { data: lastMd }] = await Promise.all([
    supabase.from('venues').select('id, venue_slots(day_of_week, start_time, end_time)').eq('tournament_id', tournamentId),
    supabase.from('venue_closures').select('venue_id, closed_on').eq('tournament_id', tournamentId),
    supabase
      .from('matchdays')
      .select('week_start')
      .eq('tournament_id', tournamentId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const slotTemplates: SlotTemplate[] = (venues ?? []).flatMap((v) =>
    ((v.venue_slots ?? []) as { day_of_week: number; start_time: string; end_time: string }[]).map((s) => ({
      venueId: v.id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time,
    }))
  )
  if (slotTemplates.length === 0) return { error: 'Configura al menos un horario de cancha.' }

  const thisWeek = mondayOf(todayInMexico())
  const afterLast = lastMd ? addDays(mondayOf(lastMd.week_start), 7) : thisWeek
  const startDate = afterLast < thisWeek ? thisWeek : afterLast

  const withIds = ties.map((t) => ({ ...t, id: crypto.randomUUID() }))
  const rounds = Array.from({ length: legs }, (_, i) =>
    withIds.map((t) => homeAway(t, i + 1, legs)).map((p) => ({ home: p.home, away: p.away }))
  )

  const result = scheduleFixtures({
    rounds,
    slotTemplates,
    priorities: new Map(),
    startDate,
    closedDays: new Set((closures ?? []).map((c) => `${c.venue_id}|${c.closed_on}`)),
  })
  if (!result.ok) {
    return {
      error:
        result.reason === 'insufficient_slots'
          ? `No alcanzan los horarios de una semana para los ${result.needed} partidos de esta ronda (hay ${result.available}). Agrega horarios de cancha.`
          : 'No se pudo programar la ronda.',
    }
  }

  return {
    stage,
    ties: withIds.map((t) => ({
      id: t.id,
      position: t.position,
      high: t.high.teamId,
      low: t.low.teamId,
      high_seed: t.high.seed,
      low_seed: t.low.seed,
      legs,
    })),
    matchdays: result.matchdays.map((md) => ({
      leg: legs === 2 ? md.number : null,
      week_start: md.weekStart,
      matches: result.matches
        .filter((m) => m.round === md.number)
        .map((m) => {
          const tie = withIds.find(
            (t) => (t.high.teamId === m.homeTeamId && t.low.teamId === m.awayTeamId) || (t.low.teamId === m.homeTeamId && t.high.teamId === m.awayTeamId)
          )!
          return {
            tie: tie.id,
            leg: md.number,
            home: m.homeTeamId,
            away: m.awayTeamId,
            venue: m.venueId,
            date: m.date,
            start: m.startTime,
            end: m.endTime,
          }
        }),
    })),
  }
}
