'use client'

import { useActionState } from 'react'
import { updateTournamentRules } from '@/app/actions/tournaments'

const inputClass =
  'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400'

export default function RulesForm({
  tournamentId,
  rules,
  yellowThreshold,
  redMatches,
  walkoverGoals,
  doubleWalkoverRule,
  registrationDeadline,
}: {
  tournamentId: string
  rules: string | null
  yellowThreshold: number | null
  redMatches: number
  walkoverGoals: number
  doubleWalkoverRule: string
  registrationDeadline: string | null
}) {
  const [state, formAction, isPending] = useActionState(updateTournamentRules, null)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Reglamento (texto libre)</label>
        <textarea name="rules" rows={5} defaultValue={rules ?? ''} className={`${inputClass} resize-y`} />
      </div>

      <fieldset className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
        <legend className="text-white text-sm font-semibold px-1">Registro de jugadores por delegados</legend>
        <label className="text-xs text-gray-500 mb-1 block">Fecha límite (los delegados pueden registrar jugadores hasta ese día, inclusive)</label>
        <input
          name="player_registration_deadline"
          type="date"
          defaultValue={registrationDeadline ?? ''}
          className={`${inputClass} sm:max-w-xs`}
        />
        <p className="text-gray-600 text-[11px] mt-2">
          Déjala vacía para no poner límite. Tú, como administrador, siempre puedes registrar jugadores.
        </p>
      </fieldset>

      <fieldset className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
        <legend className="text-white text-sm font-semibold px-1">Suspensiones</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Amarillas acumuladas para 1 partido de suspensión</label>
            <input
              name="yellow_card_suspension_threshold"
              type="number"
              min={1}
              max={20}
              defaultValue={yellowThreshold ?? ''}
              placeholder="Vacío = no se acumulan"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Partidos de suspensión por roja</label>
            <input name="red_card_suspension_matches" type="number" min={0} max={20} defaultValue={redMatches} className={inputClass} />
          </div>
        </div>
        <p className="text-gray-600 text-[11px] mt-2">
          Las suspensiones se recalculan con estas reglas para todo el torneo, incluidos los partidos ya jugados.
        </p>
      </fieldset>

      <fieldset className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
        <legend className="text-white text-sm font-semibold px-1">Default / W.O.</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Goles a favor del equipo que sí se presentó</label>
            <input name="walkover_goals" type="number" min={1} max={20} defaultValue={walkoverGoals} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Si ninguno de los dos se presenta</label>
            <select name="double_walkover_rule" defaultValue={doubleWalkoverRule} className={inputClass}>
              <option value="both_lose">Ambos pierden (0 puntos para los dos)</option>
              <option value="draw">Cuenta como empate 0-0 (1 punto cada uno)</option>
            </select>
          </div>
        </div>
        <p className="text-gray-600 text-[11px] mt-2">
          El marcador se guarda al declarar cada W.O.; cambiar los goles aquí aplica a los siguientes W.O. La regla del
          doble W.O. sí se aplica a toda la tabla.
        </p>
      </fieldset>

      {state && 'error' in state && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{state.error}</p>
      )}
      {state && 'success' in state && <p className="text-green-400 text-sm">✓ Reglas guardadas.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? 'Guardando...' : 'Guardar reglas'}
      </button>
    </form>
  )
}
