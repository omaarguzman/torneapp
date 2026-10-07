'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/actions/passwordReset'
import PasswordField from '@/components/PasswordField'

export default function NewPasswordForm({ email }: { email?: string }) {
  const [state, formAction, isPending] = useActionState(updatePassword, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <PasswordField email={email} />
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Confirmar contraseña</label>
        <input
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
        />
      </div>
      {state?.error && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {isPending ? 'Guardando...' : 'Guardar nueva contraseña'}
      </button>
    </form>
  )
}
