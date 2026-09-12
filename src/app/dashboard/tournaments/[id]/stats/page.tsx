import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { computeStandings } from '@/lib/stats/standings'

type EventRow = {
  type: 'goal' | 'yellow_card' | 'red_card'
  player: { id: string; full_name: string } | null
  team: { name: string } | null
}

export default async function StatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, logo_url')
    .eq('tournament_id', id)

  const { data: matches } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id, score_home, score_away')
    .eq('tournament_id', id)
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
    .eq('match.tournament_id', id)) as { data: EventRow[] | null }

  const scorerCounts = new Map<string, { name: string; team: string; goals: number }>()
  const cardCounts = new Map<string, { name: string; team: string; yellows: number; reds: number }>()

  events?.forEach((e) => {
    if (!e.player) return
    const key = e.player.id

    if (e.type === 'goal') {
      const entry = scorerCounts.get(key) ?? { name: e.player.full_name, team: e.team?.name ?? '', goals: 0 }
      entry.goals++
      scorerCounts.set(key, entry)
    } else {
      const entry = cardCounts.get(key) ?? { name: e.player.full_name, team: e.team?.name ?? '', yellows: 0, reds: 0 }
      if (e.type === 'yellow_card') entry.yellows++
      if (e.type === 'red_card') entry.reds++
      cardCounts.set(key, entry)
    }
  })

  const topScorers = Array.from(scorerCounts.values())
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10)

  const topCards = Array.from(cardCounts.values())
    .sort((a, b) => b.reds - a.reds || b.yellows - a.yellows)
    .slice(0, 10)

  const bestDefense = standings.filter((s) => s.played > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0]

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href={`/dashboard/tournaments/${id}`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al torneo
        </Link>

        <h1 className="text-2xl font-black text-white mt-4 mb-1">Estadísticas</h1>
        <p className="text-gray-500 text-sm mb-8">{tournament.name}</p>

        {/* Tabla de posiciones */}
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
                  <th className="text-center py-2.5 px-1.5 font-medium">GF</th>
                  <th className="text-center py-2.5 px-1.5 font-medium">GC</th>
                  <th className="text-center py-2.5 px-1.5 font-medium">DIF</th>
                  <th className="text-center py-2.5 pr-4 pl-1.5 font-medium">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.teamId} className="border-b border-gray-800/60 last:border-0">
                    <td className="py-2.5 pl-4 pr-2 text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-2 text-white font-medium truncate max-w-[140px]">{s.teamName}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.played}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.won}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.drawn}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.lost}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.goalsFor}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.goalsAgainst}</td>
                    <td className="py-2.5 px-1.5 text-center text-gray-300">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
                    <td className="py-2.5 pr-4 pl-1.5 text-center text-green-400 font-bold">{s.points}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-gray-600 text-sm py-8">
                      Aún no hay partidos jugados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Goleadores */}
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

          {/* Tarjetas */}
          <section>
            <h2 className="text-white font-bold mb-3">🟨🟥 Tarjetas</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-2">
              {topCards.length > 0 ? (
                <div className="flex flex-col">
                  {topCards.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-2 border-b border-gray-800/60 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{c.name}</p>
                        <p className="text-gray-500 text-xs truncate">{c.team}</p>
                      </div>
                      {c.yellows > 0 && (
                        <span className="bg-yellow-950 text-yellow-500 text-xs px-2 py-0.5 rounded-full">{c.yellows}🟨</span>
                      )}
                      {c.reds > 0 && (
                        <span className="bg-red-950 text-red-400 text-xs px-2 py-0.5 rounded-full">{c.reds}🟥</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm p-4 text-center">Sin tarjetas registradas aún.</p>
              )}
            </div>
          </section>
        </div>

        {/* Mejor defensa */}
        {bestDefense && (
          <section className="mt-8">
            <h2 className="text-white font-bold mb-3">🛡️ Mejor defensa</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
              <span className="text-white font-medium">{bestDefense.teamName}</span>
              <span className="text-gray-400 text-sm">{bestDefense.goalsAgainst} goles recibidos</span>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
