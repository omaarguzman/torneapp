import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import GenerateFixtureButton from './GenerateFixtureButton'

type MatchRow = {
  id: string
  match_date: string
  start_time: string
  end_time: string
  home_team: { name: string; logo_url: string | null } | null
  away_team: { name: string; logo_url: string | null } | null
  venue: { name: string } | null
}

type MatchdayRow = {
  id: string
  number: number
  week_start: string
  matches: MatchRow[]
}

export default async function FixturePage({
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
    .select('id, name')
    .eq('tournament_id', id)

  const teamNames: Record<string, string> = {}
  teams?.forEach((t) => {
    teamNames[t.id] = t.name
  })

  const { data: matchdays } = await supabase
    .from('matchdays')
    .select(
      `id, number, week_start,
       matches (
         id, match_date, start_time, end_time,
         home_team:teams!matches_home_team_id_fkey(name, logo_url),
         away_team:teams!matches_away_team_id_fkey(name, logo_url),
         venue:venues(name)
       )`
    )
    .eq('tournament_id', id)
    .order('number') as { data: MatchdayRow[] | null }

  matchdays?.forEach((md) => {
    md.matches.sort((a, b) => (a.match_date + a.start_time).localeCompare(b.match_date + b.start_time))
  })

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href={`/dashboard/tournaments/${id}`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al torneo
        </Link>

        <div className="flex items-center justify-between mt-4 mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Fixture</h1>
            <p className="text-gray-500 text-sm">{tournament.name}</p>
          </div>
          <GenerateFixtureButton
            tournamentId={id}
            teamNames={teamNames}
            hasExistingFixture={(matchdays?.length ?? 0) > 0}
          />
        </div>

        {matchdays && matchdays.length > 0 ? (
          <div className="flex flex-col gap-6">
            {matchdays.map((md) => (
              <div key={md.id}>
                <h2 className="text-white font-bold mb-3">Jornada {md.number}</h2>
                <div className="flex flex-col gap-2">
                  {md.matches.map((m) => {
                    const dateLabel = new Date(m.match_date + 'T00:00:00').toLocaleDateString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })
                    return (
                      <div
                        key={m.id}
                        className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between flex-wrap gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-white text-sm font-medium truncate">
                            {m.home_team?.name ?? '—'}
                          </span>
                          <span className="text-gray-600 text-xs">vs</span>
                          <span className="text-white text-sm font-medium truncate">
                            {m.away_team?.name ?? '—'}
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p className="capitalize">{dateLabel} · {m.start_time.slice(0, 5)}</p>
                          <p>{m.venue?.name}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-800 rounded-lg p-10 text-center">
            <p className="text-gray-500">Aún no se ha generado el fixture de este torneo.</p>
          </div>
        )}
      </div>
    </main>
  )
}
