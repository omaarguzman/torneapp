'use server'

import { createClient } from '@/lib/supabase/server'

export type DelegateRegisterResult = { success: true } | { error: string } | null

export async function registerDelegate(
  _prevState: DelegateRegisterResult,
  formData: FormData
): Promise<DelegateRegisterResult> {
  const supabase = await createClient()

  const token = formData.get('token') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error || !data.user) {
    return { error: error?.message ?? 'No se pudo crear la cuenta.' }
  }

  const { error: claimError } = await supabase.rpc('claim_team_delegate', {
    p_token: token,
    p_user_id: data.user.id,
  })

  if (claimError) {
    return { error: 'La cuenta se creó, pero no se pudo vincular al equipo: ' + claimError.message }
  }

  return { success: true }
}
