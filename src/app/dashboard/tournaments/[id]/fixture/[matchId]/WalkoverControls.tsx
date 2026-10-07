'use client'

import { useActionState, useState } from 'react'
import { registerWalkover, removeWalkover } from '@/app/actions/walkover'
import { walkoverLabel } from '@/lib/fixtures/matchLabel'

export default function WalkoverControls({
  tournamentId,
  matchId,
  homeName,
  awayName,
  walkover,
  walkoverGoals,
  doubleRule,
}: {
  tournamentId: string
  matchId: string
  homeName: string
  awayName: string
  walkover: string | null
  walkoverGoals: number
  doubleRule: 'both_lose' | 'draw'
}) {
  const [state, formAction, isPending] = useActionState(registerWalkover, null)
  const [absent, setAbsent] = useState('')

  if (walkover) {
    return (
      <div className="bg-orange-950/50 border border-orange-900 rounded-lg p-4">
        <p className="text-orange-300 text-sm font-semibold">🏳️ W.O. — {walkoverLabel(walkover, homeName, awayName)}</p>
        <form
          action={removeWalkover}
          onSubmit={(e) => {
            if (!window.confirm('¿Quitar el W.O.? El partido vuelve a quedar programado y sin resultado.')) e.preventDefault()
          }}
          className="mt-3"
        >
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <input type="hidden" name="match_id" value={matchId} />
          <button className="border border-gray-700 hover:border-gray-500 text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
            Quitar W.O.
          </button>
        </form>
      </div>
    )
  }

  const preview =
    absent === 'home'
      ? `${homeName} 0 – ${walkoverGoals} ${awayName}`
      : absent === 'away'
        ? `${homeName} ${walkoverGoals} – 0 ${awayName}`
        : absent === 'both'
          ? `0 – 0, ${doubleRule === 'both_lose' ? 'ambos pierden (0 puntos para los dos)' : 'cuenta como empate (1 punto para cada uno)'}`
          : null

  return (
    <details className="bg-gray-900/70 border border-white/10 rounded-xl p-4 group">
      <summary className="cursor-pointer list-none text-gray-300 text-sm font-semibold">
        🏳️ Declarar default / W.O. <span className="group-open:hidden">▾</span>
        <span className="hidden group-open:inline">▴</span>
      </summary>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(`¿Declarar W.O.? Resultado: ${preview}. El partido quedará validado.`)) e.preventDefault()
        }}
        className="mt-3 flex flex-col gap-3"
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="match_id" value={matchId} />
        <p className="text-gray-500 text-xs">¿Quién no se presentó?</p>
        {[
          ['home', homeName],
          ['away', awayName],
          ['both', 'Ninguno de los dos'],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-white text-sm">
            <input type="radio" name="absent" value={value} checked={absent === value} onChange={() => setAbsent(value)} />
            {label}
          </label>
        ))}
        {preview && <p className="text-gray-400 text-xs">Resultado: <span className="text-white">{preview}</span></p>}
        {state?.error && <p className="text-red-400 text-xs">{state.error}</p>}
        <button
          type="submit"
          disabled={isPending || !absent}
          className="self-start bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Registrando...' : 'Declarar W.O.'}
        </button>
        <p className="text-gray-600 text-[11px]">
          El marcador y la regla del doble W.O. se configuran en la pestaña Reglas del torneo.
        </p>
      </form>
    </details>
  )
}
