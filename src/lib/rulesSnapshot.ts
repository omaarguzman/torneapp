/** Foto del reglamento de un torneo: texto libre + reglas configuradas. Así la guarda el aviso de cambio. */
export type RulesSnapshot = {
  rules: string | null
  yellow: number | null
  red: number | null
  wo_goals: number | null
  double_wo: string | null
  deadline: string | null
}

export type RuleSetting = { key: keyof Omit<RulesSnapshot, 'rules'>; label: string; value: string }

const dateLabel = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** Reglas configuradas en texto legible. */
export function ruleSettings(s: RulesSnapshot): RuleSetting[] {
  return [
    {
      key: 'yellow',
      label: 'Suspensión por amarillas',
      value: s.yellow ? `${s.yellow} amarillas acumuladas = 1 partido de suspensión` : 'No se suspende por acumulación de amarillas',
    },
    {
      key: 'red',
      label: 'Suspensión por roja',
      value: s.red === 0 ? 'Sin partidos de suspensión' : `${s.red ?? 1} partido${(s.red ?? 1) > 1 ? 's' : ''} de suspensión`,
    },
    {
      key: 'wo_goals',
      label: 'Default / W.O.',
      value: `El equipo que sí se presenta gana ${s.wo_goals ?? 3}-0`,
    },
    {
      key: 'double_wo',
      label: 'Si no se presenta ningún equipo',
      value: s.double_wo === 'draw' ? 'Cuenta como empate 0-0 (1 punto cada uno)' : 'Ambos pierden (0 puntos)',
    },
    {
      key: 'deadline',
      label: 'Registro de jugadores',
      value: s.deadline ? `Hasta el ${dateLabel(s.deadline)}` : 'Sin fecha límite',
    },
  ]
}

/** Reglas configuradas que cambiaron entre dos fotos. */
export function changedSettings(oldS: RulesSnapshot | null, newS: RulesSnapshot) {
  if (!oldS) return []
  const before = new Map(ruleSettings(oldS).map((r) => [r.key, r.value]))
  return ruleSettings(newS)
    .filter((r) => before.get(r.key) !== r.value)
    .map((r) => ({ ...r, before: before.get(r.key) ?? '' }))
}
