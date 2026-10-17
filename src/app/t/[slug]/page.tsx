/* eslint-disable @next/next/no-img-element -- logos subidos por los usuarios */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeStandings, type Walkover } from '@/lib/stats/standings'
import { LogoMark } from '@/components/Logo'

type PublicData = {
  name: string
  logo_url: string | null
  double_walkover_rule: string | null
  teams: { id: string; name: string; logo_url: string | null }[]
  matches: { home_team_id: string; away_team_id: string; score_home: number; score_away: number; walkover: Walkover | null }[]
  last_played: string | null
}

async function load(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_public_standings', { p_slug: slug })
  return data as PublicData | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug)
  if (!data) return { title: 'Torneo no encontrado' }
  return {
    title: `${data.name} · Tabla de posiciones`,
    description: `Tabla de posiciones de ${data.name}, actualizada con cada partido.`,
  }
}

const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

/** Página pública del torneo: solo la tabla de posiciones (fase regular). */
export default async function PublicStandingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug)
  if (!data) notFound()

  const standings = computeStandings(
    data.teams,
    data.matches.map((m) => ({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      scoreHome: m.score_home,
      scoreAway: m.score_away,
      walkover: m.walkover,
    })),
    data.double_walkover_rule === 'draw' ? 'draw' : 'both_lose'
  )

  return (
    <main className="flex-1 bg-gray-950 text-gray-300">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(245,200,76,0.12),transparent_65%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <header className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {data.logo_url ? <img src={data.logo_url} alt="" className="w-full h-full object-contain" /> : <span className="text-3xl">🏆</span>}
            </div>
            <div className="min-w-0">
              <p className="font-condensed text-sm uppercase tracking-widest text-amber-300">Tabla de posiciones</p>
              <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-wide text-white leading-tight">{data.name}</h1>
              <p className="text-xs text-gray-500 mt-1">
                {data.matches.length} partido{data.matches.length === 1 ? '' : 's'} jugado{data.matches.length === 1 ? '' : 's'}
                {data.last_played && ` · último el ${dateLabel(data.last_played)}`}
              </p>
            </div>
          </header>

          <div className="mt-6 overflow-x-auto bg-gray-900/70 border border-white/10 rounded-2xl">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3 text-left font-semibold w-8">#</th>
                  <th className="px-2 py-3 text-left font-semibold">Equipo</th>
                  <th className="px-2 py-3 font-semibold">PJ</th>
                  <th className="px-2 py-3 font-semibold hidden sm:table-cell">G</th>
                  <th className="px-2 py-3 font-semibold hidden sm:table-cell">E</th>
                  <th className="px-2 py-3 font-semibold hidden sm:table-cell">P</th>
                  <th className="px-2 py-3 font-semibold hidden sm:table-cell">GF</th>
                  <th className="px-2 py-3 font-semibold hidden sm:table-cell">GC</th>
                  <th className="px-2 py-3 font-semibold">DIF</th>
                  <th className="px-3 py-3 font-semibold">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.teamId} className={`border-t border-white/5 ${i === 0 ? 'bg-amber-400/10' : ''}`}>
                    <td className={`px-3 py-2.5 font-display text-base ${i === 0 ? 'text-amber-300' : 'text-gray-500'}`}>{i + 1}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {s.logoUrl ? (
                            <img src={s.logoUrl} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400">{s.teamName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-semibold text-white truncate">{s.teamName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">{s.played}</td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">{s.won}</td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">{s.drawn}</td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">{s.lost}</td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">{s.goalsFor}</td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">{s.goalsAgainst}</td>
                    <td className="px-2 py-2.5 text-center">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
                    <td className="px-3 py-2.5 text-center font-display text-base text-white">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Se actualiza sola con cada cédula capturada. Desempate: diferencia de goles, goles a favor y enfrentamiento directo.
          </p>

          <footer className="mt-12 border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoMark size={32} />
              <p className="text-sm text-gray-400">
                Este torneo se organiza con <span className="text-white font-semibold">Torneapp</span>.
              </p>
            </div>
            <Link href="/" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
              Organiza tu torneo gratis →
            </Link>
          </footer>
        </div>
      </div>
    </main>
  )
}
