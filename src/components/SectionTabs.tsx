'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type Tab = {
  key: string
  label: string
  badge?: string
  content: ReactNode
  /** Fija la pestaña a la derecha, fuera de la parte que se desplaza (siempre visible) */
  pinned?: boolean
  /** Ícono para pantallas angostas; en pantallas grandes se muestra el texto */
  icon?: string
}

export default function SectionTabs({ tabs, defaultKey }: { tabs: Tab[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key)
  const barRef = useRef<HTMLDivElement>(null)

  // Con muchas pestañas (ej. 20 jornadas) la inicial puede quedar fuera de vista:
  // se centra moviendo solo la barra, sin desplazar la página.
  useEffect(() => {
    const bar = barRef.current
    const button = bar?.querySelector<HTMLButtonElement>(`[data-tab-key="${CSS.escape(active ?? '')}"]`)
    if (bar && button) {
      bar.scrollLeft = button.offsetLeft - bar.clientWidth / 2 + button.clientWidth / 2
    }
    // Solo al montar: después, el usuario controla el desplazamiento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollable = tabs.filter((t) => !t.pinned)
  const pinned = tabs.filter((t) => t.pinned)

  const renderButton = (tab: Tab) => (
    <button
      key={tab.key}
      data-tab-key={tab.key}
      type="button"
      title={tab.label}
      onClick={() => setActive(tab.key)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
        active === tab.key
          ? 'text-white border-green-500'
          : 'text-gray-500 border-transparent hover:text-gray-300'
      }`}
    >
      {tab.icon ? (
        <>
          <span className="sm:hidden">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </>
      ) : (
        tab.label
      )}
      {tab.badge && (
        <span className="bg-red-950 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">{tab.badge}</span>
      )}
    </button>
  )

  return (
    <div>
      <div className="flex mb-6">
        <div
          ref={barRef}
          className="relative flex-1 min-w-0 flex gap-2 border-b border-gray-800 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] [scrollbar-color:#374151_transparent]"
        >
          {scrollable.map(renderButton)}
        </div>
        {pinned.length > 0 && (
          <div className="shrink-0 flex border-b border-l border-gray-800 overflow-y-hidden">{pinned.map(renderButton)}</div>
        )}
      </div>

      {tabs.map((tab) => (
        <div key={tab.key} hidden={active !== tab.key}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
