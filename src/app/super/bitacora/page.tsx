import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Bitácora de soporte' }

type LogRow = {
  id: string
  tournament_id: string | null
  tournament_name: string | null
  table_name: string
  action: string
  detail: Record<string, unknown> | null
  created_at: string
}

const TABLES: Record<string, string> = {
  tournaments: 'Torneo',
  teams: 'Equipo',
  team_private: 'Delegado',
  players: 'Jugador',
  matches: 'Partido',
  matchdays: 'Jornada',
  match_events: 'Evento de cédula',
  match_attendance: 'Asistencia',
  team_charges: 'Cargo',
  venues: 'Cancha',
  venue_slots: 'Horario',
  venue_closures: 'Cierre de cancha',
  rol_templates: 'Plantilla del rol',
}
const ACTIONS: Record<string, string> = { insert: 'Alta', update: 'Cambio', delete: 'Baja' }

/** Resume qué cambió: nombres de columnas (o la pausa / transferencia en torneos). */
function describe(row: LogRow): string {
  const d = row.detail ?? {}
  if (row.table_name === 'tournaments' && row.action === 'update') {
    if ('disabled_at' in d) return d.disabled_at ? 'Torneo pausado' : 'Torneo reactivado'
    if ('admin_id' in d) return 'Torneo transferido a otra cuenta'
  }
  if (row.action === 'update') return Object.keys(d).join(', ')
  const name = d.name ?? d.full_name ?? d.concept
  return typeof name === 'string' ? name : ''
}

export default async function SupportLogPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_log')
    .select('id, tournament_id, tournament_name, table_name, action, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  const rows = (data ?? []) as LogRow[]

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <p className="font-condensed text-sm uppercase tracking-widest text-violet-300">Soporte de Torneapp</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-white mt-1">Bitácora</h1>
        <p className="text-gray-400 text-sm mt-2">
          Todo lo que la cuenta de soporte cambió en torneos de otros admins, más pausas y transferencias. Últimos 300 registros.
        </p>

        <div className="mt-6 overflow-x-auto bg-gray-900/70 border border-white/10 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-3 py-3 font-semibold">Torneo</th>
                <th className="px-3 py-3 font-semibold">Qué</th>
                <th className="px-3 py-3 font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 align-top">
                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap tabular-nums">
                    {new Date(r.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.tournament_id ? (
                      <Link href={`/dashboard/tournaments/${r.tournament_id}`} className="text-amber-300 hover:text-amber-200">
                        {r.tournament_name ?? 'Torneo'}
                      </Link>
                    ) : (
                      <span className="text-gray-500">{r.tournament_name ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white whitespace-nowrap">
                    {ACTIONS[r.action] ?? r.action} · {TABLES[r.table_name] ?? r.table_name}
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 min-w-[12rem]">{describe(r)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Sin movimientos todavía.
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
