export type ScheduledMatch = {
  id: string
  home_team_id: string
  away_team_id: string
  match_date: string | null
  start_time: string | null
  venue_id: string | null
}

export type VenueSlot = { venue_id: string; day_of_week: number; start_time: string; end_time: string }

export type MatchdayWindow = { id: string; number: number; week_start: string }

const hhmm = (time: string | null) => (time ?? '').slice(0, 5)

export function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Jornada cuya semana (week_start + 6 días) contiene la fecha; si cae fuera, la más cercana. */
export function matchdayForDate(matchdays: MatchdayWindow[], date: string) {
  if (matchdays.length === 0) return null
  const sorted = [...matchdays].sort((a, b) => a.number - b.number)
  const inside = sorted.find((md) => date >= md.week_start && date <= addDays(md.week_start, 6))
  if (inside) return inside
  return date < sorted[0].week_start ? sorted[0] : sorted[sorted.length - 1]
}

/** Horarios de las canchas para ese día de la semana, marcando cuáles ya están ocupados. */
export function slotsForDate(date: string, slots: VenueSlot[], scheduled: ScheduledMatch[], ignoreMatchId?: string) {
  const dow = dayOfWeek(date)
  return slots
    .filter((s) => s.day_of_week === dow)
    .map((s) => ({
      ...s,
      occupied: scheduled.some(
        (m) =>
          m.id !== ignoreMatchId &&
          m.match_date === date &&
          m.venue_id === s.venue_id &&
          hhmm(m.start_time) === hhmm(s.start_time)
      ),
    }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

/**
 * blocking: imposible de programar (la cancha ya está ocupada a esa hora).
 * warnings: posible pero inusual; requiere que el admin confirme.
 */
export function scheduleConflicts(params: {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  date: string
  venueId: string
  startTime: string
  scheduled: ScheduledMatch[]
  slots: VenueSlot[]
  teamName: (id: string) => string
}) {
  const { matchId, homeTeamId, awayTeamId, date, venueId, startTime, scheduled, slots, teamName } = params
  const others = scheduled.filter((m) => m.id !== matchId && m.match_date === date)
  const blocking: string[] = []
  const warnings: string[] = []

  if (others.some((m) => m.venue_id === venueId && hhmm(m.start_time) === hhmm(startTime))) {
    blocking.push('Esa cancha ya tiene un partido programado en ese día y horario.')
  }

  for (const teamId of [homeTeamId, awayTeamId]) {
    if (others.some((m) => m.home_team_id === teamId || m.away_team_id === teamId)) {
      warnings.push(`${teamName(teamId)} ya tiene otro partido ese mismo día.`)
    }
  }

  const dow = dayOfWeek(date)
  const insideAvailability = slots.some(
    (s) => s.venue_id === venueId && s.day_of_week === dow && hhmm(s.start_time) === hhmm(startTime)
  )
  if (!insideAvailability) {
    warnings.push('Ese horario no está dentro de la disponibilidad registrada de la cancha.')
  }

  return { blocking, warnings }
}
