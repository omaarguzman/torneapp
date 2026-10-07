'use client'

import { useFormStatus } from 'react-dom'
import { postponeMatch } from '@/app/actions/pendingMatches'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-yellow-500 hover:text-yellow-400 disabled:text-gray-600 text-[11px] font-semibold whitespace-nowrap"
    >
      {pending ? 'Aplazando...' : '⏸ Aplazar'}
    </button>
  )
}

export default function PostponeButton({
  tournamentId,
  matchId,
  label,
}: {
  tournamentId: string
  matchId: string
  label: string
}) {
  return (
    <form
      action={postponeMatch}
      onSubmit={(e) => {
        const ok = window.confirm(
          `¿Aplazar ${label}? El partido se quitará de su jornada y quedará en la pestaña Pendientes hasta que lo vuelvas a programar.`
        )
        if (!ok) e.preventDefault()
      }}
    >
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="match_id" value={matchId} />
      <SubmitButton />
    </form>
  )
}
