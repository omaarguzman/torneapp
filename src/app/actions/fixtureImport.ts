'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mondayOf } from '@/lib/fixtures/fixtureUpdate'

export type ImportMatch = {
  home: string
  away: string
  scoreHome: string
  scoreAway: string
  date: string
  time: string
  venue: string
}
export type ImportMatchday = { matches: ImportMatch[] }
export type ImportResult = { error: string } | null

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Revisa las jornadas capturadas; regresa el primer problema en palabras del admin. */
function problemIn(
  matchdays: ImportMatchday[],
  teamIds: Set<string>,
  venueIds: Set<string>,
  teamName: (id: string) => string,
  doubleRound: boolean,
  maxRounds: number
): string | null {
  if (matchdays.length === 0) return 'Agrega al menos una jornada.'
  if (matchdays.length >= maxRounds) {
    return `Con tus equipos el torneo tiene ${maxRounds} jornadas; importa menos para que quede algo por planear.`
  }

  const pairs = new Map<string, { home: string; count: number }>()
  for (const [i, md] of matchdays.entries()) {
    const j = `J${i + 1}`
    if (md.matches.length === 0) return `${j} no tiene partidos.`
    const busy = new Set<string>()
    for (const m of md.matches) {
      if (!m.home || !m.away) return `${j}: elige los dos equipos de cada partido.`
      if (!teamIds.has(m.home) || !teamIds.has(m.away)) return `${j}: hay un equipo que no es de este torneo.`
      if (m.home === m.away) return `${j}: un equipo no puede jugar contra sí mismo.`
      for (const t of [m.home, m.away]) {
        if (busy.has(t)) return `${j}: ${teamName(t)} aparece en más de un partido.`
        busy.add(t)
      }
      for (const s of [m.scoreHome, m.scoreAway]) {
        if (!/^\d{1,2}$/.test(s.trim())) return `${j}: escribe el marcador de ${teamName(m.home)} vs ${teamName(m.away)} (0 a 99).`
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) return `${j}: falta la fecha de ${teamName(m.home)} vs ${teamName(m.away)}.`
      if (!/^\d{2}:\d{2}$/.test(m.time)) return `${j}: falta la hora de ${teamName(m.home)} vs ${teamName(m.away)}.`
      if (!venueIds.has(m.venue)) return `${j}: elige la cancha de ${teamName(m.home)} vs ${teamName(m.away)}.`

      const key = pairKey(m.home, m.away)
      const seen = pairs.get(key)
      if (seen) {
        if (!doubleRound || seen.count >= 2) {
          return `${teamName(m.home)} vs ${teamName(m.away)} se repite. En este formato cada cruce se juega ${doubleRound ? 'dos veces' : 'una vez'}.`
        }
        if (seen.home === m.home) {
          return `${teamName(m.home)} vs ${teamName(m.away)} aparece dos veces con el mismo local. En la vuelta se invierte la localía.`
        }
        seen.count++
      } else {
        pairs.set(key, { home: m.home, count: 1 })
      }
    }
  }
  return null
}

const DB_ERRORS: Record<string, string> = {
  HAS_PLAYED: 'Este torneo ya tiene partidos jugados en Torneapp. Usa "Actualizar fixture" para continuar.',
  NOT_ADMIN: 'Solo el admin del torneo puede importar jornadas.',
  INVALID_SCORE: 'Hay un marcador fuera de rango (0 a 99).',
  INVALID_VENUE: 'Hay una cancha que no es de este torneo.',
  SAME_TEAM: 'Un equipo no puede jugar contra sí mismo.',
}

/**
 * Guarda las jornadas que se jugaron fuera de Torneapp (jugadas, solo con
 * marcador; validadas o con la cédula abierta) y lleva a "Actualizar fixture".
 */
export async function importPlayedMatchdays(_prev: ImportResult, formData: FormData): Promise<ImportResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  let matchdays: ImportMatchday[]
  try {
    matchdays = JSON.parse((formData.get('payload') as string) || '[]')
  } catch {
    return { error: 'No se pudieron leer las jornadas. Recarga la página e inténtalo de nuevo.' }
  }

  const [{ data: tournament }, { data: teams }, { data: venues }] = await Promise.all([
    supabase.from('tournaments').select('double_round').eq('id', tournamentId).maybeSingle(),
    supabase.from('teams').select('id, name').eq('tournament_id', tournamentId),
    supabase.from('venues').select('id, venue_slots(start_time, end_time)').eq('tournament_id', tournamentId),
  ])
  if (!tournament) return { error: 'No se encontró el torneo.' }

  const names = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const n = names.size
  const maxRounds = (n % 2 === 0 ? n - 1 : n) * (tournament.double_round ? 2 : 1)
  const problem = problemIn(
    matchdays,
    new Set(names.keys()),
    new Set((venues ?? []).map((v) => v.id)),
    (id) => names.get(id) ?? 'Un equipo',
    tournament.double_round,
    maxRounds
  )
  if (problem) return { error: problem }

  // Duración del partido: la del primer horario de la cancha (o 1 hora)
  const duration = new Map(
    (venues ?? []).map((v) => {
      const slot = (v.venue_slots as { start_time: string; end_time: string }[] | null)?.[0]
      if (!slot) return [v.id, 60] as const
      const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
      return [v.id, Math.max(toMin(slot.end_time) - toMin(slot.start_time), 30)] as const
    })
  )

  const payload = matchdays.map((md) => {
    const firstDate = md.matches.map((m) => m.date).sort()[0]
    return {
      week_start: mondayOf(firstDate),
      matches: md.matches.map((m) => ({
        home: m.home,
        away: m.away,
        venue: m.venue,
        date: m.date,
        start: m.time,
        end: addMinutes(m.time, duration.get(m.venue) ?? 60),
        score_home: Number(m.scoreHome),
        score_away: Number(m.scoreAway),
      })),
    }
  })

  const leaveOpen = formData.get('leave_open') === 'on'
  const { error } = await supabase.rpc('import_played_matchdays', {
    p_tournament_id: tournamentId,
    p_matchdays: payload,
    p_validated: !leaveOpen,
  })
  if (error) {
    console.error('[importPlayedMatchdays] error:', error)
    const code = Object.keys(DB_ERRORS).find((c) => error.message.includes(c))
    return { error: code ? DB_ERRORS[code] : 'No se pudieron guardar las jornadas. Inténtalo de nuevo.' }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`, 'layout')
  redirect(`/dashboard/tournaments/${tournamentId}/fixture/actualizar?importado=1`)
}
