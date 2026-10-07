'use client'

import { useEffect, useState } from 'react'

/** Palabra que cambia cada cierto tiempo con una pequeña animación. */
export default function RotatingWord({ words, interval = 2400 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [words.length, interval])

  return (
    <span key={i} className="inline-block animate-word text-gold-shimmer">
      {words[i]}
    </span>
  )
}
