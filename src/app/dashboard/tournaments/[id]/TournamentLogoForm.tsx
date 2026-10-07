'use client'

/* eslint-disable @next/next/no-img-element -- logo subido por el usuario */
import { useActionState } from 'react'
import { removeTournamentLogo, uploadTournamentLogo } from '@/app/actions/rolImage'
import { IMAGE_ACCEPT } from '@/lib/uploads'

export default function TournamentLogoForm({ tournamentId, logoUrl }: { tournamentId: string; logoUrl: string | null }) {
  const [state, formAction, isPending] = useActionState(uploadTournamentLogo, null)

  return (
    <div className="bg-gray-900/70 border border-white/10 rounded-xl p-4 flex items-center gap-4 flex-wrap">
      <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
        {logoUrl ? <img src={logoUrl} alt="Logo del torneo" className="w-full h-full object-contain" /> : <span className="text-3xl">⚽</span>}
      </div>
      <div className="flex-1 min-w-[14rem] flex flex-col gap-2">
        <p className="text-white text-sm font-semibold">Logo del torneo</p>
        <p className="text-gray-500 text-xs">Aparece en la imagen del rol de juegos. Si no subes uno, se usa un balón.</p>
        <form action={formAction} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <input
            type="file"
            name="logo"
            accept={IMAGE_ACCEPT}
            required
            className="text-gray-400 text-xs file:mr-2 file:bg-gray-800 file:border file:border-gray-700 file:text-gray-200 file:rounded-lg file:px-3 file:py-1.5"
          />
          <button
            type="submit"
            disabled={isPending}
            className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 text-xs font-semibold px-3 py-2 rounded-lg"
          >
            {isPending ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
          </button>
        </form>
        {logoUrl && (
          <form action={removeTournamentLogo}>
            <input type="hidden" name="tournament_id" value={tournamentId} />
            <button className="text-gray-500 hover:text-red-400 text-xs">Quitar logo</button>
          </form>
        )}
        {state && 'error' in state && <p className="text-red-400 text-xs">{state.error}</p>}
        {state && 'success' in state && <p className="text-green-400 text-xs">✓ Logo guardado</p>}
      </div>
    </div>
  )
}
