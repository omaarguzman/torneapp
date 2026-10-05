'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AttendanceResult = { success: true } | { error: string } | null

/** Solo el admin del torneo: las políticas RLS de match_attendance lo garantizan. */
export async function saveAttendance(_prev: AttendanceResult, formData: FormData): Promise<AttendanceResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string
  const selected = formData.getAll('player_id') as string[]

  const { data: match } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id')
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()

  if (!match) return { error: 'No se encontró el partido.' }

  const teamIds = [match.home_team_id, match.away_team_id]

  // Solo jugadores de los dos equipos del partido; quien tuvo gol o tarjeta siempre cuenta
  const [{ data: players }, { data: events }] = await Promise.all([
    supabase.from('players').select('id, team_id').in('team_id', teamIds),
    supabase.from('match_events').select('player_id, team_id').eq('match_id', matchId),
  ])

  const validPlayers = new Map((players ?? []).map((p) => [p.id, p.team_id]))
  const rows = new Map<string, string>()
  selected.filter((id) => validPlayers.has(id)).forEach((id) => rows.set(id, validPlayers.get(id)!))
  ;(events ?? []).forEach((e) => rows.set(e.player_id, e.team_id))

  const { error: deleteError } = await supabase.from('match_attendance').delete().eq('match_id', matchId)
  if (deleteError) {
    console.error('[saveAttendance] delete error:', deleteError)
    return { error: 'No se pudo guardar la asistencia.' }
  }

  if (rows.size > 0) {
    const { error } = await supabase.from('match_attendance').insert(
      [...rows].map(([playerId, teamId]) => ({
        match_id: matchId,
        player_id: playerId,
        team_id: teamId,
        tournament_id: tournamentId,
      }))
    )
    if (error) {
      console.error('[saveAttendance] insert error:', error)
      return { error: 'No se pudo guardar la asistencia.' }
    }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture/${matchId}`)
  return { success: true }
}

export async function setMinMatchesRequired(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const raw = ((formData.get('min_matches_required') as string) || '').trim()
  const value = raw ? parseInt(raw, 10) : null

  if (value !== null && (!Number.isInteger(value) || value < 1)) return

  const { error } = await supabase
    .from('tournaments')
    .update({ min_matches_required: value })
    .eq('id', tournamentId)

  if (error) console.error('[setMinMatchesRequired] error:', error)
  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}
