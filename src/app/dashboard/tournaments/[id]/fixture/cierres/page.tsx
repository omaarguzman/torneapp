import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CloseVenueForm from './CloseVenueForm'
import { reopenVenueDay } from '@/app/actions/fixtureEdits'

export default async function VenueClosuresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tournament }, { data: venues }, { data: closures }] = await Promise.all([
    supabase.from('tournaments').select('name').eq('id', id).single(),
    supabase.from('venues').select('id, name').eq('tournament_id', id).order('name'),
    supabase
      .from('venue_closures')
      .select('id, venue_id, closed_on, reason')
      .eq('tournament_id', id)
      .order('closed_on', { ascending: false }),
  ])

  if (!tournament) notFound()

  const venueName = new Map((venues ?? []).map((v) => [v.id, v.name]))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href={`/dashboard/tournaments/${id}/fixture`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al fixture
        </Link>
        <h1 className="text-2xl font-black text-white mt-4">Canchas cerradas</h1>
        <p className="text-gray-500 text-sm mb-6">{tournament.name}</p>

        <section className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
          <h2 className="text-white font-bold mb-1">Cerrar una cancha un día</h2>
          <p className="text-gray-500 text-xs mb-4">
            Sus partidos programados ese día pasan a Pendientes (con opción de deshacer). Mientras siga cerrada, no se
            podrá programar nada ahí ese día, ni siquiera al generar o actualizar el fixture.
          </p>
          <CloseVenueForm tournamentId={id} venues={venues ?? []} />
        </section>

        <h2 className="text-white font-bold mb-3">Días cerrados</h2>
        {(closures ?? []).length === 0 ? (
          <p className="text-gray-500 text-sm">No hay canchas cerradas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(closures ?? []).map((c) => (
              <li
                key={c.id}
                className={`bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${
                  c.closed_on < today ? 'opacity-60' : ''
                }`}
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {venueName.get(c.venue_id) ?? 'Cancha'} ·{' '}
                    <span className="capitalize">
                      {new Date(c.closed_on + 'T00:00:00').toLocaleDateString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  </p>
                  {c.reason && <p className="text-gray-500 text-xs">{c.reason}</p>}
                </div>
                <form action={reopenVenueDay}>
                  <input type="hidden" name="tournament_id" value={id} />
                  <input type="hidden" name="closure_id" value={c.id} />
                  <button type="submit" className="text-green-400 hover:text-green-300 text-xs font-semibold whitespace-nowrap">
                    Reabrir
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="text-gray-600 text-xs mt-3">
          Reabrir una cancha no regresa sus partidos: siguen en Pendientes, donde puedes deshacer el aplazamiento o
          programarlos.
        </p>
      </div>
    </main>
  )
}
