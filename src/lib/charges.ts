export const CHARGE_CONCEPTS = {
  arbitraje: 'Arbitraje',
  inscripcion: 'Inscripción',
  horario: 'Preferencia de horario',
  multa: 'Multa',
  otro: 'Otro',
} as const

export type ChargeConcept = keyof typeof CHARGE_CONCEPTS

export type Charge = {
  id: string
  team_id: string
  concept: ChargeConcept
  description: string | null
  amount: number
  paid: boolean
  paid_at: string | null
  created_at: string
}

const moneyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function formatMoney(amount: number) {
  return moneyFormatter.format(amount)
}

export function chargeLabel(charge: Pick<Charge, 'concept' | 'description'>) {
  const concept = CHARGE_CONCEPTS[charge.concept] ?? charge.concept
  return charge.description ? `${concept} — ${charge.description}` : concept
}

export function totalAmount(charges: Pick<Charge, 'amount'>[]) {
  return charges.reduce((sum, c) => sum + Number(c.amount), 0)
}
