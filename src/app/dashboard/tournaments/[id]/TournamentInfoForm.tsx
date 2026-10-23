'use client'

import { useActionState } from 'react'
import { updateTournamentInfo } from '@/app/actions/tournaments'

const field =
  'w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors'

/** Datos generales del torneo, editables después de crearlo (por ejemplo, si faltó la fecha de inicio). */
export default function TournamentInfoForm({
  tournamentId,
  name,
  sportType,
  startDate,
  endDate,
  doubleRound,
  hasFixture,
}: {
  tournamentId: string
  name: string
  sportType: string
  startDate: string | null
  endDate: string | null
  doubleRound: boolean
  hasFixture: boolean
}) {
  const [state, action, pending] = useActionState(updateTournamentInfo, null)

  return (
    <section className="bg-gray-900/70 border border-white/10 rounded-xl p-5">
      <h3 className="font-condensed text-lg font-bold uppercase tracking-wide text-white">Datos del torneo</h3>
      {!startDate && (
        <p className="mt-2 text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-3 py-2">
          Falta la fecha de inicio: sin ella no se puede generar el fixture.
        </p>
      )}

      <form action={action} className="mt-4 grid sm:grid-cols-2 gap-4">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <label className="flex flex-col gap-1 text-sm text-gray-400 sm:col-span-2">
          Nombre
          <input id="info-name" name="name" required defaultValue={name} maxLength={120} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-400">
          Tipo de fútbol
          <select id="info-sport" name="sport_type" defaultValue={sportType} className={field}>
            <option value="futbol_11">Fútbol 11</option>
            <option value="futbol_7">Fútbol 7</option>
            <option value="futbol_5">Fútbol 5</option>
            <option value="futbol_salon">Fútbol Salón (Futsal)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-400">
          Formato
          <select id="info-format" name="format" defaultValue={doubleRound ? 'double' : 'single'} disabled={hasFixture} className={`${field} disabled:opacity-60`}>
            <option value="single">Solo ida (una vuelta)</option>
            <option value="double">Ida y vuelta (dos vueltas)</option>
          </select>
          {hasFixture && <span className="text-xs text-gray-500">Ya hay fixture: el formato ya no se puede cambiar.</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-400">
          Fecha de inicio
          <input id="info-start" name="start_date" type="date" required defaultValue={startDate ?? ''} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-400">
          Fecha de fin (opcional)
          <input id="info-end" name="end_date" type="date" defaultValue={endDate ?? ''} className={field} />
        </label>

        {hasFixture && (
          <p className="sm:col-span-2 text-xs text-gray-500">
            Cambiar la fecha de inicio no mueve los partidos ya programados. Para moverlos usa <strong>Recorrer jornada</strong> en el
            Fixture, o <strong>Regenerar fixture</strong> si todavía no hay partidos jugados.
          </p>
        )}

        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button disabled={pending} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 text-sm font-bold px-4 py-2 rounded-lg">
            {pending ? 'Guardando…' : 'Guardar datos'}
          </button>
          {state && 'error' in state && <p className="text-red-300 text-sm">{state.error}</p>}
          {state && 'success' in state && <p className="text-green-300 text-sm">✓ Datos guardados.</p>}
        </div>
      </form>
    </section>
  )
}
