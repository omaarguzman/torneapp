'use client'

import { useState } from 'react'
import { createTeam } from '@/app/actions/teams'
import Link from 'next/link'

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type Slot = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
}

type Venue = {
  id: string
  name: string
  venue_slots: Slot[]
}

export default function TeamForm({
  tournamentId,
  venues,
  allowSchedulePriority,
}: {
  tournamentId: string
  venues: Venue[]
  allowSchedulePriority: boolean
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [wantsPriority, setWantsPriority] = useState(false)

  const slotOptions = venues.flatMap((v) =>
    v.venue_slots.map((s) => ({
      id: s.id,
      label: `${v.name} — ${dayNames[s.day_of_week]} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
    }))
  )

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const result = await createTeam(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Nombre del equipo</label>
        <input
          name="name"
          required
          placeholder="Los Tigres FC"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Correo del delegado</label>
        <input
          name="delegate_email"
          type="email"
          placeholder="delegado@correo.com"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Logo del equipo (opcional, máx. 2MB)</label>
        <input
          name="logo"
          type="file"
          accept="image/*"
          className="w-full bg-gray-900 border border-gray-700 text-gray-400 rounded-lg px-4 py-2.5 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-800 file:text-white file:text-xs"
        />
      </div>

      {allowSchedulePriority && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="has_scheduling_priority"
              checked={wantsPriority}
              onChange={(e) => setWantsPriority(e.target.checked)}
              className="w-4 h-4 accent-green-500"
            />
            <span className="text-sm text-gray-300">Este equipo pagó preferencia de horario</span>
          </label>

          {wantsPriority && (
            <div className="mt-3">
              {slotOptions.length > 0 ? (
                <select
                  name="preferred_slot_id"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5"
                >
                  <option value="">Selecciona el horario que escogió</option>
                  {slotOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-yellow-500 text-xs">
                  Este torneo aún no tiene canchas con horarios registrados.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Link
          href={`/dashboard/tournaments/${tournamentId}`}
          className="flex-1 text-center border border-gray-700 text-gray-400 hover:text-white py-3 rounded-lg transition-colors text-sm font-semibold"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Guardando...' : 'Crear equipo'}
        </button>
      </div>
    </form>
  )
}