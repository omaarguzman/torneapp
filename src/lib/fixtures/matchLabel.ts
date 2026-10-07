/** "sábado 12 de octubre · 10:00 · Cancha 1", o la marca de aplazado si aún no tiene fecha. */
export function matchScheduleLabel(match: {
  status: string
  match_date: string | null
  start_time: string | null
  venue_name: string | null
}) {
  if (match.status === 'pending' || !match.match_date) return '⏸ Aplazado · por programar'
  const dateLabel = new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return [dateLabel, match.start_time?.slice(0, 5), match.venue_name].filter(Boolean).join(' · ')
}

/** "Pumas FC no se presentó" / "Ninguno de los dos equipos se presentó" */
export function walkoverLabel(walkover: string, home: string, away: string) {
  return walkover === 'both'
    ? 'Ninguno de los dos equipos se presentó'
    : `${walkover === 'home' ? home : away} no se presentó`
}

/** Foto de la programación de un partido, como la guardan el historial y los avisos. */
export type ScheduleSnapshot = {
  date: string | null
  time: string | null
  venue: string | null
  matchday: number | null
  status: string
} | null

/** "J4 · sáb 12 oct · 10:00 · Cancha 1", o "Pendientes" si no tiene fecha. */
export function describeSnapshot(s: ScheduleSnapshot) {
  if (!s || s.status === 'pending' || !s.date) return 'Pendientes'
  const date = new Date(s.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
  return [s.matchday ? `J${s.matchday}` : null, date, s.time?.slice(0, 5), s.venue].filter(Boolean).join(' · ')
}

export const changeKindLabels: Record<string, string> = {
  postponed: '⏸ Aplazado',
  scheduled: '📅 Programado',
  moved: '✏️ Movido',
}
