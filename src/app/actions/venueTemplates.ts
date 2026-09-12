'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type SlotRow = { day_of_week: number; start_time: string; end_time: string }

export async function saveVenueAsTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const venueId = formData.get('venue_id') as string
  const tournamentId = formData.get('tournament_id') as string

  const { data: venue } = await supabase
    .from('venues')
    .select('name, location, venue_slots(day_of_week, start_time, end_time)')
    .eq('id', venueId)
    .single()

  if (!venue) return

  const { data: template, error } = await supabase
    .from('venue_templates')
    .insert({ admin_id: user.id, name: venue.name, location: venue.location })
    .select()
    .single()

  if (error || !template) return

  const slots = venue.venue_slots as SlotRow[]
  if (slots.length > 0) {
    await supabase.from('venue_template_slots').insert(
      slots.map((s) => ({
        template_id: template.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }))
    )
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function useVenueTemplate(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const templateId = formData.get('template_id') as string

  const { data: template } = await supabase
    .from('venue_templates')
    .select('name, location, venue_template_slots(day_of_week, start_time, end_time)')
    .eq('id', templateId)
    .single()

  if (!template) return

  const { data: venue } = await supabase
    .from('venues')
    .insert({ tournament_id: tournamentId, name: template.name, location: template.location })
    .select()
    .single()

  const slots = template.venue_template_slots as SlotRow[]
  if (venue && slots.length > 0) {
    await supabase.from('venue_slots').insert(
      slots.map((s) => ({
        venue_id: venue.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }))
    )
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function deleteVenueTemplate(formData: FormData) {
  const supabase = await createClient()
  const templateId = formData.get('template_id') as string

  await supabase.from('venue_templates').delete().eq('id', templateId)

  revalidatePath('/dashboard/venues')
}