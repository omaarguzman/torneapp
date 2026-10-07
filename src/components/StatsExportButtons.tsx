'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  buildStatsExcel,
  buildStatsPdf,
  downloadBlob,
  exportFileName,
  type StatsExportData,
} from '@/lib/stats/exportStats'

type Action = 'excel' | 'pdf' | 'share'

/** ¿El navegador puede compartir archivos (menú de compartir del celular)? En el servidor, no. */
function canShareFiles() {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  return navigator.canShare({ files: [new File([''], 'probe.pdf', { type: 'application/pdf' })] })
}
const noSubscribe = () => () => {}

export default function StatsExportButtons({
  data,
  allowExcel = false,
}: {
  data: StatsExportData
  allowExcel?: boolean
}) {
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState('')
  const shareSupported = useSyncExternalStore(noSubscribe, canShareFiles, () => false)

  async function run(action: Action) {
    setBusy(action)
    setError('')
    try {
      if (action === 'excel') {
        downloadBlob(await buildStatsExcel(data), exportFileName(data.tournamentName, 'xlsx'))
      } else {
        const pdf = await buildStatsPdf(data)
        const fileName = exportFileName(data.tournamentName, 'pdf')
        if (action === 'pdf') {
          downloadBlob(pdf, fileName)
        } else {
          const file = new File([pdf], fileName, { type: 'application/pdf' })
          await navigator.share({ files: [file], title: data.tournamentName })
        }
      }
    } catch (err) {
      // Cerrar el menú de compartir no es un error real
      if (err instanceof DOMException && err.name === 'AbortError') return
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
        <button type="button" onClick={() => run('pdf')} disabled={busy !== null} className={buttonClass}>
          {busy === 'pdf' ? 'Generando…' : 'PDF'}
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
    </div>
  )
}
