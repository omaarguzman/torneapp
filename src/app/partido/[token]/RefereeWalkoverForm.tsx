'use client'

import { useActionState, useState } from 'react'
import { submitRefereeWalkover } from '@/app/actions/matchReport'

export default function RefereeWalkoverForm({
  token,
  homeName,
  awayName,
  hasWalkover,
}: {
  token: string
  homeName: string
  awayName: string
  hasWalkover: boolean
}) {
  const [state, formAction, isPending] = useActionState(submitRefereeWalkover, null)
  const [absent, setAbsent] = useState('')

  const options: [string, string][] = [
    ['home', homeName],
    ['away', awayName],
    ['both', 'Ninguno de los dos'],
  ]
  const chosen = options.find(([value]) => value === absent)?.[1]

  return (
    <details className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 group">
      <summary className="cursor-pointer list-none text-gray-300 text-sm font-semibold">
        🏳️ {hasWalkover ? 'Cambiar el W.O.' : '¿Un equipo no se presentó? Registrar default / W.O.'}{' '}
        <span className="group-open:hidden">▾</span>
        <span className="hidden group-open:inline">▴</span>
      </summary>
      <form
        action={formAction}
        onSubmit={(e) => {
          const who = absent === 'both' ? 'ninguno de los dos equipos se presentó' : `${chosen} no se presentó`
          if (!window.confirm(`¿Registrar W.O.? (${who}). Se borrarán los goles y tarjetas capturados en esta cédula.`)) {
            e.preventDefault()
          }
        }}
        className="mt-3 flex flex-col gap-3"
      >
        <input type="hidden" name="token" value={token} />
        <p className="text-gray-500 text-xs">¿Quién no se presentó?</p>
        {options.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-white text-sm">
            <input type="radio" name="absent" value={value} checked={absent === value} onChange={() => setAbsent(value)} />
            {label}
          </label>
        ))}
        <p className="text-gray-500 text-xs">
          El marcador se asigna según el reglamento del torneo. El administrador lo revisará y validará.
        </p>
        {state && 'error' in state && <p className="text-red-400 text-xs">{state.error}</p>}
        {state && 'success' in state && <p className="text-green-400 text-xs">✓ W.O. registrado.</p>}
        <button
          type="submit"
          disabled={isPending || !absent}
          className="self-start bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Registrando...' : 'Registrar W.O.'}
        </button>
      </form>
    </details>
  )
}
