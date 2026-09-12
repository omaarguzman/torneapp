'use client'

import { useState } from 'react'
import { createPlayer } from '@/app/actions/players'
import Link from 'next/link'

export default function PlayerForm({
  tournamentId,
  teamId,
  backHref,
}: {
  tournamentId: string
  teamId: string
  backHref?: string
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const result = await createPlayer(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="team_id" value={teamId} />

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Nombre completo</label>
        <input
          name="full_name"
          required
          placeholder="Juan Pérez López"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Número</label>
          <input
            name="jersey_number"
            type="number"
            min={0}
            max={99}
            placeholder="10"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Posición (opcional)</label>
          <input
            name="position"
            placeholder="Delantero"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Fecha de nacimiento (opcional)</label>
          <input
            name="birth_date"
            type="date"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">CURP (opcional)</label>
          <input
            name="curp"
            maxLength={18}
            placeholder="XXXX000000XXXXXX00"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 uppercase"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Foto (opcional, máx. 2MB)</label>
        <input
          name="photo"
          type="file"
          accept="image/*"
          className="w-full bg-gray-900 border border-gray-700 text-gray-400 rounded-lg px-4 py-2.5 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-800 file:text-white file:text-xs"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Link
          href={backHref ?? `/dashboard/tournaments/${tournamentId}`}
          className="flex-1 text-center border border-gray-700 text-gray-400 hover:text-white py-3 rounded-lg transition-colors text-sm font-semibold"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Guardando...' : 'Agregar jugador'}
        </button>
      </div>
    </form>
  )
}
