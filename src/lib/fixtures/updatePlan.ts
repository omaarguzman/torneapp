import type { Pairing } from './roundRobin'
import { scheduleFixtures, shuffle, type SlotTemplate } from './scheduler'

/** Cruce que falta jugar. `home` viene fijo cuando es la vuelta de un partido ya existente. */
type PendingPair = { a: string; b: string; home?: string }

export type ExistingMatch = { home: string; away: string }

export type PlannedMatch = {
  round: number
  homeTeamId: string
  awayTeamId: string
  venueId: string
  date: string
  startTime: string
  endTime: string
}

export type UpdatePlanResult = {
  matchdays: { number: number; weekStart: string }[]
  matches: PlannedMatch[]
  leftovers: Pairing[]
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/**
 * Cruces que faltan para completar el todos contra todos (o ida y vuelta)
 * entre los equipos actuales, descontando los que ya existen (`covered`).
 */
export function missingPairs(teamIds: string[], covered: ExistingMatch[], doubleRound: boolean): PendingPair[] {
  const byPair = new Map<string, ExistingMatch[]>()
  covered.forEach((m) => {
    const key = pairKey(m.home, m.away)
    if (!byPair.has(key)) byPair.set(key, [])
    byPair.get(key)!.push(m)
  })

  const result: PendingPair[] = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const a = teamIds[i]
      const b = teamIds[j]
      const existing = byPair.get(pairKey(a, b)) ?? []

      if (!doubleRound) {
        if (existing.length === 0) result.push({ a, b })
        continue
      }

      if (existing.length === 0) {
        result.push({ a, b, home: a }, { a, b, home: b })
      } else if (existing.length === 1) {
        // Falta la vuelta: local el que fue visitante en la ida
        result.push({ a, b, home: existing[0].away })
      }
    }
  }
  return result
}

/**
 * Reparte los cruces faltantes en `roundsCount` jornadas (cada equipo juega
 * máximo una vez por jornada y no más de `maxPerRound` partidos por jornada).
 * Prueba varias veces con desempates al azar y se queda con el reparto que
 * deja menos cruces fuera.
 */
function buildRound(remaining: PendingPair[], previous: Set<string>, maxPerRound: number) {
  const degree = new Map<string, number>()
  remaining.forEach((p) => {
    degree.set(p.a, (degree.get(p.a) ?? 0) + 1)
    degree.set(p.b, (degree.get(p.b) ?? 0) + 1)
  })

  // Primero los equipos con más partidos pendientes: son los que más urge acomodar
  const teams = shuffle([...degree.keys()]).sort((x, y) => degree.get(y)! - degree.get(x)!)
  const busy = new Set<string>()
  const round: PendingPair[] = []

  for (const team of teams) {
    if (round.length >= maxPerRound) break
    if (busy.has(team)) continue

    const options = shuffle(
      remaining.filter((p) => {
        const other = p.a === team ? p.b : p.b === team ? p.a : null
        return other !== null && !busy.has(other)
      })
    )
    if (options.length === 0) continue

    // Evita repetir el mismo cruce en jornadas seguidas (ida y vuelta pegadas)
    const ranked = options.sort((x, y) => {
      const xRepeat = previous.has(pairKey(x.a, x.b)) ? 1 : 0
      const yRepeat = previous.has(pairKey(y.a, y.b)) ? 1 : 0
      if (xRepeat !== yRepeat) return xRepeat - yRepeat
      const xOther = x.a === team ? x.b : x.a
      const yOther = y.a === team ? y.b : y.a
      return degree.get(yOther)! - degree.get(xOther)!
    })
    const chosen = ranked[0]
    round.push(chosen)
    busy.add(chosen.a)
    busy.add(chosen.b)
  }

  // Puntaje: más partidos primero; a igualdad, que jueguen los que más pendientes tienen
  const score = round.length * 1e6 + round.reduce((s, p) => s + degree.get(p.a)! ** 2 + degree.get(p.b)! ** 2, 0)
  return { round, score }
}

/**
 * Un equipo no puede jugar más partidos que jornadas hay. Si a alguno le
 * sobran, se apartan para Pendientes de antemano, eligiendo cruces que
 * alivien a los dos equipos a la vez (ej. los equipos nuevos entre sí).
 */
function setAsideExcess(pairs: PendingPair[], roundsCount: number) {
  let kept = shuffle(pairs)
  const aside: PendingPair[] = []

  for (;;) {
    const degree = new Map<string, number>()
    kept.forEach((p) => {
      degree.set(p.a, (degree.get(p.a) ?? 0) + 1)
      degree.set(p.b, (degree.get(p.b) ?? 0) + 1)
    })
    const team = [...degree.keys()]
      .filter((t) => degree.get(t)! > roundsCount)
      .sort((x, y) => degree.get(y)! - degree.get(x)!)[0]
    if (!team) break

    // El rival con más partidos pendientes: así el cruce apartado ayuda a ambos
    const partner = (p: PendingPair) => (p.a === team ? p.b : p.a)
    const chosen = kept
      .filter((p) => p.a === team || p.b === team)
      .sort((x, y) => degree.get(partner(y))! - degree.get(partner(x))!)[0]
    aside.push(chosen)
    kept = kept.filter((p) => p !== chosen)
  }

  return { kept, aside }
}

function fillRounds(allPairs: PendingPair[], roundsCount: number, maxPerRound: number) {
  let best: { rounds: PendingPair[][]; leftovers: PendingPair[] } | null = null

  for (let attempt = 0; attempt < 40; attempt++) {
    const { kept, aside } = setAsideExcess(allPairs, roundsCount)
    let remaining = kept
    const rounds: PendingPair[][] = []

    for (let r = 0; r < roundsCount; r++) {
      const previous = new Set((rounds[r - 1] ?? []).map((p) => pairKey(p.a, p.b)))

      // Varias propuestas de jornada; se queda la mejor
      let bestRound = buildRound(remaining, previous, maxPerRound)
      for (let t = 0; t < 40; t++) {
        const candidate = buildRound(remaining, previous, maxPerRound)
        if (candidate.score > bestRound.score) bestRound = candidate
      }

      const chosen = new Set(bestRound.round)
      remaining = remaining.filter((p) => !chosen.has(p))
      rounds.push(bestRound.round)
    }

    const leftovers = [...aside, ...remaining]
    if (!best || leftovers.length < best.leftovers.length) {
      best = { rounds, leftovers }
      if (remaining.length === 0) break
    }
  }

  return best ?? { rounds: [], leftovers: allPairs }
}

/** Decide local/visitante de los cruces sin local fijo, equilibrando cuántas veces es local cada equipo. */
function orient(pair: PendingPair, homeCounts: Map<string, number>): Pairing {
  let home = pair.home
  if (!home) {
    const ca = homeCounts.get(pair.a) ?? 0
    const cb = homeCounts.get(pair.b) ?? 0
    home = ca < cb ? pair.a : cb < ca ? pair.b : Math.random() < 0.5 ? pair.a : pair.b
  }
  homeCounts.set(home, (homeCounts.get(home) ?? 0) + 1)
  return home === pair.a ? { home: pair.a, away: pair.b } : { home: pair.b, away: pair.a }
}

/**
 * Re-planea las jornadas futuras: reparte los cruces faltantes en
 * `roundsCount` jornadas a partir de `startDate` y asigna cancha/día/hora con
 * el mismo planificador del fixture original. Lo que no cabe (por equipos,
 * horarios o choques de preferencias pagadas) queda en `leftovers`.
 */
export function buildUpdatePlan({
  pairs,
  roundsCount,
  slotTemplates,
  priorities,
  startDate,
  homeCounts,
}: {
  pairs: PendingPair[]
  roundsCount: number
  slotTemplates: SlotTemplate[]
  priorities: Map<string, SlotTemplate>
  startDate: string
  homeCounts: Map<string, number>
}): UpdatePlanResult {
  const filled = fillRounds(pairs, roundsCount, slotTemplates.length)
  const counts = new Map(homeCounts)
  const rounds: Pairing[][] = filled.rounds.map((round) => round.map((p) => orient(p, counts)))
  const leftovers: Pairing[] = filled.leftovers.map((p) => orient(p, counts))

  // Quitar jornadas vacías al final (no tiene caso alargar el torneo con semanas sin partidos)
  while (rounds.length > 0 && rounds[rounds.length - 1].length === 0) rounds.pop()

  // Si el planificador rechaza algún partido (choque de preferencias o falta de
  // horarios), ese partido pasa a pendientes y se vuelve a intentar.
  for (let guard = 0; guard < 1000; guard++) {
    const result = scheduleFixtures({ rounds, slotTemplates, priorities, startDate })
    if (result.ok) {
      return { matchdays: result.matchdays, matches: result.matches, leftovers }
    }

    const roundIdx = (result.reason === 'conflict' ? result.conflicts[0].round : result.round) - 1
    const round = rounds[roundIdx]
    let removeIdx = round.length - 1
    if (result.reason === 'conflict') {
      const team = result.conflicts[0].teamA
      removeIdx = round.findIndex((m) => m.home === team || m.away === team)
    }
    if (removeIdx < 0) removeIdx = round.length - 1
    leftovers.push(...round.splice(removeIdx, 1))
  }

  // No debería llegar aquí: todo queda como pendiente para no perder cruces
  return { matchdays: [], matches: [], leftovers: [...rounds.flat(), ...leftovers] }
}
