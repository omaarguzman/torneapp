'use client'

import { useState } from 'react'
import { createTournament } from '@/app/actions/tournaments'
import Link from 'next/link'

export default function NewTournamentPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const result = await createTournament(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al panel
        </Link>

        <h1 className="text-2xl font-black text-white mt-4 mb-6">Nuevo torneo</h1>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nombre del torneo</label>
            <input
              name="name"
              required
              placeholder="Copa Verano 2026"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Tipo de fútbol</label>
            <select
              name="sport_type"
              defaultValue="futbol_11"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value="futbol_11">Fútbol 11</option>
              <option value="futbol_7">Fútbol 7</option>
              <option value="futbol_5">Fútbol 5</option>
              <option value="futbol_salon">Fútbol Salón (Futsal)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Fecha de inicio</label>
              <input
                name="start_date"
                type="date"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Fecha de fin</label>
              <input
                name="end_date"
                type="date"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Reglamento (opcional, puedes agregarlo después)</label>
            <textarea
              name="rules"
              rows={4}
              placeholder="Ej: Cada equipo debe presentar mínimo 11 jugadores registrados. Tres tarjetas amarillas acumuladas generan una jornada de suspensión..."
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Formato del torneo</label>
            <select
              name="format"
              defaultValue="single"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value="single">Solo ida (una vuelta)</option>
              <option value="double">Ida y vuelta (dos vueltas)</option>
            </select>
          </div>

          <label className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              name="allow_schedule_priority"
              defaultChecked
              className="w-4 h-4 accent-green-500"
            />
            <span className="text-sm text-gray-300">
              Permitir que los equipos compren preferencia de horario
            </span>
          </label>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-300 mb-3">Suspensiones automáticas</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Amarillas acumuladas para suspender (vacío = desactivado)
                </label>
                <input
                  name="yellow_card_suspension_threshold"
                  type="number"
                  min={1}
                  placeholder="Ej. 3"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Partidos de suspensión por roja
                </label>
                <input
                  name="red_card_suspension_matches"
                  type="number"
                  min={0}
                  defaultValue={1}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creando...' : 'Crear torneo'}
          </button>
        </form>
      </div>
    </main>
  )
}