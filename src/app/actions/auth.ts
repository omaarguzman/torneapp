'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { friendlyAuthError, friendlyLoginError } from '@/lib/friendlyAuthError'
import { passwordProblem } from '@/lib/passwordPolicy'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    console.error('[login] signInWithPassword error:', {
      name: error.name,
      status: error.status,
      code: error.code,
      message: error.message,
    })
    return { error: friendlyLoginError(error.message, error.status) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  redirect(profile?.role === 'delegate' ? '/delegado' : '/dashboard')
}

export async function register(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (password !== formData.get('confirm')) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const problem = passwordProblem(password, email)
  if (problem) return { error: problem }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: friendlyAuthError(error.message) }

  if (!data.user?.identities || data.user.identities.length === 0) {
    return {
      error: 'Ya existe una cuenta con este correo. Si es tuya, inicia sesión en vez de registrarte de nuevo.',
    }
  }

  return { success: 'Revisa tu correo para confirmar tu cuenta.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}