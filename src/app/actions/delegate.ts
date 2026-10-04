'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DELEGATE_TEAM_COOKIE } from '@/lib/delegateTeam'
import { createClient } from '@/lib/supabase/server'
import { friendlyAuthError, friendlyLoginError } from '@/lib/friendlyAuthError'
import { claimErrorCode, oauthErrorMessage } from '@/lib/oauthErrors'
import { passwordProblem } from '@/lib/passwordPolicy'

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

  const problem = passwordProblem(password, email)
  if (problem) return { error: problem }

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
      error: 'Ya existe una cuenta con este correo. Usa la pestaña "Ya tengo cuenta" para iniciar sesión y aceptar la invitación.',
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
    const code = claimErrorCode(claimError.message)
    return {
      error:
        code === 'GOOGLE'
          ? 'Tu cuenta se creó correctamente, pero no pudimos vincularla con tu equipo. Contacta al administrador del torneo para que verifique el enlace, o inténtalo de nuevo en unos minutos.'
          : oauthErrorMessage(code)!,
    }
  }

  return { success: true }
}

export async function selectDelegateTeam(formData: FormData) {
  const supabase = await createClient()
  const teamId = formData.get('team_id') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('delegate_id', user.id)
    .maybeSingle()

  if (team) {
    ;(await cookies()).set(DELEGATE_TEAM_COOKIE, team.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    })
  }

  redirect('/delegado')
}

export async function acceptInviteWithPassword(
  _prevState: DelegateRegisterResult,
  formData: FormData
): Promise<DelegateRegisterResult> {
  const supabase = await createClient()

  const token = formData.get('token') as string
  const fullName = ((formData.get('full_name') as string) || '').trim() || null

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    console.error('[acceptInviteWithPassword] signIn error:', error.status, error.message)
    return { error: friendlyLoginError(error.message, error.status) }
  }

  const { error: claimError } = await supabase.rpc('claim_team_delegate_self', {
    p_token: token,
    p_delegate_name: fullName,
  })

  if (claimError) {
    console.error('[acceptInviteWithPassword] claim error:', claimError)
    const code = claimErrorCode(claimError.message)
    // Igual que en el callback de Google: una cuenta de admin conserva su sesión,
    // cualquier otro fallo la cierra para no dejarla a medias en esta página
    if (code !== 'ADMIN_ACCOUNT') await supabase.auth.signOut()
    return { error: oauthErrorMessage(code)! }
  }

  redirect('/delegado')
}
