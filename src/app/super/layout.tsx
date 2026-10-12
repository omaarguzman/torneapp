import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import AppShell from '@/components/shell/AppShell'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/superAdmin'

export default async function SuperLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isSuperAdmin(supabase))) redirect('/dashboard')

  return (
    <AppShell
      homeHref="/super"
      subtitle={`Soporte · ${user.email}`}
      links={[
        { href: '/super', label: 'Torneos', icon: '🌐', exact: true },
        { href: '/super/admins', label: 'Admins', icon: '👥' },
        { href: '/super/bitacora', label: 'Bitácora', icon: '🧾' },
        { href: '/dashboard', label: 'Mis torneos', icon: '🏆' },
        { href: '/dashboard/tournaments/new', label: 'Nuevo torneo', icon: '＋' },
      ]}
    >
      {children}
    </AppShell>
  )
}
