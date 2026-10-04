import { createClient } from '@/lib/supabase/server'
import EmailInviteForms from './EmailInviteForms'
import GoogleButton from '@/components/GoogleButton'
import { oauthErrorMessage } from '@/lib/oauthErrors'

type InviteInfo = {
  team_name: string
  tournament_name: string
  already_claimed: boolean
  delegate_name: string | null
  delegate_email: string | null
}

export default async function TeamInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const { data } = await supabase.rpc('get_team_invite_info', { p_token: token })
  const invite = data as InviteInfo | null
  const errorMessage = oauthErrorMessage(error)

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

        {errorMessage && (
          <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3 mb-6">
            {errorMessage}
          </p>
        )}

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

            <GoogleButton invite={token} />

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-xs">o con tu correo</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <EmailInviteForms
              token={token}
              defaultName={invite.delegate_name ?? ''}
              defaultEmail={invite.delegate_email ?? ''}
            />
          </>
        )}
      </div>
    </main>
  )
}
