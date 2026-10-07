import Link from 'next/link'
import type { ReactNode } from 'react'
import Logo from '@/components/Logo'
import { logout } from '@/app/actions/auth'
import NavLinks, { type NavLink } from './NavLinks'

/**
 * Marco de las secciones con sesión (admin y delegado): barra superior con
 * logo, navegación y cerrar sesión, sobre el fondo oscuro con resplandor dorado.
 */
export default function AppShell({
  homeHref,
  links,
  subtitle,
  children,
}: {
  homeHref: string
  links: NavLink[]
  /** Texto bajo el logo (correo del admin, equipo del delegado) */
  subtitle?: string | null
  children: ReactNode
}) {
  return (
    <div className="relative flex-1 flex flex-col bg-gray-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(245,200,76,0.10),transparent_65%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href={homeHref} className="flex flex-col shrink-0">
            <Logo size={26} />
            {subtitle && <span className="text-[11px] text-gray-500 mt-0.5 max-w-[14rem] truncate">{subtitle}</span>}
          </Link>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 min-w-0">
            <NavLinks links={links} />
          </div>
          <form action={logout} className="ml-auto sm:ml-0">
            <button className="text-sm text-gray-500 hover:text-white transition-colors whitespace-nowrap">Cerrar sesión</button>
          </form>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col">{children}</div>
    </div>
  )
}
