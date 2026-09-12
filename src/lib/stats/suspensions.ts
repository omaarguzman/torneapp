export type SuspensionReason = 'yellow_accumulation' | 'red_card' | 'double_yellow'

export type SuspendedEntry = {
  matchId: string
  playerId: string
  teamId: string
  reason: SuspensionReason
}

type MatchRow = {
  id: string
  homeTeamId: string
  awayTeamId: string
  matchDate: string
  startTime: string
  status: string
}

type EventRow = {
  matchId: string
  playerId: string
  type: 'goal' | 'yellow_card' | 'red_card'
}

/**
 * Recalcula, desde cero, qué jugadores están suspendidos en cada partido.
 *
 * Reglas:
 * - Una expulsión (roja directa o doble amarilla en el mismo partido) genera
 *   la cantidad de partidos de suspensión configurada por el torneo, y
 *   reinicia el contador de amarillas acumuladas (ya se sancionó por la vía
 *   más grave, no se vuelve a contar para la acumulación).
 * - Si el torneo tiene un umbral de amarillas acumuladas, cada amarilla
 *   "simple" (sin expulsión ese partido) suma al contador; al llegar al
 *   umbral se genera 1 partido de suspensión y el contador vuelve a 0.
 * - El conteo total de tarjetas para estadísticas NO se toca aquí — este
 *   cálculo es solo para saber quién no puede jugar el siguiente partido.
 */
export function computeSuspensions({
  matches,
  events,
  rosterByTeam,
  yellowThreshold,
  redSuspensionMatches,
}: {
  matches: MatchRow[]
  events: EventRow[]
  rosterByTeam: Map<string, string[]>
  yellowThreshold: number | null
  redSuspensionMatches: number
}): SuspendedEntry[] {
  const sortedMatches = [...matches].sort((a, b) => (a.matchDate + a.startTime).localeCompare(b.matchDate + b.startTime))

  const eventsByMatch = new Map<string, EventRow[]>()
  events.forEach((e) => {
    if (!eventsByMatch.has(e.matchId)) eventsByMatch.set(e.matchId, [])
    eventsByMatch.get(e.matchId)!.push(e)
  })

  const teamMatches = new Map<string, MatchRow[]>()
  sortedMatches.forEach((m) => {
    ;[m.homeTeamId, m.awayTeamId].forEach((teamId) => {
      if (!teamMatches.has(teamId)) teamMatches.set(teamId, [])
      teamMatches.get(teamId)!.push(m)
    })
  })

  const result: SuspendedEntry[] = []

  rosterByTeam.forEach((playerIds, teamId) => {
    const teamMatchList = teamMatches.get(teamId) ?? []

    playerIds.forEach((playerId) => {
      let yellowsSinceReset = 0
      const pendingQueue: SuspensionReason[] = []

      for (const match of teamMatchList) {
        if (pendingQueue.length > 0) {
          const reason = pendingQueue.shift()!
          result.push({ matchId: match.id, playerId, teamId, reason })
          continue
        }

        if (match.status !== 'played') continue

        const matchEvents = (eventsByMatch.get(match.id) ?? []).filter((e) => e.playerId === playerId)
        const reds = matchEvents.filter((e) => e.type === 'red_card').length
        const yellows = matchEvents.filter((e) => e.type === 'yellow_card').length
        const doubleYellow = yellows >= 2

        if (reds >= 1 || doubleYellow) {
          for (let i = 0; i < redSuspensionMatches; i++) {
            pendingQueue.push(doubleYellow && reds === 0 ? 'double_yellow' : 'red_card')
          }
          yellowsSinceReset = 0
        } else if (yellows === 1 && yellowThreshold) {
          yellowsSinceReset++
          if (yellowsSinceReset >= yellowThreshold) {
            pendingQueue.push('yellow_accumulation')
            yellowsSinceReset = 0
          }
        }
      }
    })
  })

  return result
}
