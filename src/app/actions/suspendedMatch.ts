'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SuspendedResult = { error: string } | null

/** El admin cierra un partido suspendido con el marcador parcial o con un resultado administrativo. */
export async function finalizeSuspendedMatch(_prev: SuspendedResult, formData: FormData): Promise<SuspendedResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string
  const scoreHome = parseInt(formData.get('score_home') as string, 10)
  const scoreAway = parseInt(formData.get('score_away') as string, 10)

  if (![scoreHome, scoreAway].every((n) => Number.isInteger(n) && n >= 0 && n <= 99)) {
    return { error: 'Captura un marcador válido para ambos equipos.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, score_home, score_away')
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()

  if (!match || match.status !== 'suspended') return { error: 'Este partido ya no está suspendido.' }

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'played',
      score_home: scoreHome,
      score_away: scoreAway,
      // Si el admin cambió el marcador parcial, es una decisión administrativa
      administrative_result: scoreHome !== match.score_home || scoreAway !== match.score_away,
      validated_at: new Date().toISOString(),
      validated_by: user.id,
    })
    .eq('id', matchId)
    .eq('status', 'suspended')

  if (error) {
    console.error('[finalizeSuspendedMatch] error:', error)
    return { error: 'No se pudo guardar el resultado. Inténtalo de nuevo.' }
  }

  revalidatePath('/', 'layout')
  return null
}

/** Manda el partido suspendido a Pendientes para reanudarlo en otra fecha, conservando lo capturado. */
export async function resumeSuspendedMatch(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, score_home, score_away, suspended_minute, matchday:matchdays!matchday_id(number)')
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()

  if (!match || match.status !== 'suspended') return

  const matchday = (Array.isArray(match.matchday) ? match.matchday[0] : match.matchday) as { number: number } | null

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'pending',
      postponed_from: matchday?.number ?? null,
      postpone_reason: `Suspendido en el min ${match.suspended_minute} (${match.score_home ?? 0}-${match.score_away ?? 0}), por reanudar`,
      matchday_id: null,
      match_date: null,
      start_time: null,
      end_time: null,
      venue_id: null,
      original_matchday_id: null,
      original_match_date: null,
      original_start_time: null,
      original_end_time: null,
      original_venue_id: null,
    })
    .eq('id', matchId)
    .eq('status', 'suspended')

  if (error) console.error('[resumeSuspendedMatch] error:', error)
  revalidatePath('/', 'layout')
}
