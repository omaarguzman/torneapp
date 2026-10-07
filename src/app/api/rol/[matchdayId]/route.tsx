import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getFonts, loadLogo, loadTemplateBackground, rasterize } from '@/lib/rol/assets'
import { BALL_SVG, brushSvg, shieldSvg } from '@/lib/rol/art'
import { RolImage, WIDTH, HEIGHT, type RolData, type RolDateGroup } from '@/lib/rol/RolImage'
import { autoTemplate, builtinByKey, CUSTOM_LAYOUT, type TemplateLayout } from '@/lib/rol/templates'

type ImageData = {
  is_admin: boolean
  tournament: { name: string; logo_url: string | null; rol_template: string }
  matchday: { number: number; week_start: string; image_note: string | null; rol_template: string | null }
  matches: {
    home_team_id: string
    away_team_id: string
    match_date: string
    start_time: string
    venue_name: string | null
  }[]
  teams: { id: string; name: string; logo_url: string | null }[]
  postponed_team_ids: string[]
  custom_templates: { id: string; name: string; image_url: string }[]
}

/**
 * Imagen oficial del rol de una jornada (PNG) sobre la plantilla elegida por
 * el admin. Solo el admin puede pedir otra plantilla (?plantilla=) para
 * previsualizarla; a los delegados siempre se les da la que él estableció.
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchdayId: string }> }) {
  const { matchdayId } = await params
  const url = new URL(request.url)
  const supabase = await createClient()

  const { data: raw, error } = await supabase.rpc('get_matchday_image_data', { p_matchday_id: matchdayId })
  if (error || !raw) {
    return new Response('No tienes acceso a esta jornada.', { status: 404 })
  }
  const data = raw as ImageData

  // Agrupar por día y, dentro de cada día, por cancha
  const teamById = new Map(data.teams.map((t) => [t.id, t]))
  const usedIds = new Set(data.matches.flatMap((m) => [m.home_team_id, m.away_team_id]))
  const restingTeams = data.teams.filter((t) => !usedIds.has(t.id) && !data.postponed_team_ids.includes(t.id))
  const sorted = [...data.matches].sort((a, b) => `${a.match_date}${a.start_time}`.localeCompare(`${b.match_date}${b.start_time}`))

  // Plantilla: la de la jornada, o la del torneo; "auto" según la fecha
  const requested = data.is_admin ? url.searchParams.get('plantilla') : null
  let choice = requested || data.matchday.rol_template || data.tournament.rol_template || 'auto'
  if (choice === 'auto') choice = autoTemplate(sorted[0]?.match_date ?? data.matchday.week_start)

  let layout: TemplateLayout
  let background: Promise<string | null>
  const custom = choice.startsWith('custom:') ? data.custom_templates.find((c) => `custom:${c.id}` === choice) : null
  const builtin = builtinByKey(choice)
  if (custom) {
    layout = CUSTOM_LAYOUT
    background = loadTemplateBackground(`custom:${custom.id}:${custom.image_url}`, { url: custom.image_url })
  } else {
    const t = builtin ?? builtinByKey(autoTemplate(sorted[0]?.match_date ?? data.matchday.week_start))!
    layout = t
    background = loadTemplateBackground(t.key, { file: t.file })
  }

  const logoIds = [...usedIds, ...restingTeams.map((t) => t.id)]
  const [logos, tournamentLogo, fonts, bg, shield, banner, ball] = await Promise.all([
    Promise.all(logoIds.map(async (id) => [id, await loadLogo(teamById.get(id)?.logo_url ?? null)] as const)),
    loadLogo(data.tournament.logo_url, 240),
    getFonts(),
    background,
    rasterize('rol-shield', shieldSvg('#1f2937', '#030712')),
    rasterize('rol-banner', brushSvg('#e7b923', 500, 70, 13)),
    rasterize('ball', BALL_SVG),
  ])
  const logoById = new Map(logos)

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
      time: m.start_time.slice(0, 5),
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

  const download = url.searchParams.get('descargar') === '1'
  const filename = `rol-jornada-${data.matchday.number}.png`

  return new ImageResponse(<RolImage data={rol} layout={layout} art={{ background: bg, shield, banner, ball }} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: fonts.length > 0 ? fonts : undefined,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    },
  })
}
