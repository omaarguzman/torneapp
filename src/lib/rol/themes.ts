export type ThemeKey = 'estadio' | 'patrio' | 'muertos' | 'navidad' | 'primavera'

export type RolTheme = {
  key: ThemeKey
  label: string
  /** Brochazo de "JORNADA N" y encabezados de cancha */
  accent: string
  accentDark: string
  /** Cajas de hora y "VS" (degradado de arriba hacia abajo) */
  gold: [string, string]
  goldText: string
  /** Interior del escudo */
  shield: [string, string]
  /** Brochazo de "NOTA" */
  noteBrush: string
}

const GOLD: [string, string] = ['#fde047', '#eab308']

export const THEMES: Record<ThemeKey, RolTheme> = {
  estadio: {
    key: 'estadio',
    label: '⚽ Estadio',
    accent: '#16a34a',
    accentDark: '#065f2c',
    gold: GOLD,
    goldText: '#111827',
    shield: ['#2563eb', '#0b1d4d'],
    noteBrush: '#dc2626',
  },
  patrio: {
    key: 'patrio',
    label: '🇲🇽 Mes patrio',
    accent: '#00804f',
    accentDark: '#004d30',
    gold: GOLD,
    goldText: '#111827',
    shield: ['#00804f', '#003d26'],
    noteBrush: '#ce1126',
  },
  muertos: {
    key: 'muertos',
    label: '💀 Día de Muertos',
    accent: '#ea580c',
    accentDark: '#7c2d12',
    gold: ['#fde68a', '#f59e0b'],
    goldText: '#1c0828',
    shield: ['#7e22ce', '#2e0f45'],
    noteBrush: '#db2777',
  },
  navidad: {
    key: 'navidad',
    label: '🎄 Navidad',
    accent: '#b91c1c',
    accentDark: '#7f1d1d',
    gold: GOLD,
    goldText: '#3b0a0a',
    shield: ['#15803d', '#052e16'],
    noteBrush: '#15803d',
  },
  primavera: {
    key: 'primavera',
    label: '🌸 Primavera',
    accent: '#db2777',
    accentDark: '#831843',
    gold: GOLD,
    goldText: '#111827',
    shield: ['#22c55e', '#14532d'],
    noteBrush: '#7c3aed',
  },
}

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[]

/**
 * Tema automático según la fecha de la jornada: septiembre = mes patrio,
 * 25 oct–3 nov = Día de Muertos, 1 dic–6 ene = Navidad,
 * 20 mar–30 abr = Primavera; el resto, estadio.
 */
export function autoTheme(date: string): ThemeKey {
  const [, m, d] = date.split('-').map(Number)
  if (m === 9) return 'patrio'
  if ((m === 10 && d >= 25) || (m === 11 && d <= 3)) return 'muertos'
  if (m === 12 || (m === 1 && d <= 6)) return 'navidad'
  if ((m === 3 && d >= 20) || m === 4) return 'primavera'
  return 'estadio'
}
