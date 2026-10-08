'use client'

/* eslint-disable @next/next/no-img-element -- vista previa de PNG generados al momento */
import { useEffect, useState } from 'react'
import { pdfFromImages, shareOrDownload } from '@/lib/pdfFromImages'

/**
 * Vista previa de un PDF antes de descargarlo o compartirlo: muestra cada
 * página tal como saldrá, con botones para descargar, compartir o cerrar.
 */
export default function ExportPreview({
  title,
  pages,
  fileName,
  onClose,
}: {
  title: string
  /** URL de la imagen de cada página */
  pages: string[]
  fileName: string
  onClose: () => void
}) {
  const [loaded, setLoaded] = useState(0)
  const [busy, setBusy] = useState<'download' | 'share' | null>(null)
  const [error, setError] = useState('')

  // Cerrar con Escape y bloquear el scroll de la página de atrás
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  async function run(action: 'download' | 'share') {
    setBusy(action)
    setError('')
    try {
      const blob = await pdfFromImages(pages)
      if (action === 'share') {
        await shareOrDownload(blob, fileName, title)
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  const ready = loaded >= pages.length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b border-white/10 bg-gray-950/90">
        <p className="font-condensed text-lg font-bold uppercase tracking-wide text-white flex-1 min-w-0 truncate">
          {title} <span className="text-gray-500 text-sm normal-case font-semibold">· {pages.length} página{pages.length > 1 ? 's' : ''}</span>
        </p>
        <button
          type="button"
          onClick={() => run('download')}
          disabled={busy !== null || !ready}
          className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          {busy === 'download' ? 'Generando…' : '⬇ Descargar PDF'}
        </button>
        <button
          type="button"
          onClick={() => run('share')}
          disabled={busy !== null || !ready}
          className="border border-white/20 hover:border-white/50 text-gray-100 disabled:text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {busy === 'share' ? 'Preparando…' : '📤 Compartir'}
        </button>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-sm font-semibold px-2 py-2" aria-label="Cerrar vista previa">
          ✕ Cerrar
        </button>
      </div>

      {error && <p className="mx-4 mt-3 text-red-300 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
      {!ready && <p className="text-center text-gray-400 text-sm mt-3">Generando la vista previa… ({loaded}/{pages.length})</p>}

      <div className="flex-1 overflow-y-auto p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="flex flex-col items-center gap-6">
          {pages.map((src, i) => (
            <div key={src} className="w-full max-w-xl">
              <p className="text-gray-500 text-xs font-condensed uppercase tracking-wide mb-1.5">Página {i + 1}</p>
              <img
                src={src}
                alt={`Página ${i + 1}`}
                onLoad={() => setLoaded((n) => n + 1)}
                onError={() => setError('No se pudo generar una de las páginas. Cierra y vuelve a intentarlo.')}
                className="w-full rounded-xl border border-white/10 shadow-2xl shadow-black/60 bg-gray-900 min-h-[20rem]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
