import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeStandings } from '@/lib/stats/standings'

type EventRow = {
  type: 'goal' | 'yellow_card' | 'red_card'
  player: { id: string; full_name: string } | null
  team: { name: string } | null
}

export default async function DelegateStatsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myTeam } = await supabase
    .from('teams')
    .select('id, tournament_id, tournament:tournaments(name)')
    .eq('delegate_id', user.id)
    .single()

  if (!myTeam) redirect('/delegado')

  const tournamentInfo = Array.isArray(myTeam.tournament) ? myTeam.tournament[0] : myTeam.tournament

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, logo_url')
    .eq('tournament_id', myTeam.tournament_id)

  const { data: matches } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id, score_home, score_away')
    .eq('tournament_id', myTeam.tournament_id)
    .eq('status', 'played')

  const standings = computeStandings(
    teams ?? [],
    (matches ?? [])
      .filter((m) => m.score_home !== null && m.score_away !== null)
      .map((m) => ({
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        scoreHome: m.score_home as number,
        scoreAway: m.score_away as number,
      }))
  )

  const { data: events } = (await supabase
    .from('match_events')
    .select('type, player:players(id, full_name), team:teams(name), match:matches!inner(tournament_id)')
    .eq('match.tournament_id', myTeam.tournament_id)) as { data: EventRow[] | null }

  const scorerCounts = new Map<string, { name: string; team: string; goals: number }>()
  events?.forEach((e) => {
    if (!e.player || e.type !== 'goal') return
    const entry = scorerCounts.get(e.player.id) ?? { name: e.player.full_name, team: e.team?.name ?? '', goals: 0 }
    entry.goals++
    scorerCounts.set(e.player.id, entry)
  })

  const topScorers = Array.from(scorerCounts.values()).sort((a, b) => b.goals - a.goals).slice(0, 10)

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/delegado" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver a mi equipo
        </Link>

        <h1 className="text-2xl font-black text-white mt-4 mb-1">Estadísticas</h1>
        <p className="text-gray-500 text-sm mb-8">{tournamentInfo?.name}</p>

        <section className="mb-10">
          <h2 className="text-white font-bold mb-3">Tabla de posiciones</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left py-2.5 pl-4 pr-2 font-medium">#</th>
                  <th className="text-left py-2.5 px-2 font-medium">Equipo</th>
                  <th className="text-center py-2.5 px-1.5 font-medium">PJ</th>
                  <th className="text-center py-2.5 px-1.5 font-medium">G</th>
                  <th className="text-center py-2.5 px-1.5 font-medium">E</th>
                  <th className="text-center py-2.5 px-1.5 font-medium">P</th>
                  <th className="text-center py-2.5 px-1.5 font-medium">DIF</th>
                  <th className="text-center py-2.5 pr-4 pl-1.5 font-medium">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr
                    key={s.teamId}
                    className={`border-b border-gray-800/60 last:border-0 ${s.teamId === myTeam.id ? 'bg-green-950/30' : ''}`}
                  >
                    <td className="py-2.5 pl-4 pr-2 text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-2 text-white font-medium truncate max-w-[140px]">{s.teamName}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.played}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.won}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.drawn}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.lost}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
                    <td className="py-2.5 pr-4 pl-1.5 text-center text-green-400 font-bold">{s.points}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-600 text-sm py-8">
                      Aún no hay partidos jugados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-white font-bold mb-3">⚽ Goleadores</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-2">
            {topScorers.length > 0 ? (
              <div className="flex flex-col">
                {topScorers.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-2 border-b border-gray-800/60 last:border-0">
                    <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{s.name}</p>
                      <p className="text-gray-500 text-xs truncate">{s.team}</p>
                    </div>
                    <span className="text-green-400 font-bold text-sm">{s.goals}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm p-4 text-center">Sin goles registrados aún.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
