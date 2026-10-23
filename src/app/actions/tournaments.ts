'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SPORTS = ['futbol_11', 'futbol_7', 'futbol_5', 'futbol_salon']

/** Fecha de inicio obligatoria; la de fin, opcional y no antes del inicio. */
function datesProblem(start: string | null, end: string | null) {
  if (!start || !ISO_DATE.test(start)) return 'Indica la fecha de inicio del torneo.'
  if (end && !ISO_DATE.test(end)) return 'La fecha de fin no es válida.'
  if (end && end < start) return 'La fecha de fin no puede ser antes de la de inicio.'
  return null
}

export async function createTournament(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const sportType = formData.get('sport_type') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const rules = formData.get('rules') as string
  const yellowThresholdRaw = formData.get('yellow_card_suspension_threshold') as string
  const redSuspensionRaw = formData.get('red_card_suspension_matches') as string

  // Sin fecha de inicio no se puede generar el fixture
  const dateProblem = datesProblem(startDate, endDate)
  if (dateProblem) return { error: dateProblem }

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      admin_id: user.id,
      name,
      sport_type: sportType,
      start_date: startDate || null,
      end_date: endDate || null,
      rules: rules || null,
      allow_schedule_priority: formData.get('allow_schedule_priority') === 'on',
      double_round: formData.get('format') === 'double',
      yellow_card_suspension_threshold: yellowThresholdRaw ? parseInt(yellowThresholdRaw) : null,
      red_card_suspension_matches: redSuspensionRaw ? parseInt(redSuspensionRaw) : 1,
    })
    .select()
    .single()

  if (error) {
    console.error('[createTournament] error:', error)
    return { error: 'No se pudo crear el torneo. Revisa los datos e inténtalo de nuevo.' }
  }

  redirect(`/dashboard/tournaments/${data.id}`)
}
export type RulesResult = { success: true } | { error: string } | null

export async function updateTournamentRules(_prev: RulesResult, formData: FormData): Promise<RulesResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  const yellowRaw = (formData.get('yellow_card_suspension_threshold') as string) || ''
  const red = parseInt((formData.get('red_card_suspension_matches') as string) || '1', 10)
  const goals = parseInt((formData.get('walkover_goals') as string) || '3', 10)
  const doubleRule = formData.get('double_walkover_rule') as string
  const yellow = yellowRaw ? parseInt(yellowRaw, 10) : null
  const deadlineRaw = ((formData.get('player_registration_deadline') as string) || '').trim()
  if (deadlineRaw && !/^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw)) {
    return { error: 'La fecha límite de registro no es válida.' }
  }

  if (yellow !== null && (!Number.isInteger(yellow) || yellow < 1 || yellow > 20)) {
    return { error: 'Las amarillas para suspensión deben ser un número entre 1 y 20 (o déjalo vacío).' }
  }
  if (!Number.isInteger(red) || red < 0 || red > 20) {
    return { error: 'Los partidos de suspensión por roja deben ser un número entre 0 y 20.' }
  }
  if (!Number.isInteger(goals) || goals < 1 || goals > 20) {
    return { error: 'Los goles del W.O. deben ser un número entre 1 y 20.' }
  }
  if (!['both_lose', 'draw'].includes(doubleRule)) {
    return { error: 'Elige qué pasa cuando ningún equipo se presenta.' }
  }

  const { error } = await supabase
    .from('tournaments')
    .update({
      rules: ((formData.get('rules') as string) || '').trim() || null,
      yellow_card_suspension_threshold: yellow,
      red_card_suspension_matches: red,
      walkover_goals: goals,
      double_walkover_rule: doubleRule,
      player_registration_deadline: deadlineRaw || null,
    })
    .eq('id', tournamentId)

  if (error) {
    console.error('[updateTournamentRules] error:', error)
    return { error: 'No se pudieron guardar las reglas. Inténtalo de nuevo.' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export type InfoResult = { success: true } | { error: string } | null

/**
 * Corrige los datos generales del torneo después de crearlo (nombre, tipo,
 * fechas). El formato (una o dos vueltas) solo se cambia mientras no haya
 * fixture. Cambiar la fecha de inicio no mueve partidos ya programados.
 */
export async function updateTournamentInfo(_prev: InfoResult, formData: FormData): Promise<InfoResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const name = ((formData.get('name') as string) || '').trim()
  const sportType = formData.get('sport_type') as string
  const startDate = ((formData.get('start_date') as string) || '').trim()
  const endDate = ((formData.get('end_date') as string) || '').trim() || null

  if (!name) return { error: 'El torneo necesita un nombre.' }
  if (!SPORTS.includes(sportType)) return { error: 'Elige el tipo de fútbol.' }
  const dateProblem = datesProblem(startDate, endDate)
  if (dateProblem) return { error: dateProblem }

  const updates: Record<string, unknown> = { name: name.slice(0, 120), sport_type: sportType, start_date: startDate, end_date: endDate }

  const format = formData.get('format')
  if (format === 'single' || format === 'double') {
    const { count } = await supabase.from('matchdays').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId)
    if ((count ?? 0) === 0) updates.double_round = format === 'double'
  }

  const { error } = await supabase.from('tournaments').update(updates).eq('id', tournamentId)
  if (error) {
    console.error('[updateTournamentInfo] error:', error)
    return { error: 'No se pudieron guardar los datos del torneo.' }
  }
  revalidatePath(`/dashboard/tournaments/${tournamentId}`, 'layout')
  return { success: true }
}
