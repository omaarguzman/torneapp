'use client'

import { useState, type ReactNode } from 'react'

export default function SectionTabs({
  venuesSection,
  teamsSection,
}: {
  venuesSection: ReactNode
  teamsSection: ReactNode
}) {
  const [active, setActive] = useState<'venues' | 'teams'>('venues')

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-gray-800">
        <button
          type="button"
          onClick={() => setActive('venues')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'venues'
              ? 'text-white border-green-500'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Canchas
        </button>
        <button
          type="button"
          onClick={() => setActive('teams')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === 'teams'
              ? 'text-white border-green-500'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Equipos
        </button>
      </div>

      <div hidden={active !== 'venues'}>{venuesSection}</div>
      <div hidden={active !== 'teams'}>{teamsSection}</div>
    </div>
  )
}
