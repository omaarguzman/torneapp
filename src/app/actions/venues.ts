'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createVenue(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  await supabase.from('venues').insert({
    tournament_id: tournamentId,
    name: formData.get('name') as string,
    location: (formData.get('location') as string) || null,
  })

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function deleteVenue(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  await supabase.from('venues').delete().eq('id', formData.get('venue_id') as string)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function addVenueSlot(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  await supabase.from('venue_slots').insert({
    venue_id: formData.get('venue_id') as string,
    day_of_week: parseInt(formData.get('day_of_week') as string),
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
  })

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function deleteVenueSlot(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  await supabase.from('venue_slots').delete().eq('id', formData.get('slot_id') as string)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}