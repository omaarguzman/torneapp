'use client'

import { useActionState, useState } from 'react'
import { swapMatches } from '@/app/actions/fixtureEdits'
import EditResultNotice from '../../EditResultNotice'

export type SwapOption = { id: string; label: string; group: string }

export default function SwapMatchForm({
  tournamentId,
  matchId,
  options,
}: {
  tournamentId: string
  matchId: string
  options: SwapOption[]
}) {
  const [state, formAction, isPending] = useActionState(swapMatches, null)
  const [otherId, setOtherId] = useState('')
  const [confirm, setConfirm] = useState(false)

  const groups = [...new Set(options.map((o) => o.group))]

  if (state && 'success' in state) {
    return <EditResultNotice state={state} confirm={false} onConfirmChange={() => {}} />
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="match_id" value={matchId} />
      <select
        name="other_id"
        value={otherId}
        onChange={(e) => {
          setOtherId(e.target.value)
          setConfirm(false)
        }}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        required
      >
        <option value="">Elige un partido...</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {options
              .filter((o) => o.group === g)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>

      <EditResultNotice state={state} confirm={confirm} onConfirmChange={setConfirm} />

      <button
        type="submit"
        disabled={isPending || options.length === 0}
        className="self-start border border-gray-700 hover:border-green-600 text-gray-200 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:text-gray-600"
      >
        {isPending ? 'Intercambiando...' : '⇄ Intercambiar'}
      </button>
    </form>
  )
}
