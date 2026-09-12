'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { friendlyAuthError } from '@/lib/friendlyAuthError'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: 'Correo o contraseña incorrectos.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  redirect(profile?.role === 'delegate' ? '/delegado' : '/dashboard')
}

export async function register(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

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