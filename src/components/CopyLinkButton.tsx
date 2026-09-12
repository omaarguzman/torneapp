'use client'

import { useState } from 'react'

export default function CopyLinkButton({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}${path}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-gray-500 hover:text-green-400 text-[11px] transition-colors whitespace-nowrap"
    >
      {copied ? '✓ Copiado' : label}
    </button>
  )
}
