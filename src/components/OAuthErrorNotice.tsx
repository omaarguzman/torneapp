'use client'

import { useSearchParams } from 'next/navigation'
import { oauthErrorMessage } from '@/lib/oauthErrors'

export default function OAuthErrorNotice() {
  const message = oauthErrorMessage(useSearchParams().get('error'))
  if (!message) return null

  return (
    <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3 mb-4">{message}</p>
  )
}
