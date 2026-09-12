'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
    if (photoFile.size > 2 * 1024 * 1024) {
      return { error: 'La foto no debe pesar más de 2MB.' }
    }

    const ext = photoFile.name.split('.').pop()
    const path = `players/${tournamentId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, photoFile)

    if (uploadError) return { error: 'No se pudo subir la foto: ' + uploadError.message }

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
