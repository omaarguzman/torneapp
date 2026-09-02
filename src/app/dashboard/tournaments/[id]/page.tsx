import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createVenue, deleteVenue, addVenueSlot, deleteVenueSlot } from '@/app/actions/venues'

const sportLabels: Record<string, string> = {
  futbol_11: 'Fútbol 11',
  futbol_7: 'Fútbol 7',
  futbol_5: 'Fútbol 5',
  futbol_salon: 'Fútbol Salón',
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: venues } = await supabase
    .from('venues')
    .select('*, venue_slots(*)')
    .eq('tournament_id', id)
    .order('created_at')

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al panel
        </Link>

        <div className="mt-4 mb-8">
          <span className="text-xs uppercase tracking-wide text-green-400 font-semibold">
            {sportLabels[tournament.sport_type] || tournament.sport_type}
          </span>
          <h1 className="text-3xl font-black text-white mt-1">{tournament.name}</h1>
          {tournament.start_date && (
            <p className="text-gray-500 text-sm mt-1">
              {tournament.start_date} — {tournament.end_date || 'sin fecha de fin'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Equipos</p>
            <p className="text-2xl font-bold text-white mt-1">0</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Canchas</p>
            <p className="text-2xl font-bold text-white mt-1">{venues?.length ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Jornadas</p>
            <p className="text-2xl font-bold text-white mt-1">0</p>
          </div>
        </div>

        {/* SECCIÓN CANCHAS */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Canchas y horarios</h2>

          <div className="flex flex-col gap-4 mb-6">
            {venues?.map((venue) => (
              <div key={venue.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-semibold">{venue.name}</p>
                    {venue.location && (
                      <p className="text-gray-500 text-sm">{venue.location}</p>
                    )}
                  </div>
                  <form action={deleteVenue}>
                    <input type="hidden" name="venue_id" value={venue.id} />
                    <input type="hidden" name="tournament_id" value={id} />
                    <button className="text-gray-600 hover:text-red-400 text-sm transition-colors">
                      Eliminar
                    </button>
                  </form>
                </div>

                {/* Horarios de esta cancha */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {venue.venue_slots?.map((slot: { id: string; day_of_week: number; start_time: string; end_time: string }) => (
                    <form key={slot.id} action={deleteVenueSlot} className="inline">
                      <input type="hidden" name="slot_id" value={slot.id} />
                      <input type="hidden" name="tournament_id" value={id} />
                      <button className="bg-gray-800 hover:bg-red-950 hover:text-red-400 text-gray-300 text-xs px-3 py-1.5 rounded-full transition-colors">
                        {dayNames[slot.day_of_week]} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} ×
                      </button>
                    </form>
                  ))}
                </div>

                {/* Agregar horario */}
                <form action={addVenueSlot} className="flex flex-wrap items-end gap-2 mt-4 pt-4 border-t border-gray-800">
                  <input type="hidden" name="venue_id" value={venue.id} />
                  <input type="hidden" name="tournament_id" value={id} />
                  <select
                    name="day_of_week"
                    required
                    className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-2"
                  >
                    {dayNames.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                  <input
                    name="start_time"
                    type="time"
                    required
                    className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-2"
                  />
                  <input
                    name="end_time"
                    type="time"
                    required
                    className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-2"
                  />
                  <button className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg transition-colors">
                    + Agregar horario
                  </button>
                </form>
              </div>
            ))}
          </div>

          {/* Agregar cancha nueva */}
          <form action={createVenue} className="bg-gray-900 border border-dashed border-gray-800 rounded-lg p-5 flex flex-col sm:flex-row gap-3">
            <input type="hidden" name="tournament_id" value={id} />
            <input
              name="name"
              required
              placeholder="Nombre de la cancha (ej. Cancha 1)"
              className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-green-500"
            />
            <input
              name="location"
              placeholder="Ubicación (opcional)"
              className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-green-500"
            />
            <button className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap">
              + Agregar cancha
            </button>
          </form>
        </section>

        <p className="text-gray-600 text-sm mt-10">
          Próximamente: registro de equipos y jugadores en esta misma pantalla.
        </p>
      </div>
    </main>
  )
}