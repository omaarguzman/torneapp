'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const name = formData.get('name') as string
  const delegateEmail = (formData.get('delegate_email') as string) || null
  const hasPriority = formData.get('has_scheduling_priority') === 'on'
  const preferredSlotId = hasPriority
    ? (formData.get('preferred_slot_id') as string) || null
    : null
  const logoFile = formData.get('logo') as File | null

  let logoUrl: string | null = null

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: 'El logo no debe pesar más de 2MB.' }
    }

    const ext = logoFile.name.split('.').pop()
    const path = `${tournamentId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, logoFile)

    if (uploadError) return { error: 'No se pudo subir el logo: ' + uploadError.message }

    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)
    logoUrl = publicUrlData.publicUrl
  }

  const { error } = await supabase.from('teams').insert({
    tournament_id: tournamentId,
    name,
    delegate_email: delegateEmail,
    logo_url: logoUrl,
    has_scheduling_priority: hasPriority,
    preferred_slot_id: preferredSlotId,
  })

  if (error) return { error: error.message }

  redirect(`/dashboard/tournaments/${tournamentId}`)
}

export async function deleteTeam(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const teamId = formData.get('team_id') as string

  const { data: team } = await supabase
    .from('teams')
    .select('logo_url')
    .eq('id', teamId)
    .single()

  if (team?.logo_url) {
    const path = team.logo_url.split('/logos/')[1]
    if (path) await supabase.storage.from('logos').remove([path])
  }

  await supabase.from('teams').delete().eq('id', teamId)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}