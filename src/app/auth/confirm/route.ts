import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Enlaces que llegan por correo: confirmar la cuenta (type=email) y recuperar
 * la contraseña (type=recovery). Al confirmar, /login manda a cada quien a su panel.
 * - token_hash: funciona aunque el enlace se abra en otro dispositivo
 *   (requiere la plantilla de correo personalizada en Supabase).
 * - code: plantilla por defecto de Supabase; solo funciona en el mismo navegador.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  // Solo rutas internas, para que el enlace no pueda mandar a otro sitio
  const fallback = type === 'recovery' ? '/restablecer' : '/login'
  const nextParam = searchParams.get('next') ?? fallback
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : fallback

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/confirm] verifyOtp error:', error.message)
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/confirm] exchangeCodeForSession error:', error.message)
  }

  return NextResponse.redirect(`${origin}${type === 'recovery' ? '/recuperar' : '/login'}?error=enlace`)
}
