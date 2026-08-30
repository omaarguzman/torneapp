'use client'

import { useState } from 'react'
import { register } from '@/app/actions/auth'
import Link from 'next/link'

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
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-2xl font-black text-white mt-2">Torneapp</h1>
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
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Correo electrónico</label>
              <input
                name="email"
                type="email"
                required
                placeholder="tu@correo.com"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Contraseña</label>
              <input
                name="password"
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirmar contraseña</label>
              <input
                name="confirm"
                type="password"
                required
                placeholder="Repite la contraseña"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
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
              className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}