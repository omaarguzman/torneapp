'use client'

import { useState, type ReactNode } from 'react'

export type Tab = {
  key: string
  label: string
  badge?: string
  content: ReactNode
}

export default function SectionTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key)

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active === tab.key
                ? 'text-white border-green-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="bg-red-950 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div key={tab.key} hidden={active !== tab.key}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
