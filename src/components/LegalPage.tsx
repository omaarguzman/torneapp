import Link from 'next/link'
import type { ReactNode } from 'react'
import Logo from '@/components/Logo'
import { LEGAL } from '@/lib/legal'

/** Marco de las páginas legales (aviso de privacidad y condiciones del servicio). */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex-1 bg-gray-950 text-gray-300">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo size={26} />
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/privacidad" className="text-gray-400 hover:text-white">
              Privacidad
            </Link>
            <Link href="/terminos" className="text-gray-400 hover:text-white">
              Condiciones
            </Link>
          </nav>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 leading-relaxed [&_h2]:font-condensed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1.5 [&_strong]:text-white">
        <h1 className="font-display text-4xl uppercase tracking-wide text-white">{title}</h1>
        <p className="text-sm text-gray-500">Última actualización: {LEGAL.updated}</p>
        {children}
      </article>
    </main>
  )
}
