'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { imageExtension, imageProblem } from '@/lib/uploads'

export type NoteResult = { success: true } | { error: string } | null

/** Nota de la jornada que aparece en la imagen del rol (solo el admin). */
export async function saveMatchdayNote(_prev: NoteResult, formData: FormData): Promise<NoteResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchdayId = formData.get('matchday_id') as string
  const note = ((formData.get('note') as string) || '').trim().slice(0, 200)

  const { error } = await supabase
    .from('matchdays')
    .update({ image_note: note || null })
    .eq('id', matchdayId)
    .eq('tournament_id', tournamentId)

  if (error) {
    console.error('[saveMatchdayNote] error:', error)
    return { error: 'No se pudo guardar la nota.' }
  }
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture`)
  return { success: true }
}

export type LogoResult = { success: true } | { error: string } | null

function storagePath(publicUrl: string | null) {
  return publicUrl?.split('/logos/')[1] ?? null
}

/** Sube (o reemplaza) el logo del torneo que aparece en la imagen del rol. */
export async function uploadTournamentLogo(_prev: LogoResult, formData: FormData): Promise<LogoResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const file = formData.get('logo') as File | null

  if (!file || file.size === 0) return { error: 'Elige una imagen.' }
  const problem = imageProblem(file, 'El logo')
  if (problem) return { error: problem }

  const { data: tournament } = await supabase.from('tournaments').select('logo_url').eq('id', tournamentId).single()

  const path = `${tournamentId}/torneo-${crypto.randomUUID()}.${imageExtension(file)}`
  const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { contentType: file.type })
  if (uploadError) {
    console.error('[uploadTournamentLogo] error:', uploadError)
    return { error: 'No se pudo subir el logo. Inténtalo de nuevo.' }
  }

  const url = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
  const { error } = await supabase.from('tournaments').update({ logo_url: url }).eq('id', tournamentId)
  if (error) {
    await supabase.storage.from('logos').remove([path])
    return { error: 'No se pudo guardar el logo.' }
  }

  const old = storagePath(tournament?.logo_url ?? null)
  if (old) await supabase.storage.from('logos').remove([old])

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  return { success: true }
}

export async function removeTournamentLogo(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  const { data: tournament } = await supabase.from('tournaments').select('logo_url').eq('id', tournamentId).single()
  await supabase.from('tournaments').update({ logo_url: null }).eq('id', tournamentId)

  const old = storagePath(tournament?.logo_url ?? null)
  if (old) await supabase.storage.from('logos').remove([old])

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}
