// Solo para el servidor: prepara (y guarda en memoria) las ilustraciones de una imagen del rol.
import { rasterize } from './assets'
import { BALL_SVG, backgroundSvg, brushSvg, shieldSvg } from './art'
import type { RolTheme } from './themes'

export type RolArt = {
  background: string
  shield: string
  jornada: string
  vs: string
  rest: string
  note: string
  ball: string
}

export const BRUSH_SIZES = {
  jornada: [640, 150],
  vs: [104, 84],
  rest: [1016, 150],
  note: [260, 82],
} as const

export async function buildRolArt(theme: RolTheme, height: number): Promise<RolArt> {
  const k = theme.key
  const [background, shield, jornada, vs, rest, note, ball] = await Promise.all([
    rasterize(`bg:${k}:${height}`, backgroundSvg(k, height), 'jpeg'),
    rasterize(`shield:${k}`, shieldSvg(theme.shield[0], theme.shield[1])),
    rasterize(`jornada:${k}`, brushSvg(theme.accent, ...BRUSH_SIZES.jornada, 11)),
    rasterize(`vs:${k}`, brushSvg(theme.gold[0], ...BRUSH_SIZES.vs, 7)),
    rasterize('rest', brushSvg('#07090f', ...BRUSH_SIZES.rest, 21)),
    rasterize(`note:${k}`, brushSvg(theme.noteBrush, ...BRUSH_SIZES.note, 5)),
    rasterize('ball', BALL_SVG),
  ])
  return { background, shield, jornada, vs, rest, note, ball }
}
