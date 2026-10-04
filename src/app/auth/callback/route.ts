import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { claimErrorCode } from '@/lib/oauthErrors'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const invite = searchParams.get('invite')
  const errorPage = invite ? `/equipo/${encodeURIComponent(invite)}` : '/login'

  // El usuario canceló en la pantalla de Google, o Google devolvió un error
  if (searchParams.get('error')) {
    const cancelled = searchParams.get('error') === 'access_denied'
    return NextResponse.redirect(`${origin}${errorPage}?error=${cancelled ? 'CANCELLED' : 'GOOGLE'}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}${errorPage}?error=GOOGLE`)
  }

  if (invite) {
    const meta = data.user.user_metadata as { full_name?: string; name?: string }
    const { error: claimError } = await supabase.rpc('claim_team_delegate_self', {
      p_token: invite,
      p_delegate_name: meta.full_name ?? meta.name ?? null,
    })

    if (claimError) {
      console.error('[auth/callback] claim_team_delegate_self error:', claimError)
      const errorCode = claimErrorCode(claimError.message)
      // Una cuenta de admin que intentó entrar por un link de delegado conserva
      // su sesión; para cualquier otro error se cierra para no dejarla a medias
      if (errorCode !== 'ADMIN_ACCOUNT') await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}${errorPage}?error=${errorCode}`)
    }

    return NextResponse.redirect(`${origin}/delegado`)
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

  return NextResponse.redirect(`${origin}${profile?.role === 'delegate' ? '/delegado' : '/dashboard'}`)
}
