'use client'

import { setTeamAccessBlocked } from '@/app/actions/charges'

export default function BlockAccessButton({
  tournamentId,
  teamId,
  teamName,
  blocked,
}: {
  tournamentId: string
  teamId: string
  teamName: string
  blocked: boolean
}) {
  return (
    <form
      action={setTeamAccessBlocked}
      onSubmit={(e) => {
        const message = blocked
          ? `¿Desbloquear el acceso de ${teamName}? Su delegado volverá a ver el calendario y a gestionar sus jugadores (la tabla y las estadísticas siguen sujetas a que esté al corriente).`
          : `¿Bloquear por completo el acceso de ${teamName}?\n\nSu delegado solo verá lo que debe: sin calendario, sin estadísticas y sin poder registrar jugadores, hasta que tú lo desbloquees.`
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="blocked" value={blocked ? 'false' : 'true'} />
      <button
        className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
          blocked
            ? 'border border-gray-700 text-gray-300 hover:border-gray-500'
            : 'text-red-400 hover:bg-red-950'
        }`}
      >
        {blocked ? 'Desbloquear acceso' : '⛔ Bloquear acceso'}
      </button>
    </form>
  )
}
