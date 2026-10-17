'use client'

import { useActionState, useState } from 'react'
import { savePublicPage } from '@/app/actions/publicPage'
import { slugify } from '@/lib/slug'

/** Interruptor y link de la página pública (solo la tabla de posiciones). */
export default function PublicPageForm({
  tournamentId,
  tournamentName,
  enabled,
  slug,
}: {
  tournamentId: string
  tournamentName: string
  enabled: boolean
  slug: string | null
}) {
  const [state, action, pending] = useActionState(savePublicPage, null)
  const [on, setOn] = useState(enabled)
  const [value, setValue] = useState(slug ?? slugify(tournamentName))
  const [copied, setCopied] = useState(false)
  const clean = slugify(value)
  const savedOn = state && 'success' in state ? on : enabled
  const link = typeof window === 'undefined' ? `/t/${clean}` : `${window.location.origin}/t/${clean}`

  return (
    <section className="bg-gray-900/70 border border-white/10 rounded-xl p-5">
      <h3 className="font-condensed text-lg font-bold uppercase tracking-wide text-white">Página pública</h3>
      <p className="text-gray-400 text-sm mt-1">
        Un link para jugadores y afición, sin iniciar sesión, con la tabla de posiciones al día. No muestra jugadores, pagos ni
        datos de contacto.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <label htmlFor="public-enabled" className="flex items-center gap-3 cursor-pointer">
          <input id="public-enabled" name="enabled" type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="accent-amber-400" />
          <span className="text-white text-sm font-semibold">Activar página pública</span>
        </label>

        <label htmlFor="public-slug" className="flex flex-col gap-1 text-sm text-gray-400">
          Link
          <div className="flex items-center gap-1 bg-gray-950 border border-white/10 rounded-lg px-3">
            <span className="text-gray-500 whitespace-nowrap">/t/</span>
            <input
              id="public-slug"
              name="slug"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={60}
              className="flex-1 min-w-0 bg-transparent py-2 text-white focus:outline-none"
            />
          </div>
          {value && clean !== value && <span className="text-xs text-gray-500">Se guardará como: {clean}</span>}
        </label>

        {state && (
          <p className={`text-sm ${'error' in state ? 'text-red-300' : 'text-green-300'}`}>
            {'error' in state ? state.error : `✓ ${state.success}`}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 text-sm font-bold px-4 py-2 rounded-lg">
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
          {savedOn && clean && (
            <>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true), () => setCopied(false))}
                className="text-sm font-semibold text-amber-300 hover:text-amber-200"
              >
                {copied ? '✓ Link copiado' : '📋 Copiar link'}
              </button>
              <a href={`/t/${clean}`} target="_blank" rel="noreferrer" className="text-sm text-gray-400 hover:text-white">
                Abrir ↗
              </a>
            </>
          )}
        </div>
      </form>
    </section>
  )
}
