'use client'

import { unlinkDelegate } from '@/app/actions/teams'

export default function UnlinkDelegateButton({
  teamId,
  tournamentId,
  teamName,
}: {
  teamId: string
  tournamentId: string
  teamName: string
}) {
  return (
    <form
      action={unlinkDelegate}
      className="inline"
      onSubmit={(e) => {
        const ok = window.confirm(
          `¿Desvincular al delegado de ${teamName}?\n\nPerderá el acceso de inmediato y se generará un link de invitación nuevo (el anterior dejará de funcionar).`
        )
        if (!ok) e.preventDefault()
      }}
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <button className="text-gray-500 hover:text-red-400 text-[10px] underline transition-colors">Desvincular</button>
    </form>
  )
}
