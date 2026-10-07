'use client'

import { useActionState } from 'react'
import { generateFixtures } from '@/app/actions/fixtures'

export default function GenerateFixtureButton({
  tournamentId,
  teamNames,
  hasExistingFixture,
  hasPlayedMatches = false,
}: {
  tournamentId: string
  teamNames: Record<string, string>
  hasExistingFixture: boolean
  hasPlayedMatches?: boolean
}) {
  const [state, formAction, isPending] = useActionState(generateFixtures, null)

  if (hasPlayedMatches) {
    return (
      <p className="text-gray-500 text-xs max-w-xs">
        🔒 Ya hay partidos jugados, así que el fixture no se puede regenerar. Usa <strong>Aplazar</strong> y la pestaña{' '}
        <strong>Pendientes</strong> para reacomodar partidos.
      </p>
    )
  }

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (hasExistingFixture) {
            const confirmed = window.confirm(
              'Ya existe un fixture generado. Si continúas, se borrará por completo y se creará uno nuevo. ¿Continuar?'
            )
            if (!confirmed) e.preventDefault()
          }
        }}
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <button
          type="submit"
          disabled={isPending}
          className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {isPending ? 'Generando...' : hasExistingFixture ? 'Regenerar fixture' : 'Generar fixture'}
        </button>
      </form>

      {state && 'success' in state && (
        <p className="mt-3 text-green-400 text-xs">✓ Fixture generado con éxito.</p>
      )}

      {state && 'error' in state && (
        <div className="mt-4 bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{state.error}</p>

          {state.conflicts && state.conflicts.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {state.conflicts.map((c, i) => (
                <li key={i} className="text-red-300 text-xs bg-red-900/40 rounded px-3 py-2">
                  Jornada {c.round}: <strong>{teamNames[c.teamA] ?? c.teamA}</strong> y{' '}
                  <strong>{teamNames[c.teamB] ?? c.teamB}</strong>{' '}
                  {c.type === 'head_to_head'
                    ? 'juegan entre sí pero tienen horarios de preferencia distintos.'
                    : 'reclaman el mismo horario de preferencia en la misma jornada.'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
