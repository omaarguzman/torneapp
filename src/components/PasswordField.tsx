'use client'

import { useState } from 'react'
import { PASSWORD_RULES, passwordWarning } from '@/lib/passwordPolicy'

const inputClass =
  'w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors'

/** Campo de contraseña nueva con checklist en vivo. El servidor vuelve a validar. */
export default function PasswordField({ email }: { email?: string }) {
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)
  const warning = passwordWarning(value, email)

  return (
    <div>
      <label className="text-sm text-gray-400 mb-1 block">Contraseña</label>
      <div className="relative">
        <input
          name="password"
          type={visible ? 'text' : 'password'}
          required
          autoComplete="new-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Crea una contraseña segura"
          className={`${inputClass} pr-20`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value)
          return (
            <li key={rule.id} className={`text-xs flex items-center gap-1.5 ${ok ? 'text-green-400' : 'text-gray-500'}`}>
              <span aria-hidden>{ok ? '✓' : '○'}</span>
              {rule.label}
            </li>
          )
        })}
      </ul>
      {warning && <p className="text-yellow-500 text-xs mt-1.5">{warning}</p>}
    </div>
  )
}
