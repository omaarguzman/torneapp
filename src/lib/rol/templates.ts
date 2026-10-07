/**
 * Plantillas de la imagen del rol. Las incluidas traen dibujados datos de
 * ejemplo ("JORNADA 1", fecha, tarjetas): la app los tapa con los datos
 * reales en las zonas medidas aquí (coordenadas sobre 1122×1402).
 * Las que sube cada admin son fondos limpios: la app dibuja todo encima.
 */

export const CANVAS = { width: 1122, height: 1402 } as const

export type Box = { x: number; y: number; w: number; h: number }

export type TemplateLayout = {
  /** true = la plantilla ya trae escudo, "JORNADA" y "ROL DE JUEGOS" dibujados */
  baked: boolean
  /** Centro del escudo (para poner el logo del torneo) */
  shieldCenter: { x: number; y: number }
  /** Zona del número de jornada a tapar (solo en plantillas con título dibujado) */
  number: Box
  date: Box
  cards: Box
  panels: Box
  /** Encabezado de cada cancha */
  header: [string, string]
  headerText: string
}

export type BuiltinTemplate = TemplateLayout & { key: string; label: string; file: string }

const DEFAULT_HEADER: [string, string] = ['#8a6a1f', '#f5c84c']

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    key: 'muertos',
    label: '💀 Día de Muertos',
    file: 'muertos.webp',
    baked: true,
    shieldCenter: { x: 537, y: 122 },
    number: { x: 758, y: 228, w: 80, h: 104 },
    date: { x: 318, y: 402, w: 488, h: 52 },
    cards: { x: 143, y: 458, w: 840, h: 444 },
    panels: { x: 143, y: 906, w: 840, h: 148 },
    header: ['#8a6a1f', '#f5c84c'],
    headerText: '#111111',
  },
  {
    key: 'navidad',
    label: '🎄 Navidad',
    file: 'navidad.webp',
    baked: true,
    shieldCenter: { x: 560, y: 120 },
    number: { x: 752, y: 186, w: 98, h: 212 },
    date: { x: 322, y: 396, w: 494, h: 52 },
    cards: { x: 88, y: 456, w: 948, h: 472 },
    panels: { x: 88, y: 932, w: 948, h: 150 },
    header: ['#7f1d1d', '#c81e1e'],
    headerText: '#facc15',
  },
  {
    key: 'primavera',
    label: '🌸 Primavera',
    file: 'primavera.webp',
    baked: true,
    shieldCenter: { x: 562, y: 120 },
    number: { x: 748, y: 200, w: 92, h: 194 },
    date: { x: 344, y: 392, w: 434, h: 54 },
    cards: { x: 84, y: 456, w: 956, h: 466 },
    panels: { x: 84, y: 932, w: 952, h: 146 },
    header: ['#8b5e34', '#d9a066'],
    headerText: '#1c1917',
  },
  {
    key: 'patrio',
    label: '🇲🇽 Mes patrio',
    file: 'patrio.webp',
    baked: true,
    shieldCenter: { x: 562, y: 120 },
    number: { x: 752, y: 200, w: 94, h: 198 },
    date: { x: 320, y: 396, w: 490, h: 52 },
    cards: { x: 86, y: 458, w: 952, h: 462 },
    panels: { x: 86, y: 928, w: 950, h: 146 },
    header: ['#006847', '#ce1126'],
    headerText: '#facc15',
  },
  {
    key: 'infantil',
    label: '🧒 Infantil / Día del niño',
    file: 'infantil.webp',
    baked: true,
    shieldCenter: { x: 560, y: 120 },
    number: { x: 746, y: 180, w: 78, h: 162 },
    date: { x: 346, y: 392, w: 428, h: 54 },
    cards: { x: 82, y: 456, w: 952, h: 482 },
    panels: { x: 86, y: 940, w: 946, h: 164 },
    header: ['#c08a4a', '#e8c48a'],
    headerText: '#1c1917',
  },
  {
    key: 'anio-nuevo',
    label: '🎆 Año Nuevo',
    file: 'anio-nuevo.webp',
    baked: true,
    shieldCenter: { x: 562, y: 120 },
    number: { x: 754, y: 190, w: 94, h: 210 },
    date: { x: 350, y: 396, w: 424, h: 52 },
    cards: { x: 82, y: 458, w: 956, h: 466 },
    panels: { x: 82, y: 930, w: 956, h: 146 },
    header: ['#8a6a1f', '#f5c84c'],
    headerText: '#111111',
  },
]

/** Acomodo para los fondos limpios que suben los admins: la app dibuja escudo, título y todo lo demás. */
export const CUSTOM_LAYOUT: TemplateLayout = {
  baked: false,
  shieldCenter: { x: 561, y: 100 },
  number: { x: 0, y: 0, w: 0, h: 0 },
  date: { x: 300, y: 400, w: 522, h: 52 },
  cards: { x: 82, y: 462, w: 958, h: 462 },
  panels: { x: 82, y: 934, w: 958, h: 146 },
  header: DEFAULT_HEADER,
  headerText: '#111111',
}

export const builtinByKey = (key: string) => BUILTIN_TEMPLATES.find((t) => t.key === key) ?? null

/**
 * Plantilla automática según la fecha de la jornada. Fuera de temporada se
 * usa Primavera (la más neutral) hasta que exista una plantilla general.
 */
export function autoTemplate(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  if ((m === 12 && d >= 26) || (m === 1 && d <= 15)) return 'anio-nuevo'
  if (m === 12) return 'navidad'
  if ((m === 10 && d >= 25) || (m === 11 && d <= 5)) return 'muertos'
  if (m === 9) return 'patrio'
  if (m === 4 && d >= 20) return 'infantil'
  return 'primavera'
}

/** Valor guardado en tournaments.rol_template / matchdays.rol_template. */
export type TemplateChoice = 'auto' | string // 'auto' | clave incluida | 'custom:<uuid>'

export const templateLabel = (choice: string, customs: { id: string; name: string }[]) => {
  if (choice === 'auto') return 'Automática por temporada'
  if (choice.startsWith('custom:')) return customs.find((c) => `custom:${c.id}` === choice)?.name ?? 'Plantilla eliminada'
  return builtinByKey(choice)?.label ?? choice
}
