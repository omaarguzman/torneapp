import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { buildRolArt } from '@/lib/rol/buildArt'
import { getFonts, loadLogo } from '@/lib/rol/assets'
import { RolImage, rolHeight, WIDTH, type RolData, type RolDateGroup } from '@/lib/rol/RolImage'
import { autoTheme, THEMES, type ThemeKey } from '@/lib/rol/themes'

type ImageData = {
  tournament: { name: string; logo_url: string | null }
  matchday: { number: number; week_start: string; image_note: string | null }
  matches: {
    home_team_id: string
    away_team_id: string
    match_date: string
    start_time: string
    venue_name: string | null
  }[]
  teams: { id: string; name: string; logo_url: string | null }[]
  postponed_team_ids: string[]
}

/**
 * Imagen oficial del rol de juegos de una jornada (PNG). La puede pedir el
 * admin del torneo o un delegado con acceso; la base de datos lo valida.
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchdayId: string }> }) {
  const { matchdayId } = await params
  const supabase = await createClient()

  const { data: raw, error } = await supabase.rpc('get_matchday_image_data', { p_matchday_id: matchdayId })
  if (error || !raw) {
    return new Response('No tienes acceso a esta jornada.', { status: 404 })
  }
  const data = raw as ImageData

  // Logos convertidos a PNG (una sola descarga por equipo)
  const teamById = new Map(data.teams.map((t) => [t.id, t]))
  const usedIds = new Set(data.matches.flatMap((m) => [m.home_team_id, m.away_team_id]))
  const restingTeams = data.teams.filter((t) => !usedIds.has(t.id) && !data.postponed_team_ids.includes(t.id))
  const logoIds = [...usedIds, ...restingTeams.map((t) => t.id)]
  const [logos, tournamentLogo, fonts] = await Promise.all([
    Promise.all(logoIds.map(async (id) => [id, await loadLogo(teamById.get(id)?.logo_url ?? null)] as const)),
    loadLogo(data.tournament.logo_url, 260),
    getFonts(),
  ])
  const logoById = new Map(logos)

  // Agrupar por día y, dentro de cada día, por cancha
  const sorted = [...data.matches].sort((a, b) => `${a.match_date}${a.start_time}`.localeCompare(`${b.match_date}${b.start_time}`))
  const groups: RolDateGroup[] = []
  for (const m of sorted) {
    let group = groups.find((g) => g.date === m.match_date)
    if (!group) groups.push((group = { date: m.match_date, venues: [] }))
    const venueName = m.venue_name ?? 'Cancha'
    let venue = group.venues.find((v) => v.name === venueName)
    if (!venue) group.venues.push((venue = { name: venueName, matches: [] }))
    venue.matches.push({
      homeName: teamById.get(m.home_team_id)?.name ?? '—',
      awayName: teamById.get(m.away_team_id)?.name ?? '—',
      homeLogo: logoById.get(m.home_team_id) ?? null,
      awayLogo: logoById.get(m.away_team_id) ?? null,
      time: m.start_time.slice(0, 5).replace(/^0/, ''),
    })
  }
  groups.forEach((g) => g.venues.sort((a, b) => a.name.localeCompare(b.name, 'es')))

  const rol: RolData = {
    tournamentName: data.tournament.name,
    tournamentLogo,
    matchdayNumber: data.matchday.number,
    groups,
    resting: restingTeams.map((t) => ({ name: t.name, logo: logoById.get(t.id) ?? null })),
    note: data.matchday.image_note?.trim() || null,
  }

  const requested = new URL(request.url).searchParams.get('tema') as ThemeKey | 'auto' | null
  const themeKey = requested && requested in THEMES ? (requested as ThemeKey) : autoTheme(groups[0]?.date ?? data.matchday.week_start)
  const theme = THEMES[themeKey]
  const height = rolHeight(rol, theme)

  const download = new URL(request.url).searchParams.get('descargar') === '1'
  const filename = `rol-jornada-${data.matchday.number}.png`

  return new ImageResponse(<RolImage data={rol} theme={theme} height={height} art={await buildRolArt(theme, height)} />, {
    width: WIDTH,
    height,
    fonts: fonts.length > 0 ? fonts : undefined,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    },
  })
}
