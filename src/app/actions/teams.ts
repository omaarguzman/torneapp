'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const EMAIL_IN_USE_MESSAGE = 'Ese correo ya está asignado al delegado de otro equipo de este torneo.'

function normalizeEmail(raw: FormDataEntryValue | null) {
  const email = ((raw as string) || '').trim().toLowerCase()
  return email || null
}

async function delegateEmailTaken(
  supabase: SupabaseClient,
  tournamentId: string,
  email: string | null,
  excludeTeamId?: string
) {
  if (!email) return false
  const { data } = await supabase
    .from('teams')
    .select('id, delegate_email')
    .eq('tournament_id', tournamentId)
    .not('delegate_email', 'is', null)
  return (data ?? []).some((t) => t.id !== excludeTeamId && t.delegate_email?.toLowerCase() === email)
}

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const name = formData.get('name') as string
  const delegateEmail = normalizeEmail(formData.get('delegate_email'))

  if (await delegateEmailTaken(supabase, tournamentId, delegateEmail)) {
    return { error: EMAIL_IN_USE_MESSAGE }
  }
  const delegateName = (formData.get('delegate_name') as string) || null
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
    delegate_name: delegateName,
    logo_url: logoUrl,
    has_scheduling_priority: hasPriority,
    preferred_slot_id: preferredSlotId,
  })

  if (error) {
    if (error.code === '23505') return { error: EMAIL_IN_USE_MESSAGE }
    return { error: error.message }
  }

  redirect(`/dashboard/tournaments/${tournamentId}`)
}

export async function updateTeam(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const teamId = formData.get('team_id') as string
  const name = formData.get('name') as string
  const delegateEmail = normalizeEmail(formData.get('delegate_email'))

  if (await delegateEmailTaken(supabase, tournamentId, delegateEmail, teamId)) {
    return { error: EMAIL_IN_USE_MESSAGE }
  }
  const delegateName = (formData.get('delegate_name') as string) || null
  const hasPriority = formData.get('has_scheduling_priority') === 'on'
  const preferredSlotId = hasPriority
    ? (formData.get('preferred_slot_id') as string) || null
    : null
  const logoFile = formData.get('logo') as File | null

  const updates: {
    name: string
    delegate_email: string | null
    delegate_name: string | null
    has_scheduling_priority: boolean
    preferred_slot_id: string | null
    logo_url?: string
  } = {
    name,
    delegate_email: delegateEmail,
    delegate_name: delegateName,
    has_scheduling_priority: hasPriority,
    preferred_slot_id: preferredSlotId,
  }

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: 'El logo no debe pesar más de 2MB.' }
    }

    const ext = logoFile.name.split('.').pop()
    const path = `${tournamentId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('logos').upload(path, logoFile)
    if (uploadError) return { error: 'No se pudo subir el logo: ' + uploadError.message }

    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)
    updates.logo_url = publicUrlData.publicUrl
  }

  const { error } = await supabase.from('teams').update(updates).eq('id', teamId)

  if (error) {
    if (error.code === '23505') return { error: EMAIL_IN_USE_MESSAGE }
    return { error: error.message }
  }

  redirect(`/dashboard/tournaments/${tournamentId}`)
}

export async function unlinkDelegate(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const teamId = formData.get('team_id') as string

  // Un token nuevo invalida el link anterior aunque alguien lo tenga guardado
  const { error } = await supabase
    .from('teams')
    .update({
      delegate_id: null,
      delegate_name: null,
      delegate_email: null,
      delegate_invite_token: crypto.randomUUID().replace(/-/g, ''),
    })
    .eq('id', teamId)

  if (error) console.error('[unlinkDelegate] error:', error)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
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