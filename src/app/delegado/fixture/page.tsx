import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeSuspensions, type SuspensionReason } from '@/lib/stats/suspensions'

const suspensionLabels: Record<SuspensionReason, string> = {
  yellow_accumulation: 'acumulación de amarillas',
  red_card: 'roja directa',
  double_yellow: 'doble amarilla',
}

type MatchRow = {
  id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  start_time: string
  status: string
  score_home: number | null
  score_away: number | null
  home_team: { name: string } | null
  away_team: { name: string } | null
  venue: { name: string } | null
}

type MatchdayRow = {
  id: string
  number: number
  matches: MatchRow[]
}

export default async function DelegateFixturePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myTeam } = await supabase
    .from('teams')
    .select('id, tournament_id')
    .eq('delegate_id', user.id)
    .single()

  if (!myTeam) redirect('/delegado')

  const { data: teams } = await supabase.from('teams').select('id, name').eq('tournament_id', myTeam.tournament_id)
  const teamNames: Record<string, string> = {}
  teams?.forEach((t) => { teamNames[t.id] = t.name })

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, team_id')
    .eq('tournament_id', myTeam.tournament_id)

  const playerNames = new Map<string, string>()
  const rosterByTeam = new Map<string, string[]>()
  players?.forEach((p) => {
    playerNames.set(p.id, p.full_name)
    if (!rosterByTeam.has(p.team_id)) rosterByTeam.set(p.team_id, [])
    rosterByTeam.get(p.team_id)!.push(p.id)
  })

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('yellow_card_suspension_threshold, red_card_suspension_matches')
    .eq('id', myTeam.tournament_id)
    .single()

  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, match_date, start_time, status')
    .eq('tournament_id', myTeam.tournament_id)

  const { data: allEvents } = await supabase
    .from('match_events')
    .select('match_id, player_id, type')
    .in('match_id', (allMatches ?? []).map((m) => m.id))

  const suspensions = computeSuspensions({
    matches: (allMatches ?? []).map((m) => ({
      id: m.id, homeTeamId: m.home_team_id, awayTeamId: m.away_team_id,
      matchDate: m.match_date, startTime: m.start_time, status: m.status,
    })),
    events: (allEvents ?? []).map((e) => ({ matchId: e.match_id, playerId: e.player_id, type: e.type })),
    rosterByTeam,
    yellowThreshold: tournament?.yellow_card_suspension_threshold ?? null,
    redSuspensionMatches: tournament?.red_card_suspension_matches ?? 1,
  })

  const suspensionsByMatch = new Map<string, typeof suspensions>()
  suspensions.forEach((s) => {
    if (!suspensionsByMatch.has(s.matchId)) suspensionsByMatch.set(s.matchId, [])
    suspensionsByMatch.get(s.matchId)!.push(s)
  })

  const { data: matchdays } = (await supabase
    .from('matchdays')
    .select(
      `id, number,
       matches (
         id, home_team_id, away_team_id, match_date, start_time, status, score_home, score_away,
         home_team:teams!matches_home_team_id_fkey(name),
         away_team:teams!matches_away_team_id_fkey(name),
         venue:venues(name)
       )`
    )
    .eq('tournament_id', myTeam.tournament_id)
    .order('number')) as { data: MatchdayRow[] | null }

  matchdays?.forEach((md) => {
    md.matches.sort((a, b) => (a.match_date + a.start_time).localeCompare(b.match_date + b.start_time))
  })

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/delegado" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver a mi equipo
        </Link>

        <h1 className="text-2xl font-black text-white mt-4 mb-8">Calendario del torneo</h1>

        {matchdays && matchdays.length > 0 ? (
          <div className="flex flex-col gap-6">
            {matchdays.map((md) => (
              <div key={md.id}>
                <h2 className="text-white font-bold mb-3">Jornada {md.number}</h2>
                <div className="flex flex-col gap-2">
                  {md.matches.map((m) => {
                    const dateLabel = new Date(m.match_date + 'T00:00:00').toLocaleDateString('es-MX', {
                      weekday: 'long', day: 'numeric', month: 'short',
                    })
                    const played = m.status === 'played'
                    const isMyMatch = m.home_team_id === myTeam.id || m.away_team_id === myTeam.id
                    const matchSuspensions = suspensionsByMatch.get(m.id) ?? []
                    return (
                      <div
                        key={m.id}
                        className={`bg-gray-900 border rounded-lg p-4 ${isMyMatch ? 'border-green-800' : 'border-gray-800'}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-white text-sm font-medium truncate">{m.home_team?.name ?? '—'}</span>
                            {played ? (
                              <span className="text-white text-sm font-bold bg-gray-800 px-2 py-0.5 rounded">
                                {m.score_home} – {m.score_away}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs">vs</span>
                            )}
                            <span className="text-white text-sm font-medium truncate">{m.away_team?.name ?? '—'}</span>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <p className="capitalize">{dateLabel} · {m.start_time.slice(0, 5)}</p>
                            <p>{m.venue?.name}</p>
                          </div>
                        </div>
                        {matchSuspensions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-1.5">
                            {matchSuspensions.map((s, i) => (
                              <span key={i} className="bg-red-950 text-red-400 text-[11px] px-2 py-1 rounded-full">
                                🚫 {playerNames.get(s.playerId) ?? 'Jugador'} ({teamNames[s.teamId]}) — {suspensionLabels[s.reason]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-800 rounded-lg p-10 text-center">
            <p className="text-gray-500">El administrador aún no ha generado el fixture.</p>
          </div>
        )}
      </div>
    </main>
  )
}
