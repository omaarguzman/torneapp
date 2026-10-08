import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getFonts, loadLogo, loadTemplateBackground, rasterize } from '@/lib/rol/assets'
import { BALL_SVG, shieldSvg } from '@/lib/rol/art'
import { WIDTH, HEIGHT } from '@/lib/rol/RolImage'
import { StatsImage, type StatsImageData, type StatsTeam } from '@/lib/rol/StatsImage'
import { autoTemplate, builtinByKey, CUSTOM_LAYOUT, type TemplateLayout } from '@/lib/rol/templates'
import { loadTournamentStats } from '@/lib/stats/tournamentStats'
import { todayInMexico } from '@/lib/registration'

/**
 * Página 1 (tabla) o 2 (goleadores y demás) de las estadísticas, como PNG sobre
 * la plantilla del rol que eligió el admin. Mismos permisos que la pantalla de
 * estadísticas: el admin siempre; el delegado si su equipo no está bloqueado ni
 * tiene adeudos.
 */
export async function GET(request: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params
  const url = new URL(request.url)
  const page = url.searchParams.get('pagina') === '2' ? 2 : 1
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Inicia sesión.', { status: 401 })

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, logo_url, admin_id')
    .eq('id', tournamentId)
    .maybeSingle()
  if (!tournament) return new Response('No encontrado.', { status: 404 })

  const isAdmin = tournament.admin_id === user.id
  if (!isAdmin) {
    const { data: myTeams } = await supabase
      .from('teams')
      .select('id, access_blocked')
      .eq('tournament_id', tournamentId)
      .eq('delegate_id', user.id)
    if (!myTeams?.length) return new Response('No encontrado.', { status: 404 })
    if (myTeams.every((t) => t.access_blocked)) return new Response('Acceso bloqueado.', { status: 403 })
    const { count } = await supabase
      .from('team_charges')
      .select('id', { count: 'exact', head: true })
      .in('team_id', myTeams.map((t) => t.id))
      .eq('paid', false)
    if ((count ?? 0) > 0) return new Response('Tienes pagos pendientes.', { status: 403 })
  }

  // Plantilla del torneo (las propias del admin solo se pueden leer con esta función)
  const { data: tpl } = await supabase.rpc('get_tournament_template', { p_tournament_id: tournamentId })
  const template = (tpl ?? { rol_template: 'auto', custom_image_url: null }) as { rol_template: string; custom_image_url: string | null }
  let choice = template.rol_template || 'auto'
  if (choice === 'auto') choice = autoTemplate(todayInMexico())

  let layout: TemplateLayout
  let background: Promise<string | null>
  if (choice.startsWith('custom:') && template.custom_image_url) {
    layout = CUSTOM_LAYOUT
    background = loadTemplateBackground(`${choice}:${template.custom_image_url}`, { url: template.custom_image_url })
  } else {
    const t = builtinByKey(choice) ?? builtinByKey(autoTemplate(todayInMexico()))!
    layout = t
    background = loadTemplateBackground(t.key, { file: t.file })
  }

  const stats = await loadTournamentStats(supabase, tournamentId)
  const [logos, tournamentLogo, fonts, bg, shield, ball] = await Promise.all([
    Promise.all(stats.standings.map((s) => loadLogo(s.logoUrl, 96))),
    loadLogo(tournament.logo_url, 240),
    getFonts(),
    background,
    rasterize('rol-shield', shieldSvg('#1f2937', '#030712')),
    rasterize('ball', BALL_SVG),
  ])

  const teams: StatsTeam[] = stats.standings.map((s, i) => ({
    name: s.teamName,
    logo: logos[i],
    played: s.played,
    won: s.won,
    drawn: s.drawn,
    lost: s.lost,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalDiff: s.goalDiff,
    points: s.points,
  }))
  const logoByTeam = new Map(teams.map((t) => [t.name, t.logo]))
  const best = stats.bestDefense ? teams.find((t) => t.name === stats.bestDefense!.teamName) ?? null : null

  const dateText = new Date(`${todayInMexico()}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const data: StatsImageData = {
    tournamentName: tournament.name,
    tournamentLogo,
    updatedLabel: `Actualizada al ${dateText} · ${stats.playedCount} partido${stats.playedCount === 1 ? '' : 's'} jugado${stats.playedCount === 1 ? '' : 's'}`,
    standings: teams,
    scorers: stats.scorers.map((s) => ({ ...s, teamLogo: logoByTeam.get(s.team) ?? null })),
    // El delegado no ve tarjetas en su pantalla de estadísticas; tampoco aquí
    cards: isAdmin ? stats.cards : null,
    bestDefense: best,
  }

  return new ImageResponse(<StatsImage page={page} data={data} layout={layout} art={{ background: bg, shield, banner: '', ball }} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: fonts.length > 0 ? fonts : undefined,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
