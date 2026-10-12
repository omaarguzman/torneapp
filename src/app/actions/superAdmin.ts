'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/superAdmin'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
export type SuperResult = { success: string } | { error: string } | null

/** Todas las acciones del portal exigen súper admin (la base de datos también lo revisa). */
async function superClient(): Promise<SupabaseClient | null> {
  const supabase = await createClient()
  return (await isSuperAdmin(supabase)) ? supabase : null
}

const NOT_ALLOWED = { error: 'Solo el soporte de Torneapp puede hacer esto.' }

export async function setTournamentPaused(tournamentId: string, paused: boolean): Promise<SuperResult> {
  const supabase = await superClient()
  if (!supabase) return NOT_ALLOWED
  const { error } = await supabase
    .from('tournaments')
    .update({ disabled_at: paused ? new Date().toISOString() : null })
    .eq('id', tournamentId)
  if (error) {
    console.error('[setTournamentPaused] error:', error)
    return { error: 'No se pudo cambiar el estado del torneo.' }
  }
  revalidatePath('/', 'layout')
  return { success: paused ? 'Torneo pausado.' : 'Torneo reactivado.' }
}

/** Lista recursiva de archivos de una carpeta del bucket (logos/{torneo}/… y players/{torneo}/…). */
async function listFiles(supabase: SupabaseClient, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 3) return []
  const { data } = await supabase.storage.from('logos').list(prefix, { limit: 1000 })
  const files: string[] = []
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`
    // Las carpetas no tienen id
    if (item.id) files.push(path)
    else files.push(...(await listFiles(supabase, path, depth + 1)))
  }
  return files
}

/** Borra el torneo con todo lo suyo. Pide escribir el nombre exacto para confirmar. */
export async function deleteTournamentAsSuper(_prev: SuperResult, formData: FormData): Promise<SuperResult> {
  const supabase = await superClient()
  if (!supabase) return NOT_ALLOWED
  const tournamentId = formData.get('tournament_id') as string
  const confirmName = ((formData.get('confirm_name') as string) || '').trim()

  const { data: tournament } = await supabase.from('tournaments').select('name').eq('id', tournamentId).maybeSingle()
  if (!tournament) return { error: 'Ese torneo ya no existe.' }
  if (confirmName !== tournament.name.trim()) return { error: 'El nombre no coincide. Escríbelo exactamente igual.' }

  const files = [
    ...(await listFiles(supabase, tournamentId)),
    ...(await listFiles(supabase, `players/${tournamentId}`)),
  ]

  const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId)
  if (error) {
    console.error('[deleteTournamentAsSuper] error:', error)
    return { error: 'No se pudo borrar el torneo.' }
  }

  // Las imágenes se borran al final: si algo fallara antes, el torneo sigue completo
  for (let i = 0; i < files.length; i += 100) {
    await supabase.storage.from('logos').remove(files.slice(i, i + 100))
  }

  revalidatePath('/super')
  return { success: `Se borró "${tournament.name}".` }
}

export type ClaimLinkResult = { token: string } | { error: string } | null

/** Link para que alguien tome el torneo como suyo (vale 7 días, un solo uso). */
export async function createClaimLink(tournamentId: string): Promise<ClaimLinkResult> {
  const supabase = await superClient()
  if (!supabase) return NOT_ALLOWED
  const { data, error } = await supabase
    .from('tournament_claims')
    .insert({ tournament_id: tournamentId })
    .select('token')
    .single()
  if (error || !data) {
    console.error('[createClaimLink] error:', error)
    return { error: 'No se pudo generar el link.' }
  }
  return { token: data.token }
}

const TRANSFER_ERRORS: Record<string, string> = {
  USER_NOT_FOUND: 'No hay ninguna cuenta de Torneapp con ese correo. Pídele que se registre o usa el link para tomar el torneo.',
  DELEGATE_ACCOUNT: 'Esa cuenta es de un delegado. Un delegado no puede ser admin de torneo con la misma cuenta.',
  NOT_FOUND: 'Ese torneo ya no existe.',
}

/** Pasa el torneo a una cuenta que ya existe. */
export async function transferTournament(_prev: SuperResult, formData: FormData): Promise<SuperResult> {
  const supabase = await superClient()
  if (!supabase) return NOT_ALLOWED
  const tournamentId = formData.get('tournament_id') as string
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Escribe un correo válido.' }

  const { error } = await supabase.rpc('transfer_tournament', { p_tournament_id: tournamentId, p_email: email })
  if (error) {
    console.error('[transferTournament] error:', error)
    const code = Object.keys(TRANSFER_ERRORS).find((c) => error.message.includes(c))
    return { error: code ? TRANSFER_ERRORS[code] : 'No se pudo transferir el torneo.' }
  }
  revalidatePath('/super')
  return { success: `El torneo ahora es de ${email}.` }
}

const CLAIM_ERRORS: Record<string, string> = {
  INVALID_LINK: 'Este link no corresponde a ningún torneo.',
  LINK_USED: 'Este link ya se usó. Pide uno nuevo al soporte de Torneapp.',
  LINK_EXPIRED: 'Este link ya venció. Pide uno nuevo al soporte de Torneapp.',
  DELEGATE_ACCOUNT:
    'Tu cuenta es de delegado de un equipo. Para administrar un torneo, crea otra cuenta con un correo distinto y vuelve a abrir este link.',
  NOT_AUTHENTICATED: 'Inicia sesión para tomar el torneo.',
}

/** Quien abre el link (con sesión iniciada) queda como admin del torneo. */
export async function claimTournament(_prev: SuperResult, formData: FormData): Promise<SuperResult> {
  const supabase = await createClient()
  const token = formData.get('token') as string
  const { error } = await supabase.rpc('claim_tournament', { p_token: token })
  if (error) {
    console.error('[claimTournament] error:', error)
    const code = Object.keys(CLAIM_ERRORS).find((c) => error.message.includes(c))
    return { error: code ? CLAIM_ERRORS[code] : 'No se pudo tomar el torneo. Inténtalo de nuevo.' }
  }
  revalidatePath('/', 'layout')
  return { success: 'ok' }
}
