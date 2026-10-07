import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Enlaces que llegan por correo (por ahora, recuperar contraseña).
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
  const nextParam = searchParams.get('next') ?? '/restablecer'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/restablecer'

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

  return NextResponse.redirect(`${origin}/recuperar?error=enlace`)
}
