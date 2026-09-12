import { createClient } from '@/lib/supabase/server'
import DelegateRegisterForm from './DelegateRegisterForm'

type InviteInfo = {
  team_name: string
  tournament_name: string
  already_claimed: boolean
}

export default async function TeamInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data } = await supabase.rpc('get_team_invite_info', { p_token: token })
  const invite = data as InviteInfo | null

  if (!invite) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <p className="text-gray-400 text-center">
          Este enlace no corresponde a ningún equipo. Verifica que lo hayas copiado completo.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-2xl font-black text-white mt-2">{invite.team_name}</h1>
          <p className="text-gray-400 text-sm mt-1">{invite.tournament_name}</p>
        </div>

        {invite.already_claimed ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-6 text-center">
            <p className="text-gray-300 text-sm">
              Este equipo ya tiene un delegado registrado. Si crees que esto es un error, contacta al
              administrador del torneo.
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm text-center mb-6">
              Regístrate para administrar los jugadores de tu equipo y ver las estadísticas del torneo.
            </p>
            <DelegateRegisterForm token={token} />
          </>
        )}
      </div>
    </main>
  )
}
