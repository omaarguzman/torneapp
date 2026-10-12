'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isStage, playoffOptions, stagesFor, STAGE_ORDER, type Stage } from '@/lib/playoffs/bracket'
import { buildRoundPayload, currentSeeds, legsFor, loadPlayoffState, plannedRound } from '@/lib/playoffs/playoffData'

export type PlayoffResult = { success: string } | { error: string } | null

const DB_ERRORS: Record<string, string> = {
  NOT_ADMIN: 'Solo el admin del torneo puede hacer esto.',
  ALREADY_STARTED: 'La liguilla ya se había iniciado. Recarga la página.',
  NOT_STARTED: 'La liguilla todavía no ha empezado.',
  STAGE_EXISTS: 'Esa ronda ya existe. Recarga la página.',
  HAS_PLAYED: 'Esa ronda ya tiene partidos jugados; no se puede deshacer.',
}
const dbError = (message: string, fallback: string) => {
  const code = Object.keys(DB_ERRORS).find((c) => message.includes(c))
  return { error: code ? DB_ERRORS[code] : fallback }
}

function revalidate(tournamentId: string) {
  revalidatePath(`/dashboard/tournaments/${tournamentId}`, 'layout')
  revalidatePath('/delegado', 'layout')
}

/** Guarda cómo se jugará la liguilla (solo antes de iniciarla). */
export async function savePlayoffConfig(_prev: PlayoffResult, formData: FormData): Promise<PlayoffResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  const [{ data: t }, { count: teamCount }] = await Promise.all([
    supabase.from('tournaments').select('playoff_started_at').eq('id', tournamentId).single(),
    supabase.from('teams').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId),
  ])
  if (!t) return { error: 'No se encontró el torneo.' }
  if (t.playoff_started_at) return { error: 'La liguilla ya empezó; su configuración ya no se puede cambiar.' }

  if (formData.get('enabled') !== 'on') {
    const { error } = await supabase.from('tournaments').update({ playoff_qualifiers: null, playoff_direct: null }).eq('id', tournamentId)
    if (error) return { error: 'No se pudo guardar.' }
    revalidate(tournamentId)
    return { success: 'Este torneo no tendrá liguilla.' }
  }

  const qualifiers = Number(formData.get('qualifiers'))
  const direct = Number(formData.get('direct'))
  const option = playoffOptions(teamCount ?? 0).find((o) => o.qualifiers === qualifiers)
  if (!option || !option.directs.includes(direct)) {
    return { error: 'Esa combinación no es posible con los equipos de este torneo.' }
  }

  const legs: Partial<Record<Stage, 1 | 2>> = {}
  for (const stage of [...stagesFor({ qualifiers, direct }), 'tercer_lugar' as Stage]) {
    legs[stage] = formData.get(`legs_${stage}`) === '2' ? 2 : 1
  }
  const tiebreak = formData.get('tiebreak') === 'penalties' ? 'penalties' : 'seed'

  const { error } = await supabase
    .from('tournaments')
    .update({ playoff_qualifiers: qualifiers, playoff_direct: direct, playoff_legs: legs, playoff_tiebreak: tiebreak })
    .eq('id', tournamentId)
  if (error) {
    console.error('[savePlayoffConfig] error:', error)
    return { error: 'No se pudo guardar la configuración.' }
  }
  revalidate(tournamentId)
  return { success: 'Configuración de la liguilla guardada.' }
}

/** Congela la tabla general, guarda los lugares y programa la primera ronda. */
export async function startPlayoffs(_prev: PlayoffResult, formData: FormData): Promise<PlayoffResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  const state = await loadPlayoffState(supabase, tournamentId)
  if (!state.config) return { error: 'Primero configura la liguilla.' }
  if (state.started) return { error: 'La liguilla ya empezó.' }

  const seeds = await currentSeeds(supabase, tournamentId)
  const round = plannedRound(state, seeds)
  if (!round || round.ties.length === 0) return { error: 'No hay suficientes equipos para la liguilla.' }

  const payload = await buildRoundPayload(supabase, tournamentId, round.stage, round.ties, legsFor(state.config, round.stage))
  if ('error' in payload) return payload

  const { error } = await supabase.rpc('create_playoff_round', {
    p_tournament_id: tournamentId,
    p_seeds: seeds.map((s) => ({ team: s.teamId, seed: s.seed })),
    p_round: payload,
  })
  if (error) {
    console.error('[startPlayoffs] error:', error)
    return dbError(error.message, 'No se pudo iniciar la liguilla. Inténtalo de nuevo.')
  }
  revalidate(tournamentId)
  return { success: 'ok' }
}

/** Con todas las eliminatorias decididas, programa la siguiente ronda (reacomodando por la tabla). */
export async function createNextPlayoffRound(_prev: PlayoffResult, formData: FormData): Promise<PlayoffResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string

  const state = await loadPlayoffState(supabase, tournamentId)
  if (!state.config || !state.started) return { error: 'La liguilla todavía no ha empezado.' }
  if (!state.currentDone) return { error: 'Todavía hay eliminatorias sin ganador en esta ronda.' }

  const round = plannedRound(state, state.seeds)
  if (!round) return { error: 'La liguilla ya terminó.' }

  const payload = await buildRoundPayload(supabase, tournamentId, round.stage, round.ties, legsFor(state.config, round.stage))
  if ('error' in payload) return payload

  const { error } = await supabase.rpc('create_playoff_round', { p_tournament_id: tournamentId, p_seeds: null, p_round: payload })
  if (error) {
    console.error('[createNextPlayoffRound] error:', error)
    return dbError(error.message, 'No se pudo crear la siguiente ronda.')
  }
  revalidate(tournamentId)
  return { success: 'ok' }
}

/** Borra la ronda más reciente si nadie ha jugado; si era la primera, la liguilla vuelve a "sin iniciar". */
export async function undoPlayoffRound(_prev: PlayoffResult, formData: FormData): Promise<PlayoffResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const stage = formData.get('stage') as string
  if (!isStage(stage) || !STAGE_ORDER.includes(stage)) return { error: 'Ronda no válida.' }

  const { error } = await supabase.rpc('undo_playoff_round', { p_tournament_id: tournamentId, p_stage: stage })
  if (error) {
    console.error('[undoPlayoffRound] error:', error)
    return dbError(error.message, 'No se pudo deshacer la ronda.')
  }
  revalidate(tournamentId)
  return { success: 'Ronda deshecha.' }
}
