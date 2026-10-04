'use client'

import { useActionState } from 'react'
import { createCharge } from '@/app/actions/charges'
import { CHARGE_CONCEPTS } from '@/lib/charges'

const inputClass =
  'bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-500'

export default function ChargeForm({
  tournamentId,
  teams,
}: {
  tournamentId: string
  teams: { id: string; name: string }[]
}) {
  const [state, formAction, isPending] = useActionState(createCharge, null)

  return (
    <form action={formAction} className="bg-gray-900 border border-dashed border-gray-800 rounded-lg p-5">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <p className="text-white font-semibold text-sm mb-3">Registrar cargo</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select name="team_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>Equipo</option>
          <option value="all">Todos los equipos</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select name="concept" required defaultValue="arbitraje" className={inputClass}>
          {Object.entries(CHARGE_CONCEPTS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <input name="description" placeholder="Detalle (ej. Jornada 3)" className={inputClass} />

        <input
          name="amount"
          type="number"
          min={0}
          step="0.01"
          required
          placeholder="Monto (MXN)"
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
        <div className="text-xs">
          {state && 'success' in state && <span className="text-green-400">✓ Cargo registrado.</span>}
          {state && 'error' in state && <span className="text-red-400">{state.error}</span>}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {isPending ? 'Guardando...' : '+ Registrar cargo'}
        </button>
      </div>
    </form>
  )
}
