'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type NavLink = { href: string; label: string; icon?: string; badge?: number; exact?: boolean }

/** Links de la barra superior; el de la sección actual se resalta. En celular se desplazan de lado. */
export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              active ? 'bg-amber-400/15 text-amber-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {l.icon && <span aria-hidden="true">{l.icon}</span>}
            {l.label}
            {!!l.badge && (
              <span className="bg-red-600 text-white text-[10px] font-bold min-w-[1.1rem] text-center px-1 py-0.5 rounded-full leading-none">
                {l.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
