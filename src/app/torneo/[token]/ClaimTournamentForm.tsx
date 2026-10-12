'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import { claimTournament } from '@/app/actions/superAdmin'

export default function ClaimTournamentForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(claimTournament, null)
  const done = !!state && 'success' in state

  useEffect(() => {
    if (done) router.push('/dashboard')
  }, [done, router])

  return (
    <form action={action} className="mt-6 flex flex-col gap-3 text-sm">
      <input type="hidden" name="token" value={token} />
      <p className="text-gray-400">
        El torneo quedará en la cuenta <strong className="text-white">{email}</strong>, en <strong className="text-white">Mis torneos</strong>.
      </p>
      {state && 'error' in state && (
        <p className="text-red-300 bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-left">{state.error}</p>
      )}
      <button
        disabled={pending || done}
        className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 font-bold py-3 rounded-lg"
      >
        {pending || done ? 'Un momento…' : 'Tomar el torneo'}
      </button>
    </form>
  )
}
