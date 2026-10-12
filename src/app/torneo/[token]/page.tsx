import type { Metadata } from 'next'
import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import { createClient } from '@/lib/supabase/server'
import ClaimTournamentForm from './ClaimTournamentForm'

export const metadata: Metadata = { title: 'Tomar torneo' }

type ClaimInfo = { tournament_name: string; status: 'ok' | 'used' | 'expired' }

export default async function ClaimTournamentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.rpc('get_tournament_claim_info', { p_token: token }),
    supabase.auth.getUser(),
  ])
  const info = data as ClaimInfo | null

  return (
    <main className="auth-screen">
      <div className="w-full max-w-sm bg-gray-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl shadow-black/50 text-center">
        <LogoMark size={52} className="mx-auto" />
        {!info ? (
          <p className="text-gray-400 text-sm mt-6">Este link no corresponde a ningún torneo. Verifica que lo hayas copiado completo.</p>
        ) : info.status !== 'ok' ? (
          <p className="text-yellow-300 text-sm mt-6">
            {info.status === 'used' ? 'Este link ya se usó.' : 'Este link ya venció.'} Pide uno nuevo al soporte de Torneapp.
          </p>
        ) : (
          <>
            <p className="font-condensed text-sm uppercase tracking-widest text-amber-300 mt-4">Te invitaron a administrar</p>
            <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-1">{info.tournament_name}</h1>
            {user ? (
              <ClaimTournamentForm token={token} email={user.email ?? ''} />
            ) : (
              <div className="mt-6 flex flex-col gap-3 text-sm">
                <p className="text-gray-400">
                  Inicia sesión o crea tu cuenta de administrador. Después <strong className="text-white">vuelve a abrir este link</strong> para
                  tomar el torneo.
                </p>
                <Link href="/login" className="bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold py-3 rounded-lg">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="border border-white/15 hover:border-white/30 text-white font-semibold py-3 rounded-lg">
                  Crear cuenta
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
