'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  const headerList = await headers()
  const origin = headerList.get('origin') ?? `https://${headerList.get('host')}`
  const invite = (formData.get('invite') as string | null)?.trim()

  const callback = new URL('/auth/callback', origin)
  if (invite) callback.searchParams.set('invite', invite)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  })

  if (error || !data.url) {
    console.error('[signInWithGoogle] error:', error)
    redirect(invite ? `/equipo/${encodeURIComponent(invite)}?error=GOOGLE` : '/login?error=GOOGLE')
  }

  redirect(data.url)
}
