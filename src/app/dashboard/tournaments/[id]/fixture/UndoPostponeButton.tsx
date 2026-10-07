'use client'

import { useActionState } from 'react'
import { undoPostpone } from '@/app/actions/pendingMatches'

export default function UndoPostponeButton({
  tournamentId,
  matchId,
  originalLabel,
}: {
  tournamentId: string
  matchId: string
  originalLabel: string
}) {
  const [state, formAction, isPending] = useActionState(undoPostpone, null)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const ok = window.confirm(`¿Deshacer el aplazamiento? El partido regresará a: ${originalLabel}.`)
        if (!ok) e.preventDefault()
      }}
      className="mt-2"
    >
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="match_id" value={matchId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-gray-300 hover:text-white disabled:text-gray-600 text-xs font-semibold border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1"
      >
        {isPending ? 'Deshaciendo...' : '↩ Deshacer aplazamiento'}
      </button>
      <span className="text-gray-500 text-[11px] ml-2">Regresa a: {originalLabel}</span>
      {state?.error && <p className="text-red-400 text-xs mt-1.5">{state.error}</p>}
    </form>
  )
}
