import type { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/** ¿La cuenta con sesión es súper admin? Lo decide la base de datos (tabla super_admins). */
export async function isSuperAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.rpc('is_super_admin')
  return data === true
}

/** Panel al que entra cada cuenta: súper admin → portal general; delegado; admin. */
export async function panelFor(supabase: SupabaseClient, userId: string): Promise<string> {
  if (await isSuperAdmin(supabase)) return '/super'
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return profile?.role === 'delegate' ? '/delegado' : '/dashboard'
}
