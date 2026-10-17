import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getFonts, loadLogo, loadTemplateBackground, rasterize } from '@/lib/rol/assets'
import { BALL_SVG, shieldSvg } from '@/lib/rol/art'
import { WIDTH, HEIGHT } from '@/lib/rol/RolImage'
import { ResultImage, type ResultImageData } from '@/lib/rol/ResultImage'
import { autoTemplate, builtinByKey, CUSTOM_LAYOUT, type TemplateLayout } from '@/lib/rol/templates'
import { matchdayLabel } from '@/lib/playoffs/bracket'
import { walkoverLabel } from '@/lib/fixtures/matchLabel'

type EventRow = { team_id: string; minute: number | null; player: { full_name: string } | { full_name: string }[] | null }

/** "Juan Carlos Pérez López" → "Juan Pérez" (nombre + primer apellido, para que quepa). */
function shortName(full: string) {
  const parts = full.trim().split(/\s+/)
  if (parts.length <= 2) return full.trim()
  return parts.length >= 4 ? `${parts[0]} ${parts[2]}` : `${parts[0]} ${parts[1]}`
}

/** Goleadores de un equipo: "Juan Pérez 12', 40'" o "Juan Pérez x2" si no hay minutos. */
function scorerLines(events: EventRow[], teamId: string) {
  const byPlayer = new Map<string, (number | null)[]>()
  for (const e of events.filter((x) => x.team_id === teamId)) {
    const player = Array.isArray(e.player) ? e.player[0] : e.player
    const name = player ? shortName(player.full_name) : 'Jugador'
    byPlayer.set(name, [...(byPlayer.get(name) ?? []), e.minute])
  }
  return [...byPlayer.entries()].map(([name, minutes]) => {
    const known = minutes.filter((m): m is number => m !== null).sort((a, b) => a - b)
    if (known.length === minutes.length) return `${name} ${known.map((m) => `${m}'`).join(', ')}`
    return minutes.length > 1 ? `${name} x${minutes.length}` : name
  })
}

/**
 * Imagen "Resultado final" de un partido jugado, sobre la plantilla del rol.
 * Los permisos los pone la base de datos: si quien la pide puede ver el
 * partido (admin, o delegado sin bloqueo ni adeudos), puede ver su imagen.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Inicia sesión.', { status: 401 })

  const { data: match } = await supabase
    .from('matches')
    .select(
      `id, tournament_id, status, home_team_id, away_team_id, score_home, score_away, walkover,
       penalties_home, penalties_away, match_date, leg, playoff_tie_id,
       matchday:matchdays!matchday_id(number, stage, playoff_leg), venue:venues!venue_id(name)`
    )
    .eq('id', matchId)
    .maybeSingle()
  if (!match || match.status !== 'played' || match.score_home === null || match.score_away === null) {
    return new Response('Este partido todavía no tiene resultado.', { status: 404 })
  }

  const [{ data: tournament }, { data: teams }, { data: events }, { data: tpl }, { data: firstLeg }] = await Promise.all([
    supabase.from('tournaments').select('name, logo_url').eq('id', match.tournament_id).single(),
    supabase.from('teams').select('id, name, logo_url').in('id', [match.home_team_id, match.away_team_id]),
    supabase.from('match_events').select('team_id, minute, player:players(full_name)').eq('match_id', matchId).eq('type', 'goal'),
    supabase.rpc('get_tournament_template', { p_tournament_id: match.tournament_id }),
    match.playoff_tie_id && match.leg === 2
      ? supabase
          .from('matches')
          .select('home_team_id, score_home, score_away')
          .eq('playoff_tie_id', match.playoff_tie_id)
          .eq('leg', 1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const team = (id: string) => (teams ?? []).find((t) => t.id === id)
  const home = team(match.home_team_id)
  const away = team(match.away_team_id)

  // Plantilla: la del torneo (como la tabla y la llave)
  const template = (tpl ?? { rol_template: 'auto', custom_image_url: null }) as { rol_template: string; custom_image_url: string | null }
  let choice = template.rol_template || 'auto'
  if (choice === 'auto') choice = autoTemplate(match.match_date ?? new Date().toISOString().slice(0, 10))
  let layout: TemplateLayout
  let background: Promise<string | null>
  if (choice.startsWith('custom:') && template.custom_image_url) {
    layout = CUSTOM_LAYOUT
    background = loadTemplateBackground(`${choice}:${template.custom_image_url}`, { url: template.custom_image_url })
  } else {
    const t = builtinByKey(choice) ?? builtinByKey(autoTemplate(match.match_date ?? new Date().toISOString().slice(0, 10)))!
    layout = t
    background = loadTemplateBackground(t.key, { file: t.file })
  }

  const [homeLogo, awayLogo, tournamentLogo, fonts, bg, shield, ball] = await Promise.all([
    loadLogo(home?.logo_url ?? null, 240),
    loadLogo(away?.logo_url ?? null, 240),
    loadLogo(tournament?.logo_url ?? null, 240),
    getFonts(),
    background,
    rasterize('rol-shield', shieldSvg('#1f2937', '#030712')),
    rasterize('ball', BALL_SVG),
  ])

  const md = (Array.isArray(match.matchday) ? match.matchday[0] : match.matchday) as
    | { number: number; stage: string | null; playoff_leg: number | null }
    | null
  const venue = (Array.isArray(match.venue) ? match.venue[0] : match.venue) as { name: string } | null
  const homeName = home?.name ?? 'Local'
  const awayName = away?.name ?? 'Visitante'

  const notes: string[] = []
  if (match.walkover) notes.push(`W.O. · ${walkoverLabel(match.walkover, homeName, awayName)}`)
  const first = firstLeg as { home_team_id: string; score_home: number | null; score_away: number | null } | null
  if (first && first.score_home !== null && first.score_away !== null) {
    const sameHome = first.home_team_id === match.home_team_id
    const gh = match.score_home + (sameHome ? first.score_home : first.score_away)
    const ga = match.score_away + (sameHome ? first.score_away : first.score_home)
    notes.push(`Global ${gh}–${ga}`)
  }
  if (match.penalties_home !== null && match.penalties_away !== null) notes.push(`Penales ${match.penalties_home}–${match.penalties_away}`)

  const dateText = match.match_date
    ? new Date(`${match.match_date}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const goals = (events ?? []) as EventRow[]

  const data: ResultImageData = {
    tournamentName: tournament?.name ?? '',
    tournamentLogo,
    roundLabel: md ? matchdayLabel(md, true) : 'Partido',
    detail: [dateText.charAt(0).toUpperCase() + dateText.slice(1), venue?.name].filter(Boolean).join(' · '),
    home: { name: homeName, logo: homeLogo, goals: match.score_home, scorers: match.walkover ? [] : scorerLines(goals, match.home_team_id) },
    away: { name: awayName, logo: awayLogo, goals: match.score_away, scorers: match.walkover ? [] : scorerLines(goals, match.away_team_id) },
    notes,
  }

  return new ImageResponse(<ResultImage data={data} layout={layout} art={{ background: bg, shield, banner: '', ball }} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: fonts.length > 0 ? fonts : undefined,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
