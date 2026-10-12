import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/superAdmin'

/**
 * Marco de cada torneo del admin. Avisa cuando el súper admin está dentro del
 * torneo de otra persona (modo soporte) y bloquea al dueño si el torneo está pausado.
 */
export default async function TournamentLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: { user } }, { data: tournament }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tournaments').select('name, admin_id, disabled_at').eq('id', id).maybeSingle(),
  ])
  if (!tournament || !user) return children

  const owner = tournament.admin_id === user.id
  const paused = !!tournament.disabled_at
  const isSuper = !owner || paused ? await isSuperAdmin(supabase) : false

  if (paused && !isSuper) {
    return (
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-xl mx-auto bg-gray-900/70 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-4xl">⏸</p>
          <h1 className="font-display text-2xl uppercase text-white mt-2">{tournament.name} está pausado</h1>
          <p className="text-gray-400 text-sm mt-2">
            El soporte de Torneapp pausó este torneo. Mientras tanto, ni tú ni los delegados pueden verlo ni
            modificarlo, y los árbitros no pueden capturar cédulas. Para reactivarlo, contacta al soporte.
          </p>
          <Link href="/dashboard" className="inline-block mt-5 text-amber-300 hover:text-amber-200 text-sm font-semibold">
            ← Volver a mis torneos
          </Link>
        </div>
      </main>
    )
  }

  return (
    <>
      {isSuper && (!owner || paused) && (
        <div className="bg-violet-950/70 border-b border-violet-700/60 text-violet-100 text-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
            <p>
              🛟 <strong>Modo soporte</strong>
              {!owner && ': este torneo es de otro admin. Lo que cambies queda en la bitácora.'}
              {paused && ' · ⏸ Torneo pausado: el admin y los delegados no pueden entrar.'}
            </p>
            <Link href="/super" className="font-semibold text-violet-200 hover:text-white whitespace-nowrap">
              ← Portal general
            </Link>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
