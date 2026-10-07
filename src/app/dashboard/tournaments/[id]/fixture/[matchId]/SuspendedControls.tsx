'use client'

import { useActionState, useState } from 'react'
import { finalizeSuspendedMatch, resumeSuspendedMatch } from '@/app/actions/suspendedMatch'

const scoreClass =
  'w-16 bg-gray-800 border border-gray-700 text-white text-center text-lg font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500'

export default function SuspendedControls({
  tournamentId,
  matchId,
  homeName,
  awayName,
  minute,
  reason,
  partialHome,
  partialAway,
}: {
  tournamentId: string
  matchId: string
  homeName: string
  awayName: string
  minute: number | null
  reason: string | null
  partialHome: number
  partialAway: number
}) {
  const [state, formAction, isPending] = useActionState(finalizeSuspendedMatch, null)
  const [home, setHome] = useState(String(partialHome))
  const [away, setAway] = useState(String(partialAway))
  const changed = home !== String(partialHome) || away !== String(partialAway)

  return (
    <div className="bg-red-950/40 border border-red-900 rounded-lg p-4 flex flex-col gap-4">
      <div>
        <p className="text-red-300 text-sm font-semibold">
          ⛔ Suspendido en el minuto {minute} con marcador {partialHome}–{partialAway}
        </p>
        {reason && <p className="text-red-200/70 text-xs mt-0.5">Motivo: {reason}</p>}
        <p className="text-gray-400 text-xs mt-2">Decide cómo se resuelve:</p>
      </div>

      <form
        action={resumeSuspendedMatch}
        onSubmit={(e) => {
          const ok = window.confirm(
            '¿Reanudar en otra fecha? El partido pasará a Pendientes conservando el marcador, goles y tarjetas capturados.'
          )
          if (!ok) e.preventDefault()
        }}
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="match_id" value={matchId} />
        <button className="border border-sky-700 hover:border-sky-500 text-sky-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          ↻ Reanudar en otra fecha
        </button>
      </form>

      <form
        action={formAction}
        onSubmit={(e) => {
          const msg = changed
            ? `¿Fijar resultado administrativo ${homeName} ${home}–${away} ${awayName}? Quedará validado.`
            : `¿Dar por terminado con el marcador parcial ${home}–${away}? Quedará validado.`
          if (!window.confirm(msg)) e.preventDefault()
        }}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="match_id" value={matchId} />
        <p className="text-gray-300 text-sm font-semibold">✓ Dar resultado final</p>
        <div className="flex items-center gap-2 flex-wrap text-sm text-white">
          <span className="truncate max-w-[8rem]">{homeName}</span>
          <input
            name="score_home"
            type="number"
            min={0}
            max={99}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className={scoreClass}
          />
          <span className="text-gray-500">–</span>
          <input
            name="score_away"
            type="number"
            min={0}
            max={99}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className={scoreClass}
          />
          <span className="truncate max-w-[8rem]">{awayName}</span>
        </div>
        <p className="text-gray-500 text-xs">
          {changed
            ? 'Resultado administrativo (distinto al parcial). Los goles y tarjetas capturados se conservan para las estadísticas.'
            : 'Se usará el marcador parcial como resultado final. Cámbialo si el reglamento indica otro resultado.'}
        </p>
        {state?.error && <p className="text-red-400 text-xs">{state.error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="self-start bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Guardando...' : changed ? 'Fijar resultado administrativo' : 'Terminar con el marcador parcial'}
        </button>
      </form>
    </div>
  )
}
