import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createVenue, deleteVenue, addVenueSlotRange, deleteVenueSlot } from '@/app/actions/venues'
import { saveVenueAsTemplate, useVenueTemplate } from '@/app/actions/venueTemplates'
import { deleteTeam } from '@/app/actions/teams'
import { deletePlayer } from '@/app/actions/players'

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

    const { data: venueTemplates } = await supabase
    .from('venue_templates')
    .select('id, name, location, venue_template_slots(id)')

  const { data: teams } = await supabase
    .from('teams')
    .select('*, preferred_slot:venue_slots(day_of_week, start_time, end_time, venue:venues(name)), players(*)')
    .eq('tournament_id', id)
    .order('created_at')

  teams?.forEach((team) => {
    team.players?.sort((a: { jersey_number: number | null }, b: { jersey_number: number | null }) =>
      (a.jersey_number ?? 999) - (b.jersey_number ?? 999)
    )
  })

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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Equipos</p>
            <p className="text-2xl font-bold text-white mt-1">{teams?.length ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Canchas</p>
            <p className="text-2xl font-bold text-white mt-1">{venues?.length ?? 0}</p>
          </div>
          <Link
            href={`/dashboard/tournaments/${id}/fixture`}
            className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-5 transition-colors"
          >
            <p className="text-gray-500 text-sm">Jornadas</p>
            <p className="text-2xl font-bold text-white mt-1">Ver fixture →</p>
          </Link>
          <Link
            href={`/dashboard/tournaments/${id}/stats`}
            className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-5 transition-colors"
          >
            <p className="text-gray-500 text-sm">Estadísticas</p>
            <p className="text-2xl font-bold text-white mt-1">Ver tabla →</p>
          </Link>
        </div>

        {/* SECCIÓN CANCHAS */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Canchas y horarios</h2>

          <div className="flex justify-end mb-2">
            <Link href="/dashboard/venues" className="text-gray-500 hover:text-gray-300 text-xs underline">
              Administrar canchas guardadas
            </Link>
          </div>

          {/* Usar cancha guardada */}
          {venueTemplates && venueTemplates.length > 0 && (
            <form action={useVenueTemplate} className="bg-gray-900 border border-green-900 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="tournament_id" value={id} />
              <div className="flex-1 min-w-[200px]">
                <span className="text-xs text-gray-500 block mb-1">Usar una cancha ya guardada</span>
                <select
                  name="template_id"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5"
                >
                  <option value="">Selecciona una cancha guardada</option>
                  {venueTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.venue_template_slots.length} horarios)
                    </option>
                  ))}
                </select>
              </div>
              <button className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                Usar esta cancha
              </button>
            </form>
          )}

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
                  <div className="flex items-center gap-3">
                    <form action={saveVenueAsTemplate}>
                      <input type="hidden" name="venue_id" value={venue.id} />
                      <input type="hidden" name="tournament_id" value={id} />
                      <button className="text-gray-500 hover:text-green-400 text-xs transition-colors">
                        💾 Guardar cancha
                      </button>
                    </form>
                    <form action={deleteVenue}>
                      <input type="hidden" name="venue_id" value={venue.id} />
                      <input type="hidden" name="tournament_id" value={id} />
                      <button className="text-gray-600 hover:text-red-400 text-sm transition-colors">
                        Eliminar
                      </button>
                    </form>
                  </div>
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

                {/* Generador de horarios en bloque */}
                <form action={addVenueSlotRange} className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-gray-800">
                  <input type="hidden" name="venue_id" value={venue.id} />
                  <input type="hidden" name="tournament_id" value={id} />

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-500">Días</span>
                    <div className="flex flex-wrap gap-1.5">
                      {dayNames.map((day, i) => (
                        <label key={i} className="cursor-pointer">
                          <input type="checkbox" name="days" value={i} className="peer sr-only" />
                          <span className="block px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-700 text-gray-400 peer-checked:bg-green-500 peer-checked:text-white peer-checked:border-green-500 transition-colors">
                            {day.slice(0, 3)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-500">Desde</span>
                    <input
                      name="range_start"
                      type="time"
                      required
                      defaultValue="19:00"
                      className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-2"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-500">Hasta</span>
                    <input
                      name="range_end"
                      type="time"
                      required
                      defaultValue="22:00"
                      className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-2"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-500">Duración</span>
                    <select
                      name="duration"
                      defaultValue="60"
                      className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-2"
                    >
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                      <option value="120">120 min</option>
                    </select>
                  </div>

                  <button className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg transition-colors h-[34px]">
                    + Generar horarios
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

        {/* SECCIÓN EQUIPOS */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Equipos</h2>
            <Link
              href={`/dashboard/tournaments/${id}/teams/new`}
              className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + Nuevo equipo
            </Link>
          </div>

          {teams && teams.length > 0 ? (
            <div className="flex flex-col gap-3">
              {teams.map((team) => (
                <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">⚽</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{team.name}</p>
                      {team.delegate_email && (
                        <p className="text-gray-500 text-xs truncate">{team.delegate_email}</p>
                      )}
                      {team.has_scheduling_priority && team.preferred_slot && (
                        <span className="inline-block mt-1.5 bg-yellow-950 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full">
                          ⭐ {team.preferred_slot.venue?.name} · {dayNames[team.preferred_slot.day_of_week]} {team.preferred_slot.start_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <form action={deleteTeam}>
                      <input type="hidden" name="team_id" value={team.id} />
                      <input type="hidden" name="tournament_id" value={id} />
                      <button className="text-gray-600 hover:text-red-400 text-xs transition-colors">
                        ✕
                      </button>
                    </form>
                  </div>

                  {/* Jugadores del equipo */}
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Jugadores ({team.players?.length ?? 0})
                      </p>
                      <Link
                        href={`/dashboard/tournaments/${id}/teams/${team.id}/players/new`}
                        className="text-green-400 hover:text-green-300 text-xs font-semibold"
                      >
                        + Jugador
                      </Link>
                    </div>

                    {team.players && team.players.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {team.players.map((player: {
                          id: string
                          full_name: string
                          jersey_number: number | null
                          position: string | null
                          photo_url: string | null
                        }) => (
                          <div key={player.id} className="flex items-center gap-2.5 bg-gray-800/50 rounded-lg px-3 py-2">
                            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden text-[10px] text-gray-400 font-semibold">
                              {player.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
                              ) : (
                                player.jersey_number ?? '—'
                              )}
                            </div>
                            <span className="text-gray-200 text-sm flex-1 truncate">{player.full_name}</span>
                            {player.position && (
                              <span className="text-gray-500 text-xs">{player.position}</span>
                            )}
                            <form action={deletePlayer}>
                              <input type="hidden" name="player_id" value={player.id} />
                              <input type="hidden" name="tournament_id" value={id} />
                              <button className="text-gray-600 hover:text-red-400 text-xs transition-colors">
                                ✕
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-xs">Sin jugadores registrados.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-500 text-sm">Aún no hay equipos registrados.</p>
            </div>
          )}
        </section>

        <p className="text-gray-600 text-sm mt-10">
          Próximamente: registro de jugadores en esta misma pantalla.
        </p>
      </div>
    </main>
  )
}