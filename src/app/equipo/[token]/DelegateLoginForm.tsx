'use client'

import { useActionState } from 'react'
import { acceptInviteWithPassword } from '@/app/actions/delegate'

const inputClass =
  'w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-400'

export default function DelegateLoginForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [state, formAction, isPending] = useActionState(acceptInviteWithPassword, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Tu nombre completo</label>
        <input name="full_name" defaultValue={defaultName} placeholder="Juan Pérez" className={inputClass} />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Correo electrónico</label>
        <input name="email" type="email" required placeholder="tu@correo.com" className={inputClass} />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Contraseña</label>
        <input name="password" type="password" required placeholder="••••••••" className={inputClass} />
      </div>

      {state && 'error' in state && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 font-semibold py-3 rounded-lg transition-colors"
      >
        {isPending ? 'Verificando...' : 'Iniciar sesión y aceptar invitación'}
      </button>
    </form>
  )
}
