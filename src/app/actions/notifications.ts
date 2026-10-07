'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Marca como leídos los avisos del equipo del delegado (la función valida que sea su equipo). */
export async function markNotificationsRead(teamId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_notifications_read', { p_team_id: teamId })
  if (error) console.error('[markNotificationsRead] error:', error)
  revalidatePath('/delegado')
}
