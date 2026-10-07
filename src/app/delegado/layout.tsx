import type { ReactNode } from 'react'
import AppShell from '@/components/shell/AppShell'
import type { NavLink } from '@/components/shell/NavLinks'
import { createClient } from '@/lib/supabase/server'
import { resolveCurrentTeam } from '@/lib/delegateTeam'

export default async function DelegateLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { team, teams } = user ? await resolveCurrentTeam(supabase, user.id) : { team: null, teams: [] }

  let unread = 0
  if (team && !team.access_blocked) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id)
      .is('read_at', null)
    unread = count ?? 0
  }

  // Con el acceso bloqueado solo queda "Mi equipo", donde se explica el bloqueo
  const links: NavLink[] = [{ href: '/delegado', label: 'Mi equipo', icon: '🛡️', exact: true }]
  if (team && !team.access_blocked) {
    links.push(
      { href: '/delegado/fixture', label: 'Calendario', icon: '🗓️' },
      { href: '/delegado/estadisticas', label: 'Tabla', icon: '🏆' },
      { href: '/delegado/reglamento', label: 'Reglamento', icon: '📜' },
      { href: '/delegado/avisos', label: 'Avisos', icon: '🔔', badge: unread }
    )
  }
  if (teams.length > 1) links.push({ href: '/delegado/equipos', label: 'Cambiar equipo', icon: '⇄' })

  return (
    <AppShell homeHref="/delegado" subtitle={team ? `${team.name} · ${team.tournament_name}` : user?.email} links={links}>
      {children}
    </AppShell>
  )
}
