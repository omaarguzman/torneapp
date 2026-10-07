'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentFingerprint, type FixtureUpdatePlan } from '@/lib/fixtures/fixtureUpdate'

export type ApplyUpdateResult = { error: string } | null

const STALE =
  'El fixture cambió desde que se generó esta propuesta (se capturó una cédula, se aplazó o programó un partido, o cambiaron los equipos). Genera una nueva propuesta.'

export async function applyFixtureUpdate(_prev: ApplyUpdateResult, formData: FormData): Promise<ApplyUpdateResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  let plan: FixtureUpdatePlan
  try {
    plan = JSON.parse(formData.get('plan') as string)
  } catch {
    return { error: 'La propuesta no es válida. Genera una nueva.' }
  }

  if ((await currentFingerprint(supabase, tournamentId)) !== plan.fingerprint) {
    return { error: STALE }
  }

  // Todo lo que trae la propuesta debe pertenecer a este torneo
  const [{ data: teams }, { data: venues }] = await Promise.all([
    supabase.from('teams').select('id').eq('tournament_id', tournamentId),
    supabase.from('venues').select('id').eq('tournament_id', tournamentId),
  ])
  const teamIds = new Set((teams ?? []).map((t) => t.id))
  const venueIds = new Set((venues ?? []).map((v) => v.id))
  const numbers = new Set(plan.matchdays.map((md) => md.number))
  const valid =
    plan.matches.every(
      (m) =>
        teamIds.has(m.home_team_id) &&
        teamIds.has(m.away_team_id) &&
        venueIds.has(m.venue_id) &&
        numbers.has(m.matchday_number)
    ) &&
    plan.pending.every((p) => teamIds.has(p.home_team_id) && teamIds.has(p.away_team_id)) &&
    plan.matchdays.every((md) => md.number >= plan.firstNumber)
  if (!valid) return { error: 'La propuesta no es válida. Genera una nueva.' }

  const { error } = await supabase.rpc('apply_fixture_update', {
    p_tournament_id: tournamentId,
    p_first_number: plan.firstNumber,
    p_plan: { matchdays: plan.matchdays, matches: plan.matches, pending: plan.pending },
  })

  if (error) {
    console.error('[applyFixtureUpdate] error:', error)
    if (error.message.includes('STALE_PLAN')) return { error: STALE }
    return { error: 'No se pudo actualizar el fixture. No se guardó ningún cambio; inténtalo de nuevo.' }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture`)
  revalidatePath('/delegado/fixture')
  redirect(`/dashboard/tournaments/${tournamentId}/fixture?actualizado=1`)
}
