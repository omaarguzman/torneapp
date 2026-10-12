/**
 * Reglas de la liguilla (sin base de datos): qué rondas hay, quién se enfrenta
 * con quién, quién es local y quién avanza.
 *
 * Regla de cruces en TODAS las rondas: los equipos vivos se ordenan por su
 * lugar en la tabla general (seed 1 = primero) y juega el mejor contra el peor.
 */

export type Stage = 'repechaje' | 'octavos' | 'cuartos' | 'semifinal' | 'tercer_lugar' | 'final'

export const STAGE_ORDER: Stage[] = ['repechaje', 'octavos', 'cuartos', 'semifinal', 'tercer_lugar', 'final']

export const STAGE_LABEL: Record<Stage, string> = {
  repechaje: 'Repechaje',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinal',
  tercer_lugar: 'Tercer lugar',
  final: 'Final',
}

/** Nombre corto para pestañas e imágenes. */
export const STAGE_SHORT: Record<Stage, string> = {
  repechaje: 'Repechaje',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semifinal: 'Semis',
  tercer_lugar: '3er lugar',
  final: 'Final',
}

export const isStage = (s: string | null | undefined): s is Stage => !!s && (STAGE_ORDER as string[]).includes(s)

/** "J5", o "Cuartos · ida" para las jornadas de liguilla. */
export function matchdayLabel(md: { number: number; stage?: string | null; playoff_leg?: number | null }, long = false) {
  if (!isStage(md.stage)) return long ? `Jornada ${md.number}` : `J${md.number}`
  const name = long ? STAGE_LABEL[md.stage] : STAGE_SHORT[md.stage]
  return md.playoff_leg ? `${name} · ${md.playoff_leg === 1 ? 'ida' : 'vuelta'}` : name
}

/** Ronda en la que entran N equipos a la fase final. */
export function stageForSize(size: number): Stage {
  if (size >= 16) return 'octavos'
  if (size >= 8) return 'cuartos'
  if (size >= 4) return 'semifinal'
  return 'final'
}

export type PlayoffConfig = {
  qualifiers: number
  direct: number
  legs: Partial<Record<Stage, 1 | 2>>
  tiebreak: 'seed' | 'penalties'
}

/** Rondas que se jugarán con esta configuración (sin el tercer lugar, que es opcional). */
export function stagesFor(cfg: Pick<PlayoffConfig, 'qualifiers' | 'direct'>): Stage[] {
  const stages: Stage[] = []
  if (cfg.direct < cfg.qualifiers) stages.push('repechaje')
  for (let size = cfg.qualifiers; size >= 2; size /= 2) stages.push(stageForSize(size))
  return stages
}

/** Configuraciones válidas para N equipos: clasificados (4, 8, 16) y cuántos pasan directo. */
export function playoffOptions(teamCount: number) {
  return [4, 8, 16]
    .filter((q) => q <= teamCount)
    .map((q) => {
      // Repechaje: 2·(q − d) equipos juegan por (q − d) lugares → hacen falta 2q − d equipos
      const directs: number[] = []
      for (let d = q; d >= Math.max(0, 2 * q - teamCount); d--) directs.push(d)
      return { qualifiers: q, directs }
    })
}

export type TieSeed = { teamId: string; seed: number }
export type TiePlan = { position: number; high: TieSeed; low: TieSeed }

/** Mejor contra peor: 1 vs N, 2 vs N−1… */
export function pairBestWorst(teams: TieSeed[]): TiePlan[] {
  const sorted = [...teams].sort((a, b) => a.seed - b.seed)
  const ties: TiePlan[] = []
  for (let i = 0; i < sorted.length / 2; i++) {
    ties.push({ position: i + 1, high: sorted[i], low: sorted[sorted.length - 1 - i] })
  }
  return ties
}

/** Primera ronda a partir de la tabla general (seeds ya ordenados 1..N). */
export function firstRound(seeds: TieSeed[], cfg: Pick<PlayoffConfig, 'qualifiers' | 'direct'>): { stage: Stage; ties: TiePlan[] } {
  const bySeed = [...seeds].sort((a, b) => a.seed - b.seed)
  if (cfg.direct < cfg.qualifiers) {
    const playIn = bySeed.slice(cfg.direct, 2 * cfg.qualifiers - cfg.direct)
    return { stage: 'repechaje', ties: pairBestWorst(playIn) }
  }
  return { stage: stageForSize(cfg.qualifiers), ties: pairBestWorst(bySeed.slice(0, cfg.qualifiers)) }
}

/**
 * Siguiente ronda. Después del repechaje se juntan los que pasaron directo con
 * los ganadores; en las demás, solo los ganadores. Siempre se reacomodan por seed.
 */
export function nextRound(
  done: Stage,
  winners: TieSeed[],
  seeds: TieSeed[],
  cfg: Pick<PlayoffConfig, 'qualifiers' | 'direct'>
): { stage: Stage; ties: TiePlan[] } | null {
  if (done === 'final' || done === 'tercer_lugar') return null
  const alive =
    done === 'repechaje' ? [...[...seeds].sort((a, b) => a.seed - b.seed).slice(0, cfg.direct), ...winners] : winners
  if (alive.length < 2) return null
  return { stage: stageForSize(alive.length), ties: pairBestWorst(alive) }
}

/** Local de cada partido: en partido único, el mejor posicionado; en ida y vuelta, el mejor cierra en casa. */
export function homeAway(tie: TiePlan, leg: number, legs: number) {
  const highHome = legs === 1 || leg === 2
  return highHome ? { home: tie.high.teamId, away: tie.low.teamId } : { home: tie.low.teamId, away: tie.high.teamId }
}

export type LegResult = {
  homeTeamId: string
  awayTeamId: string
  scoreHome: number | null
  scoreAway: number | null
  penaltiesHome: number | null
  penaltiesAway: number | null
  /** Jugado y con cédula validada */
  final: boolean
  leg: number
}

export type TieOutcome =
  | { status: 'pending' }
  | { status: 'decided'; winner: string; loser: string; aggregate: [number, number]; by: 'goals' | 'seed' | 'penalties' }
  | { status: 'needs_penalties'; aggregate: [number, number] }

/**
 * ¿Quién avanza? Marcador global (suma de los partidos); si empata, el mejor
 * posicionado o los penales del último partido, según la regla del torneo.
 * `aggregate` va del lado del mejor posicionado: [goles high, goles low].
 */
export function tieOutcome(tie: TiePlan, legs: number, results: LegResult[], tiebreak: 'seed' | 'penalties'): TieOutcome {
  const done = results.filter((r) => r.final && r.scoreHome !== null && r.scoreAway !== null)
  if (done.length < legs) return { status: 'pending' }

  let high = 0
  let low = 0
  for (const r of done) {
    high += r.homeTeamId === tie.high.teamId ? r.scoreHome! : r.scoreAway!
    low += r.homeTeamId === tie.high.teamId ? r.scoreAway! : r.scoreHome!
  }
  const aggregate: [number, number] = [high, low]
  const decided = (winner: string, by: 'goals' | 'seed' | 'penalties') => ({
    status: 'decided' as const,
    winner,
    loser: winner === tie.high.teamId ? tie.low.teamId : tie.high.teamId,
    aggregate,
    by,
  })

  if (high !== low) return decided(high > low ? tie.high.teamId : tie.low.teamId, 'goals')
  if (tiebreak === 'seed') return decided(tie.high.teamId, 'seed')

  const last = [...done].sort((a, b) => b.leg - a.leg)[0]
  if (last.penaltiesHome === null || last.penaltiesAway === null || last.penaltiesHome === last.penaltiesAway) {
    return { status: 'needs_penalties', aggregate }
  }
  const homeWins = last.penaltiesHome > last.penaltiesAway
  return decided(homeWins ? last.homeTeamId : last.awayTeamId, 'penalties')
}
