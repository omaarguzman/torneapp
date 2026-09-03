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

export async function addVenueSlotRange(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const venueId = formData.get('venue_id') as string
  const days = formData.getAll('days') as string[]
  const rangeStart = formData.get('range_start') as string
  const rangeEnd = formData.get('range_end') as string
  const duration = parseInt(formData.get('duration') as string)

  if (days.length === 0 || !rangeStart || !rangeEnd || !duration) return

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const toTimeString = (mins: number) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0')
    const m = (mins % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  const startMin = toMinutes(rangeStart)
  const endMin = toMinutes(rangeEnd)

  const blocks: { start: string; end: string }[] = []
  for (let t = startMin; t + duration <= endMin; t += duration) {
    blocks.push({ start: toTimeString(t), end: toTimeString(t + duration) })
  }

  const rows = days.flatMap((day) =>
    blocks.map((b) => ({
      venue_id: venueId,
      day_of_week: parseInt(day),
      start_time: b.start,
      end_time: b.end,
    }))
  )

  if (rows.length > 0) {
    await supabase.from('venue_slots').insert(rows)
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function deleteVenueSlot(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  await supabase.from('venue_slots').delete().eq('id', formData.get('slot_id') as string)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}