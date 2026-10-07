import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { previewFixtureUpdate } from '@/lib/fixtures/fixtureUpdate'
import ApplyUpdateForm from './ApplyUpdateForm'

export default async function UpdateFixturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase.from('tournaments').select('name').eq('id', id).single()
  if (!tournament) notFound()

  const preview = await previewFixtureUpdate(supabase, id)

  const header = (
    <>
      <Link href={`/dashboard/tournaments/${id}/fixture`} className="text-gray-500 text-sm hover:text-gray-300">
        ← Volver al fixture
      </Link>
      <h1 className="text-2xl font-black text-white mt-4">Actualizar fixture</h1>
      <p className="text-gray-500 text-sm mb-6">{tournament.name}</p>
    </>
  )

  if ('error' in preview) {
    return (
      <main className="min-h-screen bg-gray-950 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {header}
          <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{preview.error}</p>
        </div>
      </main>
    )
  }

  const { plan, teamNames, venueNames } = preview
  const first = plan.firstNumber
  const newTotal = first - 1 + plan.matchdays.length
  const name = (teamId: string) => teamNames[teamId] ?? '—'

  const summaryLines = [
    first > 1 ? `Se conservan J1–J${first - 1} tal como están.` : null,
    `Jornadas: ${preview.oldMatchdayCount} → ${newTotal}.`,
    `${plan.matches.length} partidos programados desde J${first}.`,
    plan.pending.length > 0 ? `${plan.pending.length} cruces nuevos van a Pendientes.` : null,
  ].filter(Boolean) as string[]

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {header}

        <p className="text-gray-400 text-sm mb-4">
          Esta es una <strong className="text-white">propuesta</strong>: todavía no se ha guardado nada. Conserva todo lo
          jugado y vuelve a planear desde la J{first} con los {Object.keys(teamNames).length} equipos actuales.
        </p>

        {preview.warnings.map((w, i) => (
          <p key={i} className="mb-4 text-yellow-400 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
            ⚠️ {w}
          </p>
        ))}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
          {[
            ['Jornadas', `${preview.oldMatchdayCount} → ${newTotal}`],
            ['Se conservan', first > 1 ? `J1–J${first - 1}` : 'Ninguna'],
            ['Partidos jugados', String(preview.playedCount)],
            ['Quedan igual', String(preview.unchangedCount)],
            ['Cambian de fecha', String(preview.movedCount)],
            ['Partidos nuevos', String(preview.newCount)],
            ['Nuevos a Pendientes', String(plan.pending.length)],
            ['Pendientes actuales', String(preview.keptPendingCount)],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <p className="text-gray-500 text-[11px] uppercase tracking-wide">{label}</p>
              <p className="text-white font-bold">{value}</p>
            </div>
          ))}
        </div>

        <ul className="text-gray-500 text-xs mb-6 flex flex-col gap-1 list-disc pl-4">
          <li>Los partidos que ya existían conservan su link de árbitro, aunque cambien de fecha.</li>
          <li>Los partidos nuevos tendrán un link de árbitro nuevo.</li>
          {preview.removedCount > 0 && (
            <li>
              {preview.removedCount} partido(s) programado(s) ya no hacen falta y se eliminan (sus links de árbitro dejan de
              funcionar).
            </li>
          )}
          {preview.keptPendingCount > 0 && (
            <li>Los partidos que ya estaban en Pendientes se quedan ahí; prográmalos manualmente como siempre.</li>
          )}
        </ul>

        <div className="mb-8">
          <ApplyUpdateForm
            tournamentId={id}
            planJson={JSON.stringify(plan)}
            summary={summaryLines.join('\n')}
          />
        </div>

        {plan.pending.length > 0 && (
          <section className="mb-6">
            <h2 className="text-white font-bold mb-1">Van a Pendientes ({plan.pending.length})</h2>
            <p className="text-gray-500 text-xs mb-3">
              Cruces que no caben en las jornadas sin que algún equipo juegue dos veces la misma semana. Los programas
              después desde la pestaña Pendientes (por ejemplo, entre semana).
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.pending.map((p, i) => (
                <span key={i} className="bg-yellow-950 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  {name(p.home_team_id)} vs {name(p.away_team_id)}
                </span>
              ))}
            </div>
          </section>
        )}

        <h2 className="text-white font-bold mb-3">Jornadas propuestas</h2>
        <div className="flex flex-col gap-2">
          {plan.matchdays.map((md) => {
            const matches = plan.matches
              .filter((m) => m.matchday_number === md.number)
              .sort((a, b) => (a.match_date + a.start_time).localeCompare(b.match_date + b.start_time))
            const playing = new Set(matches.flatMap((m) => [m.home_team_id, m.away_team_id]))
            const resting = Object.keys(teamNames).filter((t) => !playing.has(t))
            return (
              <details key={md.number} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <summary className="cursor-pointer text-white text-sm font-semibold">
                  Jornada {md.number}{' '}
                  <span className="text-gray-500 font-normal">
                    · semana del{' '}
                    {new Date(md.week_start + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} ·{' '}
                    {matches.length} partidos
                  </span>
                </summary>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {matches.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 flex-wrap text-sm">
                      <span className="text-white">
                        {name(m.home_team_id)} <span className="text-gray-600 text-xs">vs</span> {name(m.away_team_id)}
                        {!m.reuse_id && (
                          <span className="ml-2 bg-green-950 text-green-400 text-[10px] px-1.5 py-0.5 rounded-full">nuevo</span>
                        )}
                      </span>
                      <span className="text-gray-500 text-xs capitalize">
                        {new Date(m.match_date + 'T00:00:00').toLocaleDateString('es-MX', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        · {m.start_time.slice(0, 5)} · {venueNames[m.venue_id]}
                      </span>
                    </li>
                  ))}
                </ul>
                {resting.length > 0 && (
                  <p className="mt-3 text-gray-500 text-xs">
                    Sin partido esta jornada: <span className="text-gray-300">{resting.map(name).join(', ')}</span>
                  </p>
                )}
              </details>
            )
          })}
        </div>
      </div>
    </main>
  )
}
