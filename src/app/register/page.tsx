'use client'

import { useState } from 'react'
import { register } from '@/app/actions/auth'
import Link from 'next/link'
import GoogleButton from '@/components/GoogleButton'
import { LogoMark } from '@/components/Logo'
import PasswordField from '@/components/PasswordField'

export default function RegisterPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError('')
    const result = await register(formData)
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setMessage(result.success)
    }
    setLoading(false)
  }

  return (
    <main className="auth-screen">
      <div className="w-full max-w-sm bg-gray-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl shadow-black/50">
        <div className="text-center mb-8">
          <LogoMark size={52} className="mx-auto" />
          <h1 className="font-display text-3xl uppercase tracking-wide mt-3">
            <span className="text-white">TORNE</span>
            <span className="text-amber-400">APP</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Crea tu cuenta de administrador</p>
        </div>

        {message ? (
          <div className="bg-green-950 border border-green-700 rounded-lg px-4 py-6 text-center">
            <p className="text-green-400 font-semibold">✓ Registro exitoso</p>
            <p className="text-green-300 text-sm mt-2">{message}</p>
            <Link href="/login" className="text-white text-sm underline mt-4 block">
              Volver al login
            </Link>
          </div>
        ) : (
          <>
          <GoogleButton />

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">o con tu correo</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <form action={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Correo electrónico</label>
              <input
                name="email"
                type="email"
                required
                placeholder="tu@correo.com"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <PasswordField />

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirmar contraseña</label>
              <input
                name="confirm"
                type="password"
                required
                placeholder="Repite la contraseña"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 disabled:cursor-not-allowed text-gray-950 font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          </>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-amber-300 hover:text-amber-200">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}