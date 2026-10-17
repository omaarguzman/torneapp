'use client'

import { useState } from 'react'
import ExportPreview from './ExportPreview'

/**
 * Imagen generada por la app (llave, resultado…): vista previa con descarga en
 * PDF o compartir, y la imagen PNG. `compact` es un link chico para listas.
 */
export default function ShareImageButton({
  src,
  title,
  fileName,
  label,
  compact = false,
}: {
  src: string
  title: string
  /** Sin extensión */
  fileName: string
  label: string
  compact?: boolean
}) {
  const [preview, setPreview] = useState<string[] | null>(null)
  const open = () => setPreview([`${src}?v=${Date.now()}`])

  return (
    <>
      {compact ? (
        <button type="button" onClick={open} className="text-amber-300 hover:text-amber-200 text-[11px] font-semibold whitespace-nowrap">
          {label}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={open} className="bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-bold px-4 py-2.5 rounded-xl">
            {label}
          </button>
          <a href={src} download={`${fileName}.png`} className="text-sm font-semibold text-gray-300 hover:text-white px-2">
            ⬇ PNG
          </a>
        </div>
      )}
      {preview && <ExportPreview title={title} pages={preview} fileName={`${fileName}.pdf`} onClose={() => setPreview(null)} />}
    </>
  )
}

