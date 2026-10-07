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
