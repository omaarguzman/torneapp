import { createHash } from 'crypto'
import type { createClient } from '@/lib/supabase/server'
import type { SlotTemplate } from './scheduler'
import { buildUpdatePlan, missingPairs } from './updatePlan'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type FixtureUpdatePlan = {
  firstNumber: number
  fingerprint: string
  matchdays: { number: number; week_start: string }[]
  matches: {
    reuse_id: string | null
    matchday_number: number
    home_team_id: string
    away_team_id: string
    venue_id: string
    match_date: string
    start_time: string
    end_time: string
  }[]
  pending: { reuse_id: string | null; home_team_id: string; away_team_id: string }[]
}

export type FixtureUpdatePreview = {
  plan: FixtureUpdatePlan
  teamNames: Record<string, string>
  venueNames: Record<string, string>
  playedCount: number
  oldMatchdayCount: number
  keptPendingCount: number
  unchangedCount: number
  movedCount: number
  newCount: number
  removedCount: number
  warnings: string[]
}

type MatchRow = {
  id: string
  home_team_id: string
  away_team_id: string
  status: string
  matchday_id: string | null
  match_date: string | null
  start_time: string | null
  venue_id: string | null
}

type SlotRow = { venue_id: string; day_of_week: number; start_time: string; end_time: string }

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Huella del estado actual: si cambia algo entre la vista previa y "Aplicar", la propuesta ya no es válida. */
function fingerprintOf(matches: MatchRow[], teamIds: string[]) {
  const rows = matches
    .map((m) => [m.id, m.status, m.matchday_id, m.home_team_id, m.away_team_id, m.match_date, m.start_time, m.venue_id].join(':'))
    .sort()
  return createHash('sha256')
    .update([...rows, ...[...teamIds].sort()].join('\n'))
    .digest('hex')
}

async function loadState(supabase: Supabase, tournamentId: string) {
  const [{ data: tournament }, { data: teams }, { data: venues }, { data: matchdays }, { data: matches }, { data: closures }] =
    await Promise.all([
      supabase.from('tournaments').select('start_date, double_round').eq('id', tournamentId).single(),
      supabase
        .from('teams')
        .select('id, name, has_scheduling_priority, preferred_slot:venue_slots(venue_id, day_of_week, start_time, end_time)')
        .eq('tournament_id', tournamentId),
      supabase.from('venues').select('id, name, venue_slots(day_of_week, start_time, end_time)').eq('tournament_id', tournamentId),
      supabase.from('matchdays').select('id, number, week_start').eq('tournament_id', tournamentId).order('number'),
      supabase
        .from('matches')
        .select('id, home_team_id, away_team_id, status, matchday_id, match_date, start_time, venue_id')
        .eq('tournament_id', tournamentId),
      supabase.from('venue_closures').select('venue_id, closed_on').eq('tournament_id', tournamentId),
    ])
  return {
    tournament,
    teams: teams ?? [],
    venues: venues ?? [],
    matchdays: matchdays ?? [],
    matches: (matches ?? []) as MatchRow[],
    closedDays: new Set((closures ?? []).map((c) => `${c.venue_id}|${c.closed_on}`)),
  }
}

/** Calcula la huella actual del torneo (se usa al aplicar para validar la propuesta). */
export async function currentFingerprint(supabase: Supabase, tournamentId: string) {
  const { teams, matches } = await loadState(supabase, tournamentId)
  return fingerprintOf(matches, teams.map((t) => t.id))
}

/**
 * Propone cómo quedaría el fixture conservando todo lo ya jugado y
 * re-planeando desde la primera jornada sin partidos jugados, con todos los
 * equipos actuales. No guarda nada.
 */
export async function previewFixtureUpdate(
  supabase: Supabase,
  tournamentId: string
): Promise<{ error: string } | FixtureUpdatePreview> {
  const { tournament, teams, venues, matchdays, matches, closedDays } = await loadState(supabase, tournamentId)

  if (!tournament) return { error: 'No se encontró el torneo.' }
  if (matchdays.length === 0) return { error: 'Este torneo aún no tiene fixture. Genéralo primero.' }
  if (teams.length < 2) return { error: 'Necesitas al menos 2 equipos.' }

  const slotTemplates: SlotTemplate[] = venues.flatMap((v) =>
    ((v.venue_slots ?? []) as Omit<SlotRow, 'venue_id'>[]).map((s) => ({
      venueId: v.id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time,
    }))
  )
  if (slotTemplates.length === 0) {
    return { error: 'Necesitas al menos un horario de cancha configurado.' }
  }

  const priorities = new Map<string, SlotTemplate>()
  teams.forEach((t) => {
    const raw = t.preferred_slot as SlotRow | SlotRow[] | null
    const slot = Array.isArray(raw) ? raw[0] : raw
    if (t.has_scheduling_priority && slot) {
      priorities.set(t.id, { venueId: slot.venue_id, dayOfWeek: slot.day_of_week, startTime: slot.start_time, endTime: slot.end_time })
    }
  })

  // Se conserva todo hasta la última jornada con algún partido jugado
  const numberById = new Map(matchdays.map((md) => [md.id, md.number]))
  const playedNumbers = matches
    .filter((m) => m.status === 'played' && m.matchday_id)
    .map((m) => numberById.get(m.matchday_id!) ?? 0)
  const firstNumber = (playedNumbers.length > 0 ? Math.max(...playedNumbers) : 0) + 1

  const isFuture = (m: MatchRow) => m.matchday_id !== null && (numberById.get(m.matchday_id) ?? 0) >= firstNumber
  const kept = matches.filter((m) => !isFuture(m))
  const futureRows = matches.filter((m) => isFuture(m) && m.status === 'scheduled')

  const teamIds = teams.map((t) => t.id)
  const teamSet = new Set(teamIds)
  const covered = kept
    .filter((m) => teamSet.has(m.home_team_id) && teamSet.has(m.away_team_id))
    .map((m) => ({ home: m.home_team_id, away: m.away_team_id }))
  const pairs = missingPairs(teamIds, covered, tournament.double_round)

  const n = teamIds.length
  const totalRounds = (n % 2 === 0 ? n - 1 : n) * (tournament.double_round ? 2 : 1)
  const roundsCount = Math.max(totalRounds - (firstNumber - 1), pairs.length > 0 ? 1 : 0)

  const firstExisting = matchdays.find((md) => md.number === firstNumber)
  const lastMatchday = matchdays[matchdays.length - 1]
  const startDate = firstExisting?.week_start ?? addDays(lastMatchday.week_start, 7 * (firstNumber - lastMatchday.number))

  const homeCounts = new Map<string, number>()
  covered.forEach((m) => homeCounts.set(m.home, (homeCounts.get(m.home) ?? 0) + 1))

  const result = buildUpdatePlan({
    pairs,
    roundsCount,
    slotTemplates,
    priorities,
    startDate,
    homeCounts,
    closedDays,
  })

  // Reutilizar las filas de partidos futuros que ya existen conserva sus links de árbitro
  const pool = [...futureRows]
  const takeReuse = (home: string, away: string) => {
    let idx = pool.findIndex((r) => r.home_team_id === home && r.away_team_id === away)
    if (idx === -1) idx = pool.findIndex((r) => r.home_team_id === away && r.away_team_id === home)
    return idx === -1 ? null : pool.splice(idx, 1)[0]
  }

  let unchangedCount = 0
  let movedCount = 0
  let newCount = 0
  const offset = firstNumber - 1

  const plannedMatches = result.matches.map((m) => {
    const reused = takeReuse(m.homeTeamId, m.awayTeamId)
    if (!reused) newCount++
    else if (
      reused.match_date === m.date &&
      reused.start_time?.slice(0, 5) === m.startTime.slice(0, 5) &&
      reused.venue_id === m.venueId
    ) unchangedCount++
    else movedCount++

    return {
      reuse_id: reused?.id ?? null,
      matchday_number: m.round + offset,
      home_team_id: m.homeTeamId,
      away_team_id: m.awayTeamId,
      venue_id: m.venueId,
      match_date: m.date,
      start_time: m.startTime,
      end_time: m.endTime,
    }
  })

  const pending = result.leftovers.map((p) => ({
    reuse_id: takeReuse(p.home, p.away)?.id ?? null,
    home_team_id: p.home,
    away_team_id: p.away,
  }))

  const warnings: string[] = []
  const today = new Date().toISOString().slice(0, 10)
  if (firstExisting && addDays(firstExisting.week_start, 6) < today) {
    warnings.push(
      `La jornada ${firstNumber} ya pasó y no tiene cédulas capturadas. Si ya se jugó, captura sus cédulas antes de actualizar: de lo contrario sus partidos se volverán a programar.`
    )
  }

  return {
    plan: {
      firstNumber,
      fingerprint: fingerprintOf(matches, teamIds),
      matchdays: result.matchdays.map((md) => ({ number: md.number + offset, week_start: md.weekStart })),
      matches: plannedMatches,
      pending,
    },
    teamNames: Object.fromEntries(teams.map((t) => [t.id, t.name])),
    venueNames: Object.fromEntries(venues.map((v) => [v.id, v.name])),
    playedCount: matches.filter((m) => m.status === 'played').length,
    oldMatchdayCount: matchdays.length,
    keptPendingCount: matches.filter((m) => m.status === 'pending').length,
    unchangedCount,
    movedCount,
    newCount,
    removedCount: pool.length,
    warnings,
  }
}
