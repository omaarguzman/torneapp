'use client'

/* eslint-disable @next/next/no-img-element -- vista previa de un PNG generado al momento */
import { useActionState, useState } from 'react'
import { saveMatchdayNote, setMatchdayTemplate, type NoteResult } from '@/app/actions/rolImage'

export type TemplateOption = { value: string; label: string }

/**
 * Imagen oficial del rol de una jornada: vista previa, descargar y compartir.
 * Con `admin` también permite elegir la plantilla de la jornada y editar la
 * nota; el delegado ve siempre la plantilla que estableció el admin.
 */
export default function RolImageButton({
  matchdayId,
  matchdayNumber,
  admin,
}: {
  matchdayId: string
  matchdayNumber: number
  admin?: {
    tournamentId: string
    note: string | null
    /** Plantilla propia de la jornada ('' = la del torneo) */
    template: string
    tournamentTemplateLabel: string
    options: TemplateOption[]
  }
}) {
  const note = admin ? { tournamentId: admin.tournamentId, value: admin.note } : undefined
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState(admin?.template ?? '')
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [noteText, setNoteText] = useState(note?.value ?? '')
  const [noteState, noteAction, savingNote] = useActionState(async (prev: NoteResult, formData: FormData) => {
    const result = await saveMatchdayNote(prev, formData)
    if (result && 'success' in result) setVersion((v) => v + 1)
    return result
  }, null)

  const url = `/api/rol/${matchdayId}?v=${version}`
  const filename = `rol-jornada-${matchdayNumber}.png`

  async function share() {
    setSharing(true)
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Rol de la jornada ${matchdayNumber}` })
      } else {
        // En computadora normalmente no se puede compartir archivos: se descarga
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch {
      // El usuario canceló el menú de compartir
    } finally {
      setSharing(false)
    }
  }

  return (
    <details className="mb-4 group" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer list-none text-gray-400 hover:text-gray-200 text-xs font-semibold">
        🖼️ Imagen del rol <span className="group-open:hidden">▾</span>
        <span className="hidden group-open:inline">▴</span>
      </summary>

      {open && (
        <div className="mt-3 bg-gray-900/70 border border-white/10 rounded-xl p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {admin && (
              <select
                value={template}
                onChange={async (e) => {
                  const value = e.target.value
                  setTemplate(value)
                  setTemplateError(null)
                  const result = await setMatchdayTemplate(admin.tournamentId, matchdayId, value)
                  if (result && 'error' in result) setTemplateError(result.error)
                  else setVersion((v) => v + 1)
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                title="Plantilla de esta jornada"
              >
                <option value="">Plantilla del torneo ({admin.tournamentTemplateLabel})</option>
                {admin.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            <a
              href={`${url}&descargar=1`}
              download={filename}
              className="bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              ⬇ Descargar
            </a>
            <button
              type="button"
              onClick={share}
              disabled={sharing}
              className="border border-gray-700 hover:border-green-600 text-gray-200 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:text-gray-600"
            >
              {sharing ? 'Preparando...' : '📤 Compartir'}
            </button>
          </div>

          {templateError && <p className="text-red-400 text-xs">{templateError}</p>}

          {note && (
            <form action={noteAction} className="flex flex-col gap-2">
              <input type="hidden" name="tournament_id" value={note.tournamentId} />
              <input type="hidden" name="matchday_id" value={matchdayId} />
              <label className="text-gray-400 text-xs">Nota para esta jornada (opcional, aparece en la imagen)</label>
              <textarea
                name="note"
                rows={2}
                maxLength={200}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ej. Esta jornada ya se debe jugar con uniformes o playeras iguales"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingNote}
                  className="self-start border border-gray-700 hover:border-green-600 text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:text-gray-600"
                >
                  {savingNote ? 'Guardando...' : 'Guardar nota'}
                </button>
                {noteState && 'success' in noteState && <span className="text-green-400 text-xs">✓ Nota guardada</span>}
                {noteState && 'error' in noteState && <span className="text-red-400 text-xs">{noteState.error}</span>}
              </div>
            </form>
          )}

          <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir en tamaño completo">
            <img
              key={url}
              src={url}
              alt={`Rol de la jornada ${matchdayNumber}`}
              className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-950 min-h-40"
            />
          </a>
          <p className="text-gray-600 text-[11px]">La imagen tarda unos segundos en generarse. Tócala para verla completa.</p>
        </div>
      )}
    </details>
  )
}
