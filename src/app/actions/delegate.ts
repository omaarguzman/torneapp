'use server'

import { createClient } from '@/lib/supabase/server'
import { friendlyAuthError } from '@/lib/friendlyAuthError'

export type DelegateRegisterResult = { success: true } | { error: string } | null

export async function registerDelegate(
  _prevState: DelegateRegisterResult,
  formData: FormData
): Promise<DelegateRegisterResult> {
  const supabase = await createClient()

  const token = formData.get('token') as string
  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error || !data.user) {
    console.error('[registerDelegate] signUp error:', error)
    return { error: friendlyAuthError(error?.message ?? '') }
  }

  // Supabase, por seguridad, no informa directamente si un correo ya está
  // registrado: en ese caso regresa un usuario "señuelo" con identities
  // vacío. Sin este chequeo, intentaríamos vincular un id que no existe.
  if (!data.user.identities || data.user.identities.length === 0) {
    return {
      error: 'Ya existe una cuenta con este correo. Si ya te habías registrado antes, cierra esta ventana e inicia sesión normalmente. Si no reconoces esa cuenta, usa un correo distinto.',
    }
  }

  const { error: claimError } = await supabase.rpc('claim_team_delegate', {
    p_token: token,
    p_user_id: data.user.id,
    p_delegate_name: fullName,
    p_delegate_email: email,
  })

  if (claimError) {
    console.error('[registerDelegate] claim_team_delegate error:', claimError)
    return {
      error: 'Tu cuenta se creó correctamente, pero no pudimos vincularla con tu equipo. Contacta al administrador del torneo para que verifique el enlace, o inténtalo de nuevo en unos minutos.',
    }
  }

  return { success: true }
}
