'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { imageExtension, imageProblem } from '@/lib/uploads'
import { BUILTIN_TEMPLATES } from '@/lib/rol/templates'

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

const BUILTIN_KEYS = BUILTIN_TEMPLATES.map((t) => t.key)
const MAX_CUSTOM_TEMPLATES = 12

/** Valida que la plantilla exista para este torneo: 'auto', una incluida o una propia del torneo. */
async function validTemplate(supabase: Awaited<ReturnType<typeof createClient>>, tournamentId: string, value: string) {
  if (value === 'auto' || BUILTIN_KEYS.includes(value)) return true
  if (!value.startsWith('custom:')) return false
  const { data } = await supabase
    .from('rol_templates')
    .select('id')
    .eq('id', value.slice('custom:'.length))
    .eq('tournament_id', tournamentId)
    .maybeSingle()
  return !!data
}

export type TemplateResult = { success: true } | { error: string } | null

/** Plantilla del torneo: la ven todos (admin y delegados) salvo que una jornada tenga otra. */
export async function setTournamentTemplate(_prev: TemplateResult, formData: FormData): Promise<TemplateResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const value = (formData.get('template') as string) || 'auto'

  if (!(await validTemplate(supabase, tournamentId, value))) return { error: 'Esa plantilla no existe.' }

  const { error } = await supabase.from('tournaments').update({ rol_template: value }).eq('id', tournamentId)
  if (error) {
    console.error('[setTournamentTemplate] error:', error)
    return { error: 'No se pudo guardar la plantilla.' }
  }
  revalidatePath(`/dashboard/tournaments/${tournamentId}`, 'layout')
  return { success: true }
}

/** Plantilla de una jornada en particular ('' = usar la del torneo). */
export async function setMatchdayTemplate(tournamentId: string, matchdayId: string, value: string): Promise<TemplateResult> {
  const supabase = await createClient()
  if (value && !(await validTemplate(supabase, tournamentId, value))) return { error: 'Esa plantilla no existe.' }

  const { error } = await supabase
    .from('matchdays')
    .update({ rol_template: value || null })
    .eq('id', matchdayId)
    .eq('tournament_id', tournamentId)
  if (error) {
    console.error('[setMatchdayTemplate] error:', error)
    return { error: 'No se pudo guardar la plantilla de la jornada.' }
  }
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture`)
  return { success: true }
}

/** Sube un fondo propio (limpio, sin textos) para usarlo como plantilla del rol. */
export async function uploadRolTemplate(_prev: TemplateResult, formData: FormData): Promise<TemplateResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const name = ((formData.get('name') as string) || '').trim().slice(0, 60)
  const file = formData.get('image') as File | null

  if (!name) return { error: 'Ponle un nombre a la plantilla.' }
  if (!file || file.size === 0) return { error: 'Elige una imagen.' }
  const problem = imageProblem(file, 'La imagen')
  if (problem) return { error: problem }

  const { count } = await supabase
    .from('rol_templates')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
  if ((count ?? 0) >= MAX_CUSTOM_TEMPLATES) {
    return { error: `Puedes tener hasta ${MAX_CUSTOM_TEMPLATES} plantillas propias. Borra alguna para subir otra.` }
  }

  const path = `${tournamentId}/plantilla-${crypto.randomUUID()}.${imageExtension(file)}`
  const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { contentType: file.type })
  if (uploadError) {
    console.error('[uploadRolTemplate] error:', uploadError)
    return { error: 'No se pudo subir la imagen. Inténtalo de nuevo.' }
  }

  const url = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
  const { error } = await supabase.from('rol_templates').insert({ tournament_id: tournamentId, name, image_url: url })
  if (error) {
    await supabase.storage.from('logos').remove([path])
    console.error('[uploadRolTemplate] insert error:', error)
    return { error: 'No se pudo guardar la plantilla.' }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`, 'layout')
  return { success: true }
}

/** Borra una plantilla propia; donde se usaba, se vuelve a la automática. */
export async function deleteRolTemplate(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const templateId = formData.get('template_id') as string
  const value = `custom:${templateId}`

  const { data: tpl } = await supabase
    .from('rol_templates')
    .select('image_url')
    .eq('id', templateId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()
  if (!tpl) return

  await supabase.from('tournaments').update({ rol_template: 'auto' }).eq('id', tournamentId).eq('rol_template', value)
  await supabase.from('matchdays').update({ rol_template: null }).eq('tournament_id', tournamentId).eq('rol_template', value)
  await supabase.from('rol_templates').delete().eq('id', templateId)

  const old = storagePath(tpl.image_url)
  if (old) await supabase.storage.from('logos').remove([old])

  revalidatePath(`/dashboard/tournaments/${tournamentId}`, 'layout')
}
