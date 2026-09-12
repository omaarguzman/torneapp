'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateRoundRobinRounds } from '@/lib/fixtures/roundRobin'
import { scheduleFixtures, type SlotTemplate, type ConflictReport } from '@/lib/fixtures/scheduler'

type ActionResult =
  | { success: true }
  | { error: string; conflicts?: ConflictReport[] }

export async function generateFixtures(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('start_date, double_round')
    .eq('id', tournamentId)
    .single()

  if (!tournament?.start_date) {
    return { error: 'El torneo necesita una fecha de inicio para poder generar el fixture.' }
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('id, has_scheduling_priority, preferred_slot:venue_slots(venue_id, day_of_week, start_time, end_time)')
    .eq('tournament_id', tournamentId)

  if (!teams || teams.length < 2) {
    return { error: 'Necesitas al menos 2 equipos registrados para generar un fixture.' }
  }

  const { data: venues } = await supabase
    .from('venues')
    .select('id, venue_slots(day_of_week, start_time, end_time)')
    .eq('tournament_id', tournamentId)

  const slotTemplates: SlotTemplate[] = (venues ?? []).flatMap((v) =>
    (v.venue_slots ?? []).map((s: { day_of_week: number; start_time: string; end_time: string }) => ({
      venueId: v.id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time,
    }))
  )

  if (slotTemplates.length === 0) {
    return { error: 'Necesitas al menos un horario de cancha configurado antes de generar el fixture.' }
  }

  type SlotRow = { venue_id: string; day_of_week: number; start_time: string; end_time: string }
  type TeamRow = {
    id: string
    has_scheduling_priority: boolean
    preferred_slot: SlotRow | SlotRow[] | null
  }

  const priorities = new Map<string, SlotTemplate>()
  ;(teams as unknown as TeamRow[]).forEach((t) => {
    const slot = Array.isArray(t.preferred_slot) ? t.preferred_slot[0] : t.preferred_slot
    if (t.has_scheduling_priority && slot) {
      priorities.set(t.id, {
        venueId: slot.venue_id,
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        endTime: slot.end_time,
      })
    }
  })

  const teamIds = teams.map((t) => t.id)
  const rounds = generateRoundRobinRounds(teamIds, tournament.double_round)

  const result = scheduleFixtures({
    rounds,
    slotTemplates,
    priorities,
    startDate: tournament.start_date,
  })

  if (!result.ok) {
    if (result.reason === 'conflict') {
      return {
        error: 'Hay conflictos de horario entre equipos con preferencia pagada. Resuélvelos (cambiando el horario preferido de uno de los equipos) antes de generar el fixture.',
        conflicts: result.conflicts,
      }
    }
    return {
      error: `La jornada ${result.round} necesita ${result.needed} horario(s) pero solo hay ${result.available} disponible(s) esa semana. Agrega más canchas u horarios y vuelve a intentar.`,
    }
  }

  // Si ya existía un fixture generado antes, lo reemplazamos por completo
  await supabase.from('matchdays').delete().eq('tournament_id', tournamentId)

  for (const md of result.matchdays) {
    const { data: matchday, error: mdError } = await supabase
      .from('matchdays')
      .insert({ tournament_id: tournamentId, number: md.number, week_start: md.weekStart })
      .select()
      .single()

    if (mdError || !matchday) {
      return { error: 'Error al guardar las jornadas: ' + mdError?.message }
    }

    const matchesForRound = result.matches.filter((m) => m.round === md.number)
    if (matchesForRound.length > 0) {
      const { error: matchError } = await supabase.from('matches').insert(
        matchesForRound.map((m) => ({
          tournament_id: tournamentId,
          matchday_id: matchday.id,
          home_team_id: m.homeTeamId,
          away_team_id: m.awayTeamId,
          venue_id: m.venueId,
          match_date: m.date,
          start_time: m.startTime,
          end_time: m.endTime,
        }))
      )
      if (matchError) return { error: 'Error al guardar los partidos: ' + matchError.message }
    }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture`)
  return { success: true }
}
