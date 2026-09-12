'use client'

import { useActionState } from 'react'
import { registerDelegate } from '@/app/actions/delegate'

export default function DelegateRegisterForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(registerDelegate, null)

  if (state && 'success' in state) {
    return (
      <div className="bg-green-950 border border-green-700 rounded-lg px-4 py-6 text-center">
        <p className="text-green-400 font-semibold">✓ Registro exitoso</p>
        <p className="text-green-300 text-sm mt-2">
          Revisa tu correo para confirmar tu cuenta. Después podrás iniciar sesión y ver tu equipo.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Correo electrónico</label>
        <input
          name="email"
          type="email"
          required
          placeholder="tu@correo.com"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Contraseña</label>
        <input
          name="password"
          type="password"
          required
          placeholder="Mínimo 6 caracteres"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Confirmar contraseña</label>
        <input
          name="confirm"
          type="password"
          required
          placeholder="Repite la contraseña"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
        />
      </div>

      {state && 'error' in state && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {isPending ? 'Creando cuenta...' : 'Registrarme como delegado'}
      </button>
    </form>
  )
}
