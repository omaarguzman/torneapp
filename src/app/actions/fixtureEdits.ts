'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { matchScheduleLabel } from '@/lib/fixtures/matchLabel'

export type EditResult = { success: string } | { error: string } | { warnings: string[] } | null

function revalidateFixture(tournamentId: string) {
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture`, 'layout')
  revalidatePath('/delegado/fixture')
}

function errorFrom(message: string, map: Record<string, string>, fallback: string) {
  const code = Object.keys(map).find((c) => message.includes(c))
  return code ? map[code] : fallback
}

/** Dos partidos programados se cambian fecha, cancha, horario y jornada entre sí. */
export async function swapMatches(_prev: EditResult, formData: FormData): Promise<EditResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string
  const otherId = (formData.get('other_id') as string) || ''
  const confirmed = formData.get('confirm') === 'on'

  if (!otherId) return { error: 'Elige el partido con el que lo quieres intercambiar.' }
  if (otherId === matchId) return { error: 'Elige un partido distinto.' }

  const [{ data: pair }, { data: others }, { data: teams }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, status, home_team_id, away_team_id, match_date')
      .eq('tournament_id', tournamentId)
      .in('id', [matchId, otherId]),
    supabase
      .from('matches')
      .select('id, home_team_id, away_team_id, match_date')
      .eq('tournament_id', tournamentId)
      .neq('status', 'pending')
      .not('id', 'in', `(${matchId},${otherId})`),
    supabase.from('teams').select('id, name').eq('tournament_id', tournamentId),
  ])

  const a = pair?.find((m) => m.id === matchId)
  const b = pair?.find((m) => m.id === otherId)
  if (!a || !b || a.status !== 'scheduled' || b.status !== 'scheduled') {
    return { error: 'Solo se pueden intercambiar partidos programados que aún no se juegan.' }
  }

  // Tras el cambio, ¿algún equipo queda con dos partidos el mismo día?
  const names = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const warnings: string[] = []
  for (const [match, newDate] of [
    [a, b.match_date],
    [b, a.match_date],
  ] as const) {
    for (const teamId of [match.home_team_id, match.away_team_id]) {
      const busy = (others ?? []).some(
        (m) => m.match_date === newDate && (m.home_team_id === teamId || m.away_team_id === teamId)
      )
      if (busy) warnings.push(`${names.get(teamId) ?? 'Un equipo'} quedaría con otro partido ese mismo día.`)
    }
  }
  if (warnings.length > 0 && !confirmed) return { warnings }

  const { error } = await supabase.rpc('swap_matches', { p_match_a: matchId, p_match_b: otherId })
  if (error) {
    console.error('[swapMatches] error:', error)
    return {
      error: errorFrom(
        error.message,
        { NOT_SCHEDULED: 'Uno de los partidos ya no está programado. Recarga la página.' },
        'No se pudo intercambiar. Inténtalo de nuevo.'
      ),
    }
  }

  revalidateFixture(tournamentId)
  return { success: 'Partidos intercambiados.' }
}

/** Recorre una jornada (y opcionalmente las siguientes) N semanas. */
export async function shiftMatchday(_prev: EditResult, formData: FormData): Promise<EditResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const number = parseInt(formData.get('matchday_number') as string, 10)
  const weeks = parseInt(formData.get('weeks') as string, 10)
  const cascade = formData.get('cascade') === 'on'

  if (!Number.isInteger(weeks) || weeks === 0 || Math.abs(weeks) > 8) {
    return { error: 'Elige cuántas semanas recorrer (de 1 a 8, hacia adelante o hacia atrás).' }
  }

  const { error } = await supabase.rpc('shift_matchdays', {
    p_tournament_id: tournamentId,
    p_from_number: number,
    p_weeks: weeks,
    p_cascade: cascade,
  })

  if (error) {
    console.error('[shiftMatchday] error:', error)
    return {
      error: errorFrom(
        error.message,
        {
          HAS_PLAYED: 'Hay partidos jugados en las jornadas que se moverían. Solo se pueden recorrer jornadas sin partidos jugados.',
          SLOT_CLASH: cascade
            ? 'Al recorrerlas, algún partido quedaría en la misma cancha, día y hora que otro. No se movió nada.'
            : 'Al recorrerla, algún partido quedaría en la misma cancha, día y hora que otro (probablemente de otra jornada). Prueba marcando "recorrer también las jornadas siguientes". No se movió nada.',
          VENUE_CLOSED: 'Algún partido caería en una cancha marcada como cerrada ese día. No se movió nada.',
        },
        'No se pudo recorrer la jornada. Inténtalo de nuevo.'
      ),
    }
  }

  revalidateFixture(tournamentId)
  const plural = Math.abs(weeks) === 1 ? 'semana' : 'semanas'
  return {
    success: `${cascade ? `Jornadas ${number} en adelante recorridas` : `Jornada ${number} recorrida`} ${Math.abs(weeks)} ${plural} ${weeks > 0 ? 'hacia adelante' : 'hacia atrás'}.`,
  }
}

/** Marca una cancha como cerrada un día y manda a Pendientes los partidos que tenía. */
export async function closeVenueDay(_prev: EditResult, formData: FormData): Promise<EditResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const venueId = (formData.get('venue_id') as string) || ''
  const date = (formData.get('closed_on') as string) || ''
  const reason = ((formData.get('reason') as string) || '').trim().slice(0, 120)
  const confirmed = formData.get('confirm') === 'on'

  if (!venueId || !date) return { error: 'Elige la cancha y la fecha.' }

  const { data: affected } = await supabase
    .from('matches')
    .select('id, status, match_date, start_time, home:teams!home_team_id(name), away:teams!away_team_id(name)')
    .eq('tournament_id', tournamentId)
    .eq('venue_id', venueId)
    .eq('match_date', date)
    .eq('status', 'scheduled')
    .order('start_time')

  if ((affected ?? []).length > 0 && !confirmed) {
    return {
      warnings: (affected ?? []).map((m) => {
        const home = (Array.isArray(m.home) ? m.home[0] : m.home) as { name: string } | null
        const away = (Array.isArray(m.away) ? m.away[0] : m.away) as { name: string } | null
        return `${home?.name ?? '—'} vs ${away?.name ?? '—'} (${matchScheduleLabel({ ...m, venue_name: null })}) pasará a Pendientes.`
      }),
    }
  }

  const { data: count, error } = await supabase.rpc('close_venue_day', {
    p_tournament_id: tournamentId,
    p_venue_id: venueId,
    p_date: date,
    p_reason: reason || null,
  })

  if (error) {
    console.error('[closeVenueDay] error:', error)
    return { error: 'No se pudo cerrar la cancha. Inténtalo de nuevo.' }
  }

  revalidateFixture(tournamentId)
  return {
    success:
      (count as number) > 0
        ? `Cancha cerrada. ${count} partido(s) pasaron a Pendientes.`
        : 'Cancha cerrada. No tenía partidos programados ese día.',
  }
}

export async function reopenVenueDay(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const closureId = formData.get('closure_id') as string

  const { error } = await supabase
    .from('venue_closures')
    .delete()
    .eq('id', closureId)
    .eq('tournament_id', tournamentId)
  if (error) console.error('[reopenVenueDay] error:', error)

  revalidateFixture(tournamentId)
}
