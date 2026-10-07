/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de México. */
export function todayInMexico() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

/** ¿El delegado todavía puede registrar jugadores? Sin fecha límite, siempre. El día límite cuenta completo. */
export function registrationOpen(deadline: string | null | undefined) {
  return !deadline || todayInMexico() <= deadline
}

export function deadlineLabel(deadline: string) {
  return new Date(deadline + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}
