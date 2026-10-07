'use client'

import { useActionState, useState } from 'react'
import { closeVenueDay } from '@/app/actions/fixtureEdits'
import EditResultNotice from '../EditResultNotice'

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400'

export default function CloseVenueForm({
  tournamentId,
  venues,
}: {
  tournamentId: string
  venues: { id: string; name: string }[]
}) {
  const [state, formAction, isPending] = useActionState(closeVenueDay, null)
  const [venueId, setVenueId] = useState('')
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Cancha</label>
          <select
            name="venue_id"
            value={venueId}
            onChange={(e) => {
              setVenueId(e.target.value)
              setConfirm(false)
            }}
            className={inputClass}
            required
          >
            <option value="">Elige...</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Fecha</label>
          <input
            type="date"
            name="closed_on"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setConfirm(false)
            }}
            className={inputClass}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-gray-400 text-xs mb-1">Motivo (opcional)</label>
        <input
          type="text"
          name="reason"
          value={reason}
          maxLength={120}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. evento privado, mantenimiento, lluvia"
          className={inputClass}
        />
      </div>

      <EditResultNotice
        state={state}
        confirm={confirm}
        onConfirmChange={setConfirm}
        confirmLabel="Entiendo, cerrar la cancha y mandar estos partidos a Pendientes"
      />

      <button
        type="submit"
        disabled={isPending}
        className="self-start bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {isPending ? 'Cerrando...' : '🚧 Cerrar cancha ese día'}
      </button>
    </form>
  )
}
