'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { matchdayForDate, scheduleConflicts } from '@/lib/fixtures/scheduling'

export type ScheduleResult =
  | { success: true }
  | { error: string }
  | { warnings: string[] }
  | null

const clearOriginal = {
  postpone_reason: null,
  original_matchday_id: null,
  original_match_date: null,
  original_start_time: null,
  original_end_time: null,
  original_venue_id: null,
}

function revalidateFixture(tournamentId: string) {
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture`)
  revalidatePath('/delegado/fixture')
}

/** Manda un partido sin jugar a la bandeja de pendientes (sin fecha, cancha ni jornada). */
export async function postponeMatch(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, matchday_id, match_date, start_time, end_time, venue_id, matchday:matchdays!matchday_id(number)')
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()

  if (!match || match.status !== 'scheduled') return

  const matchday = Array.isArray(match.matchday) ? match.matchday[0] : match.matchday

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'pending',
      postponed_from: (matchday as { number: number } | null)?.number ?? null,
      // Se guarda la programación original para poder deshacer el aplazamiento
      original_matchday_id: match.matchday_id,
      original_match_date: match.match_date,
      original_start_time: match.start_time,
      original_end_time: match.end_time,
      original_venue_id: match.venue_id,
      matchday_id: null,
      match_date: null,
      start_time: null,
      end_time: null,
      venue_id: null,
    })
    .eq('id', matchId)
    .eq('status', 'scheduled')

  if (error) console.error('[postponeMatch] error:', error)
  revalidateFixture(tournamentId)
}

export async function scheduleMatch(_prev: ScheduleResult, formData: FormData): Promise<ScheduleResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string
  const date = (formData.get('match_date') as string) || ''
  const venueId = (formData.get('venue_id') as string) || ''
  const startTime = (formData.get('start_time') as string) || ''
  const endTime = (formData.get('end_time') as string) || ''
  const requestedMatchday = (formData.get('matchday_id') as string) || ''
  const confirmed = formData.get('confirm') === 'on'

  if (!date || !venueId || !startTime || !endTime) {
    return { error: 'Elige fecha, cancha y horario.' }
  }
  if (endTime <= startTime) {
    return { error: 'La hora de fin debe ser posterior a la de inicio.' }
  }

  const [
    { data: match },
    { data: venue },
    { data: scheduled },
    { data: slots },
    { data: matchdays },
    { data: teams },
    { data: closures },
  ] =
    await Promise.all([
      supabase
        .from('matches')
        .select('id, status, validated_at, home_team_id, away_team_id')
        .eq('id', matchId)
        .eq('tournament_id', tournamentId)
        .maybeSingle(),
      supabase.from('venues').select('id').eq('id', venueId).eq('tournament_id', tournamentId).maybeSingle(),
      supabase
        .from('matches')
        .select('id, home_team_id, away_team_id, match_date, start_time, venue_id')
        .eq('tournament_id', tournamentId)
        .neq('status', 'pending'),
      supabase.from('venue_slots').select('venue_id, day_of_week, start_time, end_time, venue:venues!inner(tournament_id)').eq('venue.tournament_id', tournamentId),
      supabase.from('matchdays').select('id, number, week_start').eq('tournament_id', tournamentId),
      supabase.from('teams').select('id, name').eq('tournament_id', tournamentId),
      supabase.from('venue_closures').select('venue_id, closed_on').eq('tournament_id', tournamentId),
    ])

  // Sirve para programar un pendiente o para mover uno ya programado (nunca uno jugado)
  if (!match || !['pending', 'scheduled'].includes(match.status) || match.validated_at) {
    return { error: 'Este partido ya se jugó o ya no está disponible para programarse.' }
  }
  if (!venue) return { error: 'Esa cancha no pertenece a este torneo.' }

  const names = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const { blocking, warnings } = scheduleConflicts({
    matchId,
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    date,
    venueId,
    startTime,
    scheduled: scheduled ?? [],
    slots: slots ?? [],
    closures: closures ?? [],
    teamName: (id) => names.get(id) ?? 'Un equipo',
  })

  if (blocking.length > 0) return { error: blocking.join(' ') }
  if (warnings.length > 0 && !confirmed) return { warnings }

  const matchdayId =
    (matchdays ?? []).find((md) => md.id === requestedMatchday)?.id ?? matchdayForDate(matchdays ?? [], date)?.id ?? null

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'scheduled',
      match_date: date,
      start_time: startTime,
      end_time: endTime,
      venue_id: venueId,
      matchday_id: matchdayId,
      ...clearOriginal,
    })
    .eq('id', matchId)
    .in('status', ['pending', 'scheduled'])

  if (error) {
    console.error('[scheduleMatch] error:', error)
    return { error: 'No se pudo programar el partido. Inténtalo de nuevo.' }
  }

  revalidateFixture(tournamentId)
  return { success: true }
}

export type UndoResult = { error: string } | null

/** Regresa un partido aplazado a la fecha, cancha y jornada que tenía antes de aplazarlo. */
export async function undoPostpone(_prev: UndoResult, formData: FormData): Promise<UndoResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string

  const { data: match } = await supabase
    .from('matches')
    .select(
      'id, status, home_team_id, away_team_id, original_matchday_id, original_match_date, original_start_time, original_end_time, original_venue_id'
    )
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()

  if (!match || match.status !== 'pending') return { error: 'Este partido ya no está pendiente.' }
  if (
    !match.original_matchday_id ||
    !match.original_match_date ||
    !match.original_start_time ||
    !match.original_end_time ||
    !match.original_venue_id
  ) {
    return { error: 'No se guardó la programación original de este partido. Prográmalo manualmente.' }
  }

  // Mientras estuvo aplazado, otro partido pudo ocupar su cancha y horario
  const { data: clash } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .neq('status', 'pending')
    .eq('match_date', match.original_match_date)
    .eq('venue_id', match.original_venue_id)
    .eq('start_time', match.original_start_time)
    .limit(1)

  const { data: closed } = await supabase
    .from('venue_closures')
    .select('id')
    .eq('venue_id', match.original_venue_id)
    .eq('closed_on', match.original_match_date)
    .limit(1)

  if (closed && closed.length > 0) {
    return { error: 'Su cancha original está marcada como cerrada ese día. Prográmalo manualmente en otra fecha o cancha.' }
  }

  if (clash && clash.length > 0) {
    return {
      error: 'Su cancha y horario originales ya los ocupa otro partido. Prográmalo manualmente en otro horario.',
    }
  }

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'scheduled',
      matchday_id: match.original_matchday_id,
      match_date: match.original_match_date,
      start_time: match.original_start_time,
      end_time: match.original_end_time,
      venue_id: match.original_venue_id,
      postponed_from: null,
      ...clearOriginal,
    })
    .eq('id', matchId)
    .eq('status', 'pending')

  if (error) {
    console.error('[undoPostpone] error:', error)
    return { error: 'No se pudo deshacer el aplazamiento. Inténtalo de nuevo.' }
  }

  revalidateFixture(tournamentId)
  return null
}
