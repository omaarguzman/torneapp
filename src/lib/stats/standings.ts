export type TeamStat = {
  teamId: string
  teamName: string
  logoUrl: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

type MatchResult = {
  homeTeamId: string
  awayTeamId: string
  scoreHome: number
  scoreAway: number
}

/**
 * Calcula la tabla de posiciones con el sistema estándar (3/1/0) y
 * desempata en este orden: diferencia de goles, goles a favor, y
 * enfrentamiento directo entre los equipos empatados (mini-tabla
 * usando solo los partidos que jugaron entre sí).
 */
export function computeStandings(
  teams: { id: string; name: string; logo_url: string | null }[],
  matches: MatchResult[]
): TeamStat[] {
  const stats = new Map<string, TeamStat>()

  teams.forEach((t) => {
    stats.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      logoUrl: t.logo_url,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    })
  })

  for (const m of matches) {
    const home = stats.get(m.homeTeamId)
    const away = stats.get(m.awayTeamId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += m.scoreHome
    home.goalsAgainst += m.scoreAway
    away.goalsFor += m.scoreAway
    away.goalsAgainst += m.scoreHome

    if (m.scoreHome > m.scoreAway) {
      home.won++
      home.points += 3
      away.lost++
    } else if (m.scoreHome < m.scoreAway) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }
  }

  stats.forEach((s) => {
    s.goalDiff = s.goalsFor - s.goalsAgainst
  })

  const list = Array.from(stats.values())

  function headToHead(teamId: string, opponentIds: Set<string>) {
    let points = 0
    let gf = 0
    let ga = 0
    for (const m of matches) {
      if (m.homeTeamId === teamId && opponentIds.has(m.awayTeamId)) {
        gf += m.scoreHome
        ga += m.scoreAway
        points += m.scoreHome > m.scoreAway ? 3 : m.scoreHome === m.scoreAway ? 1 : 0
      } else if (m.awayTeamId === teamId && opponentIds.has(m.homeTeamId)) {
        gf += m.scoreAway
        ga += m.scoreHome
        points += m.scoreAway > m.scoreHome ? 3 : m.scoreHome === m.scoreAway ? 1 : 0
      }
    }
    return { points, goalDiff: gf - ga }
  }

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName)
  })

  let i = 0
  while (i < list.length) {
    let j = i + 1
    while (
      j < list.length &&
      list[j].points === list[i].points &&
      list[j].goalDiff === list[i].goalDiff &&
      list[j].goalsFor === list[i].goalsFor
    ) {
      j++
    }

    if (j - i > 1) {
      const group = list.slice(i, j)
      const groupIds = new Set(group.map((t) => t.teamId))
      const ranked = group
        .map((team) => ({
          team,
          h2h: headToHead(team.teamId, new Set([...groupIds].filter((id) => id !== team.teamId))),
        }))
        .sort((a, b) => {
          if (b.h2h.points !== a.h2h.points) return b.h2h.points - a.h2h.points
          if (b.h2h.goalDiff !== a.h2h.goalDiff) return b.h2h.goalDiff - a.h2h.goalDiff
          return a.team.teamName.localeCompare(b.team.teamName)
        })

      for (let k = 0; k < ranked.length; k++) {
        list[i + k] = ranked[k].team
      }
    }

    i = j
  }

  return list
}
