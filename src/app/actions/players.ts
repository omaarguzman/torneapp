'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { imageExtension, imageProblem } from '@/lib/uploads'
import { registrationOpen } from '@/lib/registration'

const REGISTRATION_CLOSED =
  'El plazo para registrar jugadores ya terminó. Si necesitas dar de alta a alguien, pídeselo al administrador del torneo.'

export async function createPlayer(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const teamId = formData.get('team_id') as string
  const fullName = formData.get('full_name') as string
  const jerseyNumberRaw = formData.get('jersey_number') as string
  const position = (formData.get('position') as string) || null
  const birthDate = (formData.get('birth_date') as string) || null
  const curp = ((formData.get('curp') as string) || '').trim().toUpperCase() || null
  const photoFile = formData.get('photo') as File | null

  const jerseyNumber = jerseyNumberRaw ? parseInt(jerseyNumberRaw) : null

  // El delegado solo puede registrar jugadores hasta la fecha límite del torneo (el admin, siempre).
  // Se revisa antes de subir la foto; la base de datos también lo impide.
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const { data: tournamentRow } = await supabase
    .from('tournaments')
    .select('admin_id, player_registration_deadline')
    .eq('id', tournamentId)
    .single()
  if (tournamentRow && tournamentRow.admin_id !== currentUser?.id && !registrationOpen(tournamentRow.player_registration_deadline)) {
    return { error: REGISTRATION_CLOSED }
  }

  if (curp) {
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('curp', curp)
      .maybeSingle()

    if (existing) {
      return { error: 'Ya existe un jugador con esa CURP registrado en este torneo.' }
    }
  }

  let photoUrl: string | null = null

  if (photoFile && photoFile.size > 0) {
    const problem = imageProblem(photoFile, 'La foto')
    if (problem) return { error: problem }

    // La carpeta por equipo permite que el delegado solo pueda tocar fotos de su equipo
    const path = `players/${tournamentId}/${teamId}/${crypto.randomUUID()}.${imageExtension(photoFile)}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, photoFile, { contentType: photoFile.type })

    if (uploadError) {
      console.error('[createPlayer] upload error:', uploadError)
      return { error: 'No se pudo subir la foto. Inténtalo de nuevo.' }
    }

    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)
    photoUrl = publicUrlData.publicUrl
  }

  const { error } = await supabase.from('players').insert({
    tournament_id: tournamentId,
    team_id: teamId,
    full_name: fullName,
    jersey_number: jerseyNumber,
    position,
    birth_date: birthDate,
    curp,
    photo_url: photoUrl,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe un jugador con esa CURP registrado en este torneo.' }
    }
    if (error.code === '42501') return { error: REGISTRATION_CLOSED }
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  redirect(profile?.role === 'delegate' ? '/delegado' : `/dashboard/tournaments/${tournamentId}`)
}

export async function deletePlayer(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const playerId = formData.get('player_id') as string

  const { data: player } = await supabase
    .from('players')
    .select('photo_url')
    .eq('id', playerId)
    .single()

  if (player?.photo_url) {
    const path = player.photo_url.split('/logos/')[1]
    if (path) await supabase.storage.from('logos').remove([path])
  }

  await supabase.from('players').delete().eq('id', playerId)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  revalidatePath('/delegado')
}
