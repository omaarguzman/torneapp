'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { imageExtension, imageProblem } from '@/lib/uploads'

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
    .from('team_private')
    .select('team_id, delegate_email')
    .eq('tournament_id', tournamentId)
    .not('delegate_email', 'is', null)
  return (data ?? []).some((t) => t.team_id !== excludeTeamId && t.delegate_email?.toLowerCase() === email)
}

/** Nombre/correo del delegado viven en team_private (solo visible para el admin). */
async function saveDelegateContact(
  supabase: SupabaseClient,
  teamId: string,
  delegateName: string | null,
  delegateEmail: string | null
) {
  const { error } = await supabase
    .from('team_private')
    .update({ delegate_name: delegateName, delegate_email: delegateEmail })
    .eq('team_id', teamId)

  if (error) {
    if (error.code === '23505') return { error: EMAIL_IN_USE_MESSAGE }
    console.error('[saveDelegateContact] error:', error)
    return { error: 'No se pudieron guardar los datos del delegado.' }
  }
  return null
}

async function uploadTeamLogo(
  supabase: SupabaseClient,
  tournamentId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const problem = imageProblem(file, 'El logo')
  if (problem) return { error: problem }

  const path = `${tournamentId}/${crypto.randomUUID()}.${imageExtension(file)}`
  const { error } = await supabase.storage.from('logos').upload(path, file, { contentType: file.type })

  if (error) {
    console.error('[uploadTeamLogo] error:', error)
    return { error: 'No se pudo subir el logo. Inténtalo de nuevo.' }
  }

  return { url: supabase.storage.from('logos').getPublicUrl(path).data.publicUrl }
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
    const upload = await uploadTeamLogo(supabase, tournamentId, logoFile)
    if ('error' in upload) return upload
    logoUrl = upload.url
  }

  // Un trigger crea automáticamente la fila en team_private (con su link de invitación)
  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      tournament_id: tournamentId,
      name,
      logo_url: logoUrl,
      has_scheduling_priority: hasPriority,
      preferred_slot_id: preferredSlotId,
    })
    .select('id')
    .single()

  if (error || !team) {
    console.error('[createTeam] error:', error)
    return { error: 'No se pudo crear el equipo. Inténtalo de nuevo.' }
  }

  if (delegateName || delegateEmail) {
    const contactError = await saveDelegateContact(supabase, team.id, delegateName, delegateEmail)
    if (contactError) return contactError
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
    has_scheduling_priority: boolean
    preferred_slot_id: string | null
    logo_url?: string
  } = {
    name,
    has_scheduling_priority: hasPriority,
    preferred_slot_id: preferredSlotId,
  }

  if (logoFile && logoFile.size > 0) {
    const upload = await uploadTeamLogo(supabase, tournamentId, logoFile)
    if ('error' in upload) return upload
    updates.logo_url = upload.url
  }

  const { error } = await supabase.from('teams').update(updates).eq('id', teamId)

  if (error) {
    console.error('[updateTeam] error:', error)
    return { error: 'No se pudo guardar el equipo. Inténtalo de nuevo.' }
  }

  const contactError = await saveDelegateContact(supabase, teamId, delegateName, delegateEmail)
  if (contactError) return contactError

  redirect(`/dashboard/tournaments/${tournamentId}`)
}

export async function unlinkDelegate(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const teamId = formData.get('team_id') as string

  const { error } = await supabase.from('teams').update({ delegate_id: null }).eq('id', teamId)
  if (error) console.error('[unlinkDelegate] teams error:', error)

  // Un token nuevo invalida el link anterior aunque alguien lo tenga guardado
  const { error: privateError } = await supabase
    .from('team_private')
    .update({
      delegate_name: null,
      delegate_email: null,
      invite_token: crypto.randomUUID().replace(/-/g, ''),
    })
    .eq('team_id', teamId)
  if (privateError) console.error('[unlinkDelegate] team_private error:', privateError)

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