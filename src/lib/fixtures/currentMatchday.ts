/**
 * Jornada "actual": la primera que aún tiene partidos sin jugar. Si todas están
 * jugadas (torneo terminado), la última.
 */
export function currentMatchdayId(matchdays: { id: string; matches: { status: string }[] }[]) {
  const pending = matchdays.find((md) => md.matches.some((m) => m.status !== 'played'))
  return (pending ?? matchdays[matchdays.length - 1])?.id
}
