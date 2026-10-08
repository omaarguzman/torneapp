import type { createClient } from '@/lib/supabase/server'
import { computeStandings, type TeamStat } from './standings'

type Supabase = Awaited<ReturnType<typeof createClient>>

type EventRow = {
  type: 'goal' | 'yellow_card' | 'red_card'
  player: { id: string; full_name: string } | null
  team: { name: string } | null
}

export type TournamentStats = {
  standings: TeamStat[]
  scorers: { name: string; team: string; goals: number }[]
  cards: { name: string; team: string; yellows: number; reds: number }[]
  bestDefense: TeamStat | null
  playedCount: number
}

/** Tabla, goleadores, tarjetas y mejor defensa de un torneo (con los permisos de quien consulta). */
export async function loadTournamentStats(supabase: Supabase, tournamentId: string): Promise<TournamentStats> {
  const [{ data: teams }, { data: matches }, { data: rule }, { data: events }] = await Promise.all([
    supabase.from('teams').select('id, name, logo_url').eq('tournament_id', tournamentId),
    supabase
      .from('matches')
      .select('home_team_id, away_team_id, score_home, score_away, walkover')
      .eq('tournament_id', tournamentId)
      .eq('status', 'played'),
    supabase.from('tournaments').select('double_walkover_rule').eq('id', tournamentId).single(),
    supabase
      .from('match_events')
      .select('type, player:players(id, full_name), team:teams(name), match:matches!inner(tournament_id)')
      .eq('match.tournament_id', tournamentId) as unknown as Promise<{ data: EventRow[] | null }>,
  ])

  const played = (matches ?? []).filter((m) => m.score_home !== null && m.score_away !== null)
  const standings = computeStandings(
    teams ?? [],
    played.map((m) => ({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      scoreHome: m.score_home as number,
      scoreAway: m.score_away as number,
      walkover: m.walkover,
    })),
    rule?.double_walkover_rule === 'draw' ? 'draw' : 'both_lose'
  )

  const scorers = new Map<string, { name: string; team: string; goals: number }>()
  const cards = new Map<string, { name: string; team: string; yellows: number; reds: number }>()
  ;(events ?? []).forEach((e) => {
    if (!e.player) return
    if (e.type === 'goal') {
      const s = scorers.get(e.player.id) ?? { name: e.player.full_name, team: e.team?.name ?? '', goals: 0 }
      s.goals++
      scorers.set(e.player.id, s)
    } else {
      const c = cards.get(e.player.id) ?? { name: e.player.full_name, team: e.team?.name ?? '', yellows: 0, reds: 0 }
      if (e.type === 'yellow_card') c.yellows++
      else c.reds++
      cards.set(e.player.id, c)
    }
  })

  return {
    standings,
    scorers: [...scorers.values()].sort((a, b) => b.goals - a.goals).slice(0, 10),
    cards: [...cards.values()].sort((a, b) => b.reds - a.reds || b.yellows - a.yellows).slice(0, 10),
    bestDefense: standings.filter((s) => s.played > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0] ?? null,
    playedCount: played.length,
  }
}
