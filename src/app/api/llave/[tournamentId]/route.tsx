import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getFonts, loadLogo, loadTemplateBackground, rasterize } from '@/lib/rol/assets'
import { BALL_SVG, shieldSvg } from '@/lib/rol/art'
import { WIDTH, HEIGHT } from '@/lib/rol/RolImage'
import { BracketImage, type BracketImageData, type BracketTeam } from '@/lib/rol/BracketImage'
import { autoTemplate, builtinByKey, CUSTOM_LAYOUT, type TemplateLayout } from '@/lib/rol/templates'
import { todayInMexico } from '@/lib/registration'
import { isSuperAdmin } from '@/lib/superAdmin'
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/playoffs/bracket'
import { loadPlayoffState } from '@/lib/playoffs/playoffData'

/**
 * Imagen de la llave de la liguilla (PNG) sobre la plantilla del rol que eligió
 * el admin. Mismos permisos que la tabla: el admin siempre; el delegado si su
 * equipo no está bloqueado ni tiene adeudos.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Inicia sesión.', { status: 401 })

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, logo_url, admin_id')
    .eq('id', tournamentId)
    .maybeSingle()
  if (!tournament) return new Response('No encontrado.', { status: 404 })

  const isAdmin = tournament.admin_id === user.id || (await isSuperAdmin(supabase))
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

  const state = await loadPlayoffState(supabase, tournamentId)
  if (state.ties.length === 0) return new Response('La liguilla todavía no empieza.', { status: 404 })

  // Plantilla del torneo (igual que la tabla)
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

  const teamIds = [...new Set(state.ties.flatMap((t) => [t.high.teamId, t.low.teamId]))]
  const { data: teams } = await supabase.from('teams').select('id, name, logo_url').in('id', teamIds)
  const [logos, tournamentLogo, fonts, bg, shield, ball] = await Promise.all([
    Promise.all((teams ?? []).map(async (t) => [t.id, await loadLogo(t.logo_url, 96)] as const)),
    loadLogo(tournament.logo_url, 240),
    getFonts(),
    background,
    rasterize('rol-shield', shieldSvg('#1f2937', '#030712')),
    rasterize('ball', BALL_SVG),
  ])
  const logoById = new Map(logos)
  const nameById = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const team = (id: string, seed: number): BracketTeam => ({ name: nameById.get(id) ?? '—', logo: logoById.get(id) ?? null, seed })

  const stages = STAGE_ORDER.filter((s) => state.ties.some((t) => t.stage === s)).map((stage) => ({
    label: STAGE_LABEL[stage],
    ties: state.ties
      .filter((t) => t.stage === stage)
      .map((t) => {
        const side = (m: (typeof t.matches)[number], home: number | null, away: number | null) =>
          (m.homeTeamId === t.high.teamId ? [home, away] : [away, home]) as [number | null, number | null]
        const last = t.matches[t.matches.length - 1]
        const pens =
          t.outcome.status === 'decided' && t.outcome.by === 'penalties' && last && last.penaltiesHome !== null && last.penaltiesAway !== null
            ? (side(last, last.penaltiesHome, last.penaltiesAway) as [number, number])
            : null
        const winnerId = t.outcome.status === 'decided' ? t.outcome.winner : null
        return {
          high: team(t.high.teamId, t.high.seed),
          low: team(t.low.teamId, t.low.seed),
          legs: t.matches.map((m) => side(m, m.scoreHome, m.scoreAway)),
          penalties: pens,
          winner: winnerId === null ? null : winnerId === t.high.teamId ? ('high' as const) : ('low' as const),
        }
      }),
  }))

  const final = state.ties.find((t) => t.stage === 'final')
  const championId = final?.outcome.status === 'decided' ? final.outcome.winner : null
  const seedOf = new Map(state.seeds.map((s) => [s.teamId, s.seed]))

  const data: BracketImageData = {
    tournamentName: tournament.name,
    tournamentLogo,
    stages,
    champion: championId ? team(championId, seedOf.get(championId) ?? 0) : null,
  }

  return new ImageResponse(<BracketImage data={data} layout={layout} art={{ background: bg, shield, banner: '', ball }} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: fonts.length > 0 ? fonts : undefined,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
