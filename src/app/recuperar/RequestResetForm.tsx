'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/app/actions/passwordReset'

export default function RequestResetForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null)

  if (state && 'sent' in state) {
    return (
      <div className="bg-green-950 border border-green-800 rounded-lg px-4 py-4 text-sm text-green-200">
        <p className="font-semibold">📬 Revisa tu correo</p>
        <p className="mt-1 text-green-200/80">
          Si el correo está registrado en Torneapp, te enviamos un enlace para restablecer tu contraseña. Puede tardar
          unos minutos; revisa también la carpeta de spam. El enlace vence en 1 hora.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Correo electrónico</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>
      {state && 'error' in state && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 font-semibold py-3 rounded-lg transition-colors"
      >
        {isPending ? 'Enviando...' : 'Enviar enlace'}
      </button>
    </form>
  )
}
