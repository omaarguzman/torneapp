'use client'

import { useState } from 'react'
import ExportPreview from './ExportPreview'

/** Imagen de la llave de la liguilla: vista previa con descarga en PDF/compartir, o la imagen PNG. */
export default function BracketImageButton({ tournamentId, tournamentName }: { tournamentId: string; tournamentName: string }) {
  const [preview, setPreview] = useState<string[] | null>(null)
  const src = `/api/llave/${tournamentId}`
  const slug = tournamentName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setPreview([`${src}?v=${Date.now()}`])}
        className="bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-bold px-4 py-2.5 rounded-xl"
      >
        🖼️ Imagen de la llave
      </button>
      <a href={src} download={`liguilla-${slug}.png`} className="text-sm font-semibold text-gray-300 hover:text-white px-2">
        ⬇ PNG
      </a>
      {preview && (
        <ExportPreview
          title={`Liguilla · ${tournamentName}`}
          pages={preview}
          fileName={`liguilla-${slug}.pdf`}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
