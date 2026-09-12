import type { Pairing } from './roundRobin'

export type SlotTemplate = {
  venueId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type ScheduledMatch = {
  round: number
  homeTeamId: string
  awayTeamId: string
  venueId: string
  date: string
  startTime: string
  endTime: string
}

export type ConflictReport = {
  type: 'head_to_head' | 'same_slot_claim'
  round: number
  teamA: string
  teamB: string
}

export type SchedulerResult =
  | { ok: true; matchdays: { number: number; weekStart: string }[]; matches: ScheduledMatch[] }
  | { ok: false; reason: 'conflict'; conflicts: ConflictReport[] }
  | { ok: false; reason: 'insufficient_slots'; round: number; needed: number; available: number }

function slotKey(s: SlotTemplate) {
  return `${s.venueId}|${s.dayOfWeek}|${s.startTime}`
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function dateForDayOfWeek(weekStart: Date, dayOfWeek: number) {
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i)
    if (d.getUTCDay() === dayOfWeek) return d
  }
  throw new Error('No se encontró una fecha para ese día de la semana (esto no debería pasar).')
}

function markUsed(map: Map<string, Set<string>>, teamId: string, key: string) {
  if (!map.has(teamId)) map.set(teamId, new Set())
  map.get(teamId)!.add(key)
}

/**
 * Detecta, para cada jornada, si dos equipos con preferencia pagada
 * chocan entre sí (juegan uno contra el otro con horarios distintos)
 * o si ambos reclaman exactamente el mismo horario reservado al mismo tiempo.
 */
function findPriorityConflicts(rounds: Pairing[][], priorities: Map<string, SlotTemplate>): ConflictReport[] {
  const conflicts: ConflictReport[] = []

  rounds.forEach((round, idx) => {
    const roundNum = idx + 1

    round.forEach((match) => {
      const homeSlot = priorities.get(match.home)
      const awaySlot = priorities.get(match.away)
      if (homeSlot && awaySlot && slotKey(homeSlot) !== slotKey(awaySlot)) {
        conflicts.push({ type: 'head_to_head', round: roundNum, teamA: match.home, teamB: match.away })
      }
    })

    const claimsBySlot = new Map<string, string[]>()
    round.forEach((match) => {
      for (const teamId of [match.home, match.away]) {
        const slot = priorities.get(teamId)
        if (slot) {
          const key = slotKey(slot)
          const list = claimsBySlot.get(key) ?? []
          if (!list.includes(teamId)) list.push(teamId)
          claimsBySlot.set(key, list)
        }
      }
    })

    claimsBySlot.forEach((teamIds) => {
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          const faceToFace = round.some(
            (m) =>
              (m.home === teamIds[i] && m.away === teamIds[j]) ||
              (m.home === teamIds[j] && m.away === teamIds[i])
          )
          if (!faceToFace) {
            conflicts.push({ type: 'same_slot_claim', round: roundNum, teamA: teamIds[i], teamB: teamIds[j] })
          }
        }
      }
    })
  })

  return conflicts
}

/**
 * Asigna cancha/día/hora a cada partido de cada jornada.
 *
 * Cada jornada ocupa una semana completa del calendario. Dentro de esa
 * semana, todos los horarios configurados en todas las canchas forman
 * la "bolsa" disponible. Los equipos con preferencia pagada reciben
 * primero su horario fijo; el resto se reparte buscando que ningún
 * equipo repita cancha/día/hora si es posible.
 */
export function scheduleFixtures({
  rounds,
  slotTemplates,
  priorities,
  startDate,
}: {
  rounds: Pairing[][]
  slotTemplates: SlotTemplate[]
  priorities: Map<string, SlotTemplate>
  startDate: string
}): SchedulerResult {
  const conflicts = findPriorityConflicts(rounds, priorities)
  if (conflicts.length > 0) {
    return { ok: false, reason: 'conflict', conflicts }
  }

  const usedByTeam = new Map<string, Set<string>>()
  const matchdays: { number: number; weekStart: string }[] = []
  const matches: ScheduledMatch[] = []
  const tournamentStart = new Date(startDate + 'T00:00:00Z')

  for (let idx = 0; idx < rounds.length; idx++) {
    const roundNum = idx + 1
    const weekStart = addDays(tournamentStart, idx * 7)
    matchdays.push({ number: roundNum, weekStart: toISODate(weekStart) })

    const pool = slotTemplates.map((t) => ({
      template: t,
      date: toISODate(dateForDayOfWeek(weekStart, t.dayOfWeek)),
    }))

    const round = rounds[idx]
    const priorityMatches = round.filter((m) => priorities.has(m.home) || priorities.has(m.away))
    const regularMatches = round.filter((m) => !priorities.has(m.home) && !priorities.has(m.away))

    const usedInstanceKeys = new Set<string>()

    for (const match of priorityMatches) {
      const slot = priorities.get(match.home) ?? priorities.get(match.away)!
      const instance = pool.find((p) => slotKey(p.template) === slotKey(slot))

      if (!instance) {
        return { ok: false, reason: 'insufficient_slots', round: roundNum, needed: round.length, available: pool.length }
      }

      usedInstanceKeys.add(`${instance.template.venueId}|${instance.date}|${instance.template.startTime}`)

      matches.push({
        round: roundNum,
        homeTeamId: match.home,
        awayTeamId: match.away,
        venueId: instance.template.venueId,
        date: instance.date,
        startTime: instance.template.startTime,
        endTime: instance.template.endTime,
      })

      markUsed(usedByTeam, match.home, slotKey(slot))
      markUsed(usedByTeam, match.away, slotKey(slot))
    }

    const remainingPool = pool.filter(
      (p) => !usedInstanceKeys.has(`${p.template.venueId}|${p.date}|${p.template.startTime}`)
    )

    if (remainingPool.length < regularMatches.length) {
      return {
        ok: false,
        reason: 'insufficient_slots',
        round: roundNum,
        needed: regularMatches.length,
        available: remainingPool.length,
      }
    }

    for (const match of regularMatches) {
      const homeUsed = usedByTeam.get(match.home) ?? new Set<string>()
      const awayUsed = usedByTeam.get(match.away) ?? new Set<string>()

      let chosenIdx = remainingPool.findIndex((p) => {
        const key = slotKey(p.template)
        return !homeUsed.has(key) && !awayUsed.has(key)
      })
      if (chosenIdx === -1) chosenIdx = 0

      const instance = remainingPool[chosenIdx]
      remainingPool.splice(chosenIdx, 1)

      matches.push({
        round: roundNum,
        homeTeamId: match.home,
        awayTeamId: match.away,
        venueId: instance.template.venueId,
        date: instance.date,
        startTime: instance.template.startTime,
        endTime: instance.template.endTime,
      })

      markUsed(usedByTeam, match.home, slotKey(instance.template))
      markUsed(usedByTeam, match.away, slotKey(instance.template))
    }
  }

  return { ok: true, matchdays, matches }
}
