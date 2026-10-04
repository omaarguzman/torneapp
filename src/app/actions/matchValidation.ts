'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function revalidateMatchPages(tournamentId: string, matchId: string) {
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture`)
  revalidatePath(`/dashboard/tournaments/${tournamentId}/fixture/${matchId}`)
}

export async function validateMatch(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Solo se valida un partido que ya tiene cédula capturada
  const { error } = await supabase
    .from('matches')
    .update({ validated_at: new Date().toISOString(), validated_by: user.id })
    .eq('id', matchId)
    .eq('status', 'played')

  if (error) console.error('[validateMatch] error:', error)
  revalidateMatchPages(tournamentId, matchId)
}

export async function reopenMatch(formData: FormData) {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const matchId = formData.get('match_id') as string

  const { error } = await supabase
    .from('matches')
    .update({ validated_at: null, validated_by: null })
    .eq('id', matchId)

  if (error) console.error('[reopenMatch] error:', error)
  revalidateMatchPages(tournamentId, matchId)
}
