'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createTournament(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const sportType = formData.get('sport_type') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const rules = formData.get('rules') as string
  const yellowThresholdRaw = formData.get('yellow_card_suspension_threshold') as string
  const redSuspensionRaw = formData.get('red_card_suspension_matches') as string

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      admin_id: user.id,
      name,
      sport_type: sportType,
      start_date: startDate || null,
      end_date: endDate || null,
      rules: rules || null,
      allow_schedule_priority: formData.get('allow_schedule_priority') === 'on',
      double_round: formData.get('format') === 'double',
      yellow_card_suspension_threshold: yellowThresholdRaw ? parseInt(yellowThresholdRaw) : null,
      red_card_suspension_matches: redSuspensionRaw ? parseInt(redSuspensionRaw) : 1,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  redirect(`/dashboard/tournaments/${data.id}`)
}