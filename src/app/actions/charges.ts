'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CHARGE_CONCEPTS } from '@/lib/charges'

export type ChargeActionResult = { success: true } | { error: string } | null

export async function createCharge(
  _prevState: ChargeActionResult,
  formData: FormData
): Promise<ChargeActionResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const teamTarget = formData.get('team_id') as string
  const concept = formData.get('concept') as string
  const description = ((formData.get('description') as string) || '').trim() || null
  const amount = Number(formData.get('amount'))

  if (!(concept in CHARGE_CONCEPTS)) {
    return { error: 'Selecciona un concepto válido.' }
  }
  if (!teamTarget) {
    return { error: 'Selecciona un equipo.' }
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: 'El monto debe ser un número mayor o igual a cero.' }
  }

  let teamIds: string[] = [teamTarget]

  if (teamTarget === 'all') {
    const { data: teams } = await supabase.from('teams').select('id').eq('tournament_id', tournamentId)
    teamIds = (teams ?? []).map((t) => t.id)
    if (teamIds.length === 0) {
      return { error: 'Este torneo aún no tiene equipos.' }
    }
  }

  const { error } = await supabase.from('team_charges').insert(
    teamIds.map((teamId) => ({
      tournament_id: tournamentId,
      team_id: teamId,
      concept,
      description,
      amount,
    }))
  )

  if (error) {
    console.error('[createCharge] error:', error)
    return { error: 'No se pudo registrar el cargo. Inténtalo de nuevo.' }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  return { success: true }
}

export async function setChargePaid(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const chargeId = formData.get('charge_id') as string
  const paid = formData.get('paid') === 'true'

  await supabase
    .from('team_charges')
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq('id', chargeId)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function setTeamAccessBlocked(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const teamId = formData.get('team_id') as string
  const blocked = formData.get('blocked') === 'true'

  const { error } = await supabase.from('teams').update({ access_blocked: blocked }).eq('id', teamId)
  if (error) console.error('[setTeamAccessBlocked] error:', error)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}

export async function deleteCharge(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const chargeId = formData.get('charge_id') as string

  await supabase.from('team_charges').delete().eq('id', chargeId)

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
}
