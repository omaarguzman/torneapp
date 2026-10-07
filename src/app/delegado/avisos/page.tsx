import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveCurrentTeam } from '@/lib/delegateTeam'
import { changeKindLabels, describeSnapshot, type ScheduleSnapshot } from '@/lib/fixtures/matchLabel'
import MarkAsRead from './MarkAsRead'
import RulesChangeNotice from './RulesChangeNotice'
import type { RulesSnapshot } from '@/lib/rulesSnapshot'

type Notification = {
  id: string
  kind: string
  source: string | null
  old: ScheduleSnapshot | RulesSnapshot
  new: ScheduleSnapshot | RulesSnapshot
  home_team_id: string | null
  away_team_id: string | null
  batch_count: number
  created_at: string
  read_at: string | null
}

export default async function DelegateNotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { team } = await resolveCurrentTeam(supabase, user.id)
  if (!team || team.access_blocked) redirect('/delegado')

  const [{ data }, { data: teams }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, kind, source, old, new, home_team_id, away_team_id, batch_count, created_at, read_at')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('teams').select('id, name').eq('tournament_id', team.tournament_id),
  ])

  const notifications = (data ?? []) as Notification[]
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const hasUnread = notifications.some((n) => !n.read_at)

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <MarkAsRead teamId={team.id} hasUnread={hasUnread} />
        <Link href="/delegado" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver a mi equipo
        </Link>
        <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-4 mb-1">Avisos</h1>
        <p className="text-gray-500 text-sm mb-6">Cambios en el calendario de {team.name}</p>

        {notifications.length === 0 ? (
          <div className="border border-dashed border-gray-800 rounded-lg p-10 text-center">
            <p className="text-gray-500">No tienes avisos.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg px-4 py-3 border ${n.read_at ? 'bg-gray-900 border-gray-800' : 'bg-green-950/30 border-green-800'}`}
              >
                <p className="text-gray-500 text-[11px] mb-1">
                  {new Date(n.created_at).toLocaleString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Mexico_City',
                  })}
                  {!n.read_at && <span className="ml-2 text-green-400 font-semibold">Nuevo</span>}
                </p>
                {n.kind === 'rules' ? (
                  <RulesChangeNotice oldS={n.old as RulesSnapshot | null} newS={n.new as RulesSnapshot} />
                ) : n.batch_count > 1 ? (
                  <>
                    <p className="text-white text-sm font-semibold">
                      🗓️ {n.batch_count} de tus partidos cambiaron{n.source ? ` (${n.source})` : ''}
                    </p>
                    <Link href="/delegado/fixture" className="text-amber-300 hover:text-amber-200 text-xs">
                      Ver el calendario →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-white text-sm font-semibold">
                      {changeKindLabels[n.kind] ?? 'Cambio'}: {teamName.get(n.home_team_id ?? '') ?? '—'} vs{' '}
                      {teamName.get(n.away_team_id ?? '') ?? '—'}
                    </p>
                    <p className="text-gray-400 text-xs capitalize">
                      {describeSnapshot(n.old as ScheduleSnapshot)} → <span className="text-gray-200">{describeSnapshot(n.new as ScheduleSnapshot)}</span>
                    </p>
                    {n.source && <p className="text-gray-500 text-xs mt-0.5">Motivo: {n.source}</p>}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
