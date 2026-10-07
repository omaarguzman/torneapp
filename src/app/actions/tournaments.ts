'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

  if (error) return { error: error.message }

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
