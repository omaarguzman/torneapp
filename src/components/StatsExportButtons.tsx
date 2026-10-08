'use client'

import { useState, useSyncExternalStore } from 'react'
import { buildStatsExcel, downloadBlob, exportFileName, type StatsExportData } from '@/lib/stats/exportStats'
import { pdfFromImages, shareOrDownload } from '@/lib/pdfFromImages'
import ExportPreview from './ExportPreview'

type Action = 'excel' | 'share'

/** ¿El navegador puede compartir archivos (menú de compartir del celular)? En el servidor, no. */
function canShareFiles() {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  return navigator.canShare({ files: [new File([''], 'probe.pdf', { type: 'application/pdf' })] })
}
const noSubscribe = () => () => {}

/**
 * Exportar estadísticas. El PDF (y lo que se comparte) son dos páginas sobre la
 * plantilla del rol de juegos: la tabla y, aparte, goleadores, mejor defensa y
 * tarjetas. El Excel (solo admin) lleva las tablas completas.
 */
export default function StatsExportButtons({
  tournamentId,
  data,
  allowExcel = false,
}: {
  tournamentId: string
  data: StatsExportData
  allowExcel?: boolean
}) {
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string[] | null>(null)
  const shareSupported = useSyncExternalStore(noSubscribe, canShareFiles, () => false)

  const fileName = exportFileName(data.tournamentName, 'pdf')
  // Marca de tiempo para no reutilizar una imagen vieja del navegador
  const pageUrls = () => {
    const v = Date.now()
    return [1, 2].map((p) => `/api/tabla/${tournamentId}?pagina=${p}&v=${v}`)
  }

  async function run(action: Action) {
    setBusy(action)
    setError('')
    try {
      if (action === 'excel') {
        downloadBlob(await buildStatsExcel(data), exportFileName(data.tournamentName, 'xlsx'))
      } else {
        await shareOrDownload(await pdfFromImages(pageUrls()), fileName, data.tournamentName)
      }
    } catch (err) {
      console.error('[StatsExportButtons] error:', err)
      setError('No se pudo generar el archivo. Inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  const buttonClass =
    'flex-1 sm:flex-none bg-gray-900 border border-gray-700 hover:border-gray-500 disabled:opacity-50 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors'

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {allowExcel && (
          <button type="button" onClick={() => run('excel')} disabled={busy !== null} className={buttonClass}>
            {busy === 'excel' ? 'Generando…' : 'Excel'}
          </button>
        )}
        <button type="button" onClick={() => setPreview(pageUrls())} disabled={busy !== null} className={buttonClass}>
          📄 PDF
        </button>
        {shareSupported && (
          <button
            type="button"
            onClick={() => run('share')}
            disabled={busy !== null}
            className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {busy === 'share' ? 'Preparando…' : 'Compartir'}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {preview && (
        <ExportPreview title={`Estadísticas · ${data.tournamentName}`} pages={preview} fileName={fileName} onClose={() => setPreview(null)} />
      )}
    </div>
  )
}
