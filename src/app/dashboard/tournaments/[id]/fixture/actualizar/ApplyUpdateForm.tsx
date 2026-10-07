'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { applyFixtureUpdate } from '@/app/actions/fixtureUpdate'

export default function ApplyUpdateForm({
  tournamentId,
  planJson,
  summary,
}: {
  tournamentId: string
  planJson: string
  summary: string
}) {
  const [state, formAction, isPending] = useActionState(applyFixtureUpdate, null)
  const router = useRouter()

  return (
    <div>
      {state?.error && (
        <p className="mb-4 text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{state.error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <form
          action={formAction}
          onSubmit={(e) => {
            if (!window.confirm(`¿Aplicar estos cambios al fixture?\n\n${summary}`)) e.preventDefault()
          }}
        >
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <input type="hidden" name="plan" value={planJson} />
          <button
            type="submit"
            disabled={isPending}
            className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            {isPending ? 'Aplicando...' : '✓ Aplicar cambios'}
          </button>
        </form>
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.refresh()}
          className="border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          🔀 Generar otra propuesta
        </button>
        <Link
          href={`/dashboard/tournaments/${tournamentId}/fixture`}
          className="text-gray-500 hover:text-gray-300 text-sm font-semibold px-4 py-2.5"
        >
          Cancelar
        </Link>
      </div>
    </div>
  )
}
