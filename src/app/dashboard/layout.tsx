import type { ReactNode } from 'react'
import AppShell from '@/components/shell/AppShell'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppShell
      homeHref="/dashboard"
      subtitle={user?.email}
      links={[
        { href: '/dashboard', label: 'Mis torneos', icon: '🏆', exact: true },
        { href: '/dashboard/venues', label: 'Canchas guardadas', icon: '🏟️' },
        { href: '/dashboard/tournaments/new', label: 'Nuevo torneo', icon: '＋' },
      ]}
    >
      {children}
    </AppShell>
  )
}
