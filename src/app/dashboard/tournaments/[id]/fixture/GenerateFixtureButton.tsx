'use client'

import { useState } from 'react'
import { generateFixtures } from '@/app/actions/fixtures'
import type { ConflictReport } from '@/lib/fixtures/scheduler'

export default function GenerateFixtureButton({
  tournamentId,
  teamNames,
  hasExistingFixture,
}: {
  tournamentId: string
  teamNames: Record<string, string>
  hasExistingFixture: boolean
}) {
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<ConflictReport[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    if (hasExistingFixture) {
      const confirmed = window.confirm(
        'Ya existe un fixture generado. Si continúas, se borrará por completo y se creará uno nuevo. ¿Continuar?'
      )
      if (!confirmed) return
    }

    setLoading(true)
    setError('')
    setConflicts([])

    const result = await generateFixtures(formData)

    if ('error' in result) {
      setError(result.error)
      setConflicts(result.conflicts ?? [])
    }

    setLoading(false)
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Generando...' : hasExistingFixture ? 'Regenerar fixture' : 'Generar fixture'}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>

          {conflicts.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {conflicts.map((c, i) => (
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
