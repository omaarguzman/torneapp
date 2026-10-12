import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Admins' }

type AdminRow = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  is_super: boolean
  tournaments: number
  paused: number
  teams: number
  played: number
}

const dateLabel = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Nunca'

export default async function SuperAdminsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('super_admins_overview')
  if (error) console.error('[super/admins] error:', error)
  const admins = (data ?? []) as AdminRow[]

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <p className="font-condensed text-sm uppercase tracking-widest text-violet-300">Soporte de Torneapp</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-white mt-1">Admins</h1>
        <p className="text-gray-400 text-sm mt-2">Cuentas de administrador, cuántos torneos llevan y cuándo entraron por última vez.</p>

        <div className="mt-6 overflow-x-auto bg-gray-900/70 border border-white/10 rounded-xl">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-3 py-3 font-semibold text-center">Torneos</th>
                <th className="px-3 py-3 font-semibold text-center">Equipos</th>
                <th className="px-3 py-3 font-semibold text-center">Partidos jugados</th>
                <th className="px-3 py-3 font-semibold">Último acceso</th>
                <th className="px-3 py-3 font-semibold">Alta</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white whitespace-nowrap">
                    {a.email}
                    {a.is_super && <span className="ml-2 text-[10px] font-bold uppercase text-violet-200 bg-violet-900/70 px-1.5 py-0.5 rounded">Soporte</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-300">
                    {a.tournaments}
                    {a.paused > 0 && <span className="text-violet-300"> ({a.paused} ⏸)</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-300">{a.teams}</td>
                  <td className="px-3 py-3 text-center text-gray-300">{a.played}</td>
                  <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{dateLabel(a.last_sign_in_at)}</td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{dateLabel(a.created_at)}</td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Todavía no hay cuentas de administrador.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
