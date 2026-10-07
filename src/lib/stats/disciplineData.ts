import type { createClient } from '@/lib/supabase/server'
import { computeDiscipline, type SuspensionReason } from './suspensions'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type DisciplineRow = {
  playerId: string
  playerName: string
  jersey: number | null
  teamId: string
  status: 'suspended' | 'limit' | 'warned'
  reason: SuspensionReason | null
  /** Partidos que le faltan por cumplir */
  remaining: number
  /** Próximo partido en el que no puede jugar */
  next: { matchday: number | null; date: string | null; opponent: string } | null
  yellows: number
}

export type DisciplineReport = {
  threshold: number | null
  teams: { id: string; name: string; rows: DisciplineRow[] }[]
}

/**
 * Situación disciplinaria del torneo (o de un solo equipo): quién está
 * suspendido para los próximos partidos y quién está cerca del límite de amarillas.
 */
export async function loadDiscipline(supabase: Supabase, tournamentId: string, onlyTeamId?: string): Promise<DisciplineReport> {
  const [{ data: tournament }, { data: teams }, { data: players }, { data: matches }, { data: matchdays }] = await Promise.all([
    supabase.from('tournaments').select('yellow_card_suspension_threshold, red_card_suspension_matches').eq('id', tournamentId).single(),
    supabase.from('teams').select('id, name').eq('tournament_id', tournamentId).order('name'),
    supabase.from('players').select('id, full_name, jersey_number, team_id').eq('tournament_id', tournamentId),
    supabase
      .from('matches')
      .select('id, home_team_id, away_team_id, match_date, start_time, status, walkover, matchday_id')
      .eq('tournament_id', tournamentId)
      .neq('status', 'pending'),
    supabase.from('matchdays').select('id, number').eq('tournament_id', tournamentId),
  ])

  const matchList = matches ?? []
  const { data: events } = matchList.length
    ? await supabase.from('match_events').select('match_id, player_id, type').in('match_id', matchList.map((m) => m.id))
    : { data: [] }

  const rosterByTeam = new Map<string, string[]>()
  ;(players ?? []).forEach((p) => {
    if (onlyTeamId && p.team_id !== onlyTeamId) return
    if (!rosterByTeam.has(p.team_id)) rosterByTeam.set(p.team_id, [])
    rosterByTeam.get(p.team_id)!.push(p.id)
  })

  const threshold = tournament?.yellow_card_suspension_threshold ?? null
  const discipline = computeDiscipline({
    matches: matchList.map((m) => ({
      id: m.id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      matchDate: m.match_date!,
      startTime: m.start_time!,
      status: m.status,
      walkover: m.walkover,
    })),
    events: (events ?? []).map((e) => ({ matchId: e.match_id, playerId: e.player_id, type: e.type })),
    rosterByTeam,
    yellowThreshold: threshold,
    redSuspensionMatches: tournament?.red_card_suspension_matches ?? 1,
  })

  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const player = new Map((players ?? []).map((p) => [p.id, p]))
  const matchById = new Map(matchList.map((m) => [m.id, m]))
  const mdNumber = new Map((matchdays ?? []).map((md) => [md.id, md.number]))

  const rows: DisciplineRow[] = []
  for (const d of discipline) {
    const remaining = d.upcoming.length + d.unassigned.length
    const atLimit = !!threshold && threshold > 1 && d.yellows === threshold - 1
    if (remaining === 0 && !atLimit && d.yellows === 0) continue

    const nextMatch = d.upcoming[0] ? matchById.get(d.upcoming[0].matchId) : null
    const p = player.get(d.playerId)
    rows.push({
      playerId: d.playerId,
      playerName: p?.full_name ?? 'Jugador',
      jersey: p?.jersey_number ?? null,
      teamId: d.teamId,
      status: remaining > 0 ? 'suspended' : atLimit ? 'limit' : 'warned',
      reason: d.upcoming[0]?.reason ?? d.unassigned[0] ?? null,
      remaining,
      next: nextMatch
        ? {
            matchday: nextMatch.matchday_id ? (mdNumber.get(nextMatch.matchday_id) ?? null) : null,
            date: nextMatch.match_date,
            opponent: teamName.get(nextMatch.home_team_id === d.teamId ? nextMatch.away_team_id : nextMatch.home_team_id) ?? '—',
          }
        : null,
      yellows: d.yellows,
    })
  }

  const order = { suspended: 0, limit: 1, warned: 2 }
  rows.sort((a, b) => order[a.status] - order[b.status] || b.yellows - a.yellows || a.playerName.localeCompare(b.playerName, 'es'))

  return {
    threshold,
    teams: (teams ?? [])
      .filter((t) => !onlyTeamId || t.id === onlyTeamId)
      .map((t) => ({ id: t.id, name: t.name, rows: rows.filter((r) => r.teamId === t.id) })),
  }
}
