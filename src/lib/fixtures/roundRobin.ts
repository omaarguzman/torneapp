export type Pairing = { home: string; away: string }

const BYE = '__BYE__'

/**
 * Genera los cruces de todas las jornadas usando el método del círculo,
 * el algoritmo estándar para torneos de todos contra todos.
 * Si el número de equipos es impar, se agrega un descanso (BYE) rotativo.
 */
export function generateRoundRobinRounds(teamIds: string[], doubleRound: boolean): Pairing[][] {
  const ids = [...teamIds]
  if (ids.length % 2 !== 0) ids.push(BYE)

  const n = ids.length
  const rounds: Pairing[][] = []
  const arr = [...ids]

  for (let r = 0; r < n - 1; r++) {
    const roundPairings: Pairing[] = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a !== BYE && b !== BYE) {
        roundPairings.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a })
      }
    }
    rounds.push(roundPairings)

    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop() as string)
    arr.splice(0, arr.length, fixed, ...rest)
  }

  if (doubleRound) {
    const secondLeg = rounds.map((round) => round.map((p) => ({ home: p.away, away: p.home })))
    return [...rounds, ...secondLeg]
  }

  return rounds
}
