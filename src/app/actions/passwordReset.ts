'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { passwordProblem } from '@/lib/passwordPolicy'

export type ResetResult = { sent: true } | { error: string } | null

/**
 * Envía el correo para restablecer la contraseña. La respuesta es la misma
 * exista o no la cuenta, para no revelar qué correos están registrados.
 */
export async function requestPasswordReset(_prev: ResetResult, formData: FormData): Promise<ResetResult> {
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Escribe un correo válido.' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? ''
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/restablecer`,
  })

  if (error) {
    console.error('[requestPasswordReset] error:', { status: error.status, code: error.code, message: error.message })
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return { error: 'Se enviaron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.' }
    }
    // Cualquier otro error (incluido "no existe ese usuario") se responde igual que el éxito
  }

  return { sent: true }
}

export type UpdatePasswordResult = { error: string } | null

/** Guarda la nueva contraseña del usuario que entró con el enlace de recuperación. */
export async function updatePassword(_prev: UpdatePasswordResult, formData: FormData): Promise<UpdatePasswordResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'El enlace ya expiró o ya se usó. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".' }
  }

  const password = (formData.get('password') as string) || ''
  const confirm = (formData.get('confirm_password') as string) || ''
  const problem = passwordProblem(password, user.email ?? undefined)
  if (problem) return { error: problem }
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('[updatePassword] error:', { status: error.status, code: error.code, message: error.message })
    if (error.code === 'same_password') return { error: 'La nueva contraseña debe ser distinta a la anterior.' }
    if (error.code === 'weak_password') return { error: 'Esa contraseña es muy débil. Elige una más segura.' }
    return { error: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.' }
  }

  // Se cierra la sesión del enlace: el usuario entra ya con su nueva contraseña
  await supabase.auth.signOut()
  redirect('/login?restablecida=1')
}
