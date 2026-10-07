'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type WalkoverResult = { error: string } | null

const ABSENT = ['home', 'away', 'both'] as const
type Absent = (typeof ABSENT)[number]

/**
 * Registra un default / W.O.: el partido queda jugado y validado con el
 * marcador administrativo que definen las reglas del torneo.
 */
export async function registerWalkover(_prev: WalkoverResult, formData: FormData): Promise<WalkoverResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string
  const absent = formData.get('absent') as Absent

  if (!ABSENT.includes(absent)) return { error: 'Elige qué equipo no se presentó.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const [{ data: match }, { data: tournament }] = await Promise.all([
    supabase.from('matches').select('id, status').eq('id', matchId).eq('tournament_id', tournamentId).maybeSingle(),
    supabase.from('tournaments').select('walkover_goals').eq('id', tournamentId).single(),
  ])

  if (!match || match.status !== 'scheduled') {
    return {
      error:
        match?.status === 'played'
          ? 'Este partido ya tiene cédula capturada. Para declararlo W.O., primero hay que borrar su resultado.'
          : 'Solo se puede declarar W.O. en un partido programado.',
    }
  }

  const goals = tournament?.walkover_goals ?? 3
  const score =
    absent === 'home' ? { score_home: 0, score_away: goals } : absent === 'away' ? { score_home: goals, score_away: 0 } : { score_home: 0, score_away: 0 }

  // Un W.O. no tiene goles, tarjetas ni asistencia
  await supabase.from('match_events').delete().eq('match_id', matchId)
  await supabase.from('match_attendance').delete().eq('match_id', matchId)

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'played',
      walkover: absent,
      ...score,
      validated_at: new Date().toISOString(),
      validated_by: user.id,
    })
    .eq('id', matchId)
    .eq('status', 'scheduled')

  if (error) {
    console.error('[registerWalkover] error:', error)
    return { error: 'No se pudo registrar el W.O. Inténtalo de nuevo.' }
  }

  revalidatePath('/', 'layout')
  return null
}

/** Quita el W.O.: el partido vuelve a quedar programado, sin resultado. */
export async function removeWalkover(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'scheduled',
      walkover: null,
      score_home: null,
      score_away: null,
      validated_at: null,
      validated_by: null,
    })
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .not('walkover', 'is', null)

  if (error) console.error('[removeWalkover] error:', error)
  revalidatePath('/', 'layout')
}
