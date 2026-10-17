'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SLUG_PATTERN, slugify } from '@/lib/slug'

export type PublicPageResult = { success: string } | { error: string } | null

/** Activa o apaga la página pública del torneo y guarda el nombre de su link. */
export async function savePublicPage(_prev: PublicPageResult, formData: FormData): Promise<PublicPageResult> {
  const supabase = await createClient()
  const tournamentId = formData.get('tournament_id') as string
  const enabled = formData.get('enabled') === 'on'
  const slug = slugify((formData.get('slug') as string) || '')

  if (enabled && (slug.length < 3 || !SLUG_PATTERN.test(slug))) {
    return { error: 'El link necesita al menos 3 letras o números.' }
  }

  const { error } = await supabase
    .from('tournaments')
    .update({ public_enabled: enabled, ...(slug ? { public_slug: slug } : {}) })
    .eq('id', tournamentId)

  if (error) {
    if (error.code === '23505') return { error: 'Ese link ya lo usa otro torneo. Prueba con otro nombre (por ejemplo, agrega el año).' }
    console.error('[savePublicPage] error:', error)
    return { error: 'No se pudo guardar. Inténtalo de nuevo.' }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  if (slug) revalidatePath(`/t/${slug}`)
  return { success: enabled ? 'Página pública activada.' : 'Página pública apagada.' }
}
