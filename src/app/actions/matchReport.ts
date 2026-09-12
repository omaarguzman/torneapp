'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MatchReportResult = { success: true } | { error: string } | null

export async function submitMatchReport(
  _prevState: MatchReportResult,
  formData: FormData
): Promise<MatchReportResult> {
  const supabase = await createClient()

  const token = formData.get('token') as string
  const scoreHome = parseInt(formData.get('score_home') as string)
  const scoreAway = parseInt(formData.get('score_away') as string)
  const eventsRaw = formData.get('events') as string

  if (Number.isNaN(scoreHome) || Number.isNaN(scoreAway)) {
    return { error: 'El marcador es obligatorio para ambos equipos.' }
  }

  type IncomingEvent = { player_id: string; player_name: string; team_id: string; type: 'goal' | 'yellow_card' | 'red_card'; minute: string }
  let events: IncomingEvent[]
  try {
    events = JSON.parse(eventsRaw || '[]')
  } catch {
    return { error: 'Hubo un problema leyendo los eventos capturados.' }
  }

  const cardCounts = new Map<string, { name: string; yellows: number; reds: number }>()
  for (const e of events) {
    if (e.type === 'goal') continue
    const entry = cardCounts.get(e.player_id) ?? { name: e.player_name, yellows: 0, reds: 0 }
    if (e.type === 'yellow_card') entry.yellows++
    if (e.type === 'red_card') entry.reds++
    cardCounts.set(e.player_id, entry)
  }
  for (const { name, yellows, reds } of cardCounts.values()) {
    if (yellows > 2) return { error: `${name} no puede tener más de 2 tarjetas amarillas en un partido.` }
    if (reds > 1) return { error: `${name} no puede tener más de 1 tarjeta roja en un partido.` }
  }

  const { data: matchData } = await supabase.rpc('get_match_by_token', { p_token: token })
  const match = matchData as { home_team: { id: string }; away_team: { id: string } } | null

  if (!match) {
    return { error: 'Partido no encontrado.' }
  }

  const goalsHome = events.filter((e) => e.type === 'goal' && e.team_id === match.home_team.id).length
  const goalsAway = events.filter((e) => e.type === 'goal' && e.team_id === match.away_team.id).length

  if (goalsHome !== scoreHome || goalsAway !== scoreAway) {
    return {
      error: `Los goles registrados (${goalsHome}-${goalsAway}) no coinciden con el marcador capturado (${scoreHome}-${scoreAway}).`,
    }
  }

  const refereeNotes = (formData.get('referee_notes') as string) || null

  const { error } = await supabase.rpc('submit_match_report', {
    p_token: token,
    p_score_home: scoreHome,
    p_score_away: scoreAway,
    p_events: events,
    p_referee_notes: refereeNotes,
  })

  if (error) {
    return { error: 'No se pudo guardar la cédula: ' + error.message }
  }

  revalidatePath(`/partido/${token}`)
  return { success: true }
}
