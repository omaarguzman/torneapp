'use client'

import { validateMatch, reopenMatch } from '@/app/actions/matchValidation'

export default function ValidationControls({
  tournamentId,
  matchId,
  validated,
  hasReport,
}: {
  tournamentId: string
  matchId: string
  validated: boolean
  hasReport: boolean
}) {
  if (!hasReport) {
    return (
      <p className="text-gray-500 text-sm">
        Aún no hay cédula capturada. Puedes llenarla tú abajo o esperar a que la capture el árbitro.
      </p>
    )
  }

  return (
    <form
      action={validated ? reopenMatch : validateMatch}
      onSubmit={(e) => {
        const message = validated
          ? '¿Reabrir esta cédula? El árbitro (y tú) podrán volver a modificarla.'
          : '¿Validar esta cédula? A partir de ahora nadie podrá modificarla, ni siquiera el árbitro.'
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="match_id" value={matchId} />
      {validated ? (
        <button className="border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          Reabrir cédula
        </button>
      ) : (
        <button className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          ✓ Validar cédula
        </button>
      )}
    </form>
  )
}
