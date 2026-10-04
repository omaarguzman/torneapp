'use client'

import { useState } from 'react'
import DelegateRegisterForm from './DelegateRegisterForm'
import DelegateLoginForm from './DelegateLoginForm'

export default function EmailInviteForms({
  token,
  defaultName,
  defaultEmail,
}: {
  token: string
  defaultName: string
  defaultEmail: string
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
      active ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
    }`

  return (
    <div>
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 mb-5">
        <button type="button" onClick={() => setMode('new')} className={tabClass(mode === 'new')}>
          Soy nuevo
        </button>
        <button type="button" onClick={() => setMode('existing')} className={tabClass(mode === 'existing')}>
          Ya tengo cuenta
        </button>
      </div>

      {mode === 'new' ? (
        <DelegateRegisterForm token={token} defaultName={defaultName} defaultEmail={defaultEmail} />
      ) : (
        <DelegateLoginForm token={token} defaultName={defaultName} />
      )}
    </div>
  )
}
