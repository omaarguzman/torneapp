import { cookies } from 'next/headers'
import type { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export const DELEGATE_TEAM_COOKIE = 'delegate_team'

export type DelegateTeam = {
  id: string
  name: string
  logo_url: string | null
  tournament_id: string
  tournament_name: string
  /** Bloqueo total por el admin (o torneo pausado): el delegado solo puede ver lo que debe. */
  access_blocked: boolean
  /** El torneo completo está pausado por el soporte de Torneapp. */
  tournament_paused: boolean
}

export async function getDelegateTeams(supabase: SupabaseClient, userId: string): Promise<DelegateTeam[]> {
  const { data } = await supabase
    .from('teams')
    .select('id, name, logo_url, tournament_id, access_blocked, tournament:tournaments(name, disabled_at)')
    .eq('delegate_id', userId)
    .order('created_at')

  return (data ?? []).map((t) => {
    const tournament = (Array.isArray(t.tournament) ? t.tournament[0] : t.tournament) as { name: string; disabled_at: string | null } | null
    const paused = !!tournament?.disabled_at
    return {
      id: t.id,
      name: t.name,
      logo_url: t.logo_url,
      tournament_id: t.tournament_id,
      tournament_name: tournament?.name ?? '',
      access_blocked: !!t.access_blocked || paused,
      tournament_paused: paused,
    }
  })
}

/**
 * Equipo con el que está trabajando el delegado. Si tiene uno solo, es ese; si tiene
 * varios, el que eligió (cookie). La cookie solo es una preferencia: siempre se valida
 * contra los equipos que realmente le pertenecen.
 */
export async function resolveCurrentTeam(supabase: SupabaseClient, userId: string) {
  const teams = await getDelegateTeams(supabase, userId)
  if (teams.length <= 1) return { team: teams[0] ?? null, teams }

  const selected = (await cookies()).get(DELEGATE_TEAM_COOKIE)?.value
  return { team: teams.find((t) => t.id === selected) ?? null, teams }
}
