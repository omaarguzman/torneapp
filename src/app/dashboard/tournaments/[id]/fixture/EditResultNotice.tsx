'use client'

import type { EditResult } from '@/app/actions/fixtureEdits'

/**
 * Muestra el resultado de una edición del fixture. Con advertencias, agrega la
 * casilla "confirm" que el formulario reenvía para aplicar de todas formas.
 */
export default function EditResultNotice({
  state,
  confirm,
  onConfirmChange,
  confirmLabel = 'Entiendo, aplicarlo de todas formas',
}: {
  state: EditResult
  confirm: boolean
  onConfirmChange: (value: boolean) => void
  confirmLabel?: string
}) {
  if (!state) return null

  if ('success' in state) {
    return <p className="text-green-400 text-xs bg-green-950 border border-green-800 rounded-lg px-3 py-2">✓ {state.success}</p>
  }

  if ('error' in state) {
    return <p className="text-red-400 text-xs bg-red-950 border border-red-800 rounded-lg px-3 py-2">{state.error}</p>
  }

  return (
    <div className="bg-yellow-950 border border-yellow-800 rounded-lg px-3 py-2">
      <ul className="text-yellow-400 text-xs flex flex-col gap-1">
        {state.warnings.map((w, i) => (
          <li key={i}>⚠️ {w}</li>
        ))}
      </ul>
      <label className="flex items-center gap-2 mt-2 text-yellow-200 text-xs">
        <input type="checkbox" name="confirm" checked={confirm} onChange={(e) => onConfirmChange(e.target.checked)} />
        {confirmLabel}
      </label>
    </div>
  )
}
