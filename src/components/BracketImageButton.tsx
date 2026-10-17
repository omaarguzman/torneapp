'use client'

import ShareImageButton from './ShareImageButton'
import { slugify } from '@/lib/slug'

/** Imagen de la llave de la liguilla: vista previa con descarga en PDF/compartir, o la imagen PNG. */
export default function BracketImageButton({ tournamentId, tournamentName }: { tournamentId: string; tournamentName: string }) {
  return (
    <ShareImageButton
      src={`/api/llave/${tournamentId}`}
      title={`Liguilla · ${tournamentName}`}
      fileName={`liguilla-${slugify(tournamentName)}`}
      label="🖼️ Imagen de la llave"
    />
  )
}
