'use client'

import { useActionState, useState } from 'react'
import { importPlayedMatchdays, type ImportMatchday } from '@/app/actions/fixtureImport'

type Team = { id: string; name: string }
type Venue = { id: string; name: string; defaultTime: string }
type Row = { key: number; home: string; away: string; scoreHome: string; scoreAway: string; time: string; venue: string }
type Day = { key: number; date: string; rows: Row[] }

let nextKey = 1

export default function ImportForm({
  tournamentId,
  teams,
  venues,
  maxRounds,
}: {
  tournamentId: string
  teams: Team[]
  venues: Venue[]
  maxRounds: number
}) {
  const perDay = Math.floor(teams.length / 2)
  const newRow = (): Row => ({
    key: nextKey++,
    home: '',
    away: '',
    scoreHome: '',
    scoreAway: '',
    time: venues[0]?.defaultTime ?? '09:00',
    venue: venues[0]?.id ?? '',
  })
  const newDay = (): Day => ({ key: nextKey++, date: '', rows: Array.from({ length: perDay }, newRow) })

  const [days, setDays] = useState<Day[]>(() => [newDay()])
  const [state, action, pending] = useActionState(importPlayedMatchdays, null)
  const name = new Map(teams.map((t) => [t.id, t.name]))

  const updateDay = (dayKey: number, change: (d: Day) => Day) => setDays((ds) => ds.map((d) => (d.key === dayKey ? change(d) : d)))
  const updateRow = (dayKey: number, rowKey: number, patch: Partial<Row>) =>
    updateDay(dayKey, (d) => ({ ...d, rows: d.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) }))

  const payload: ImportMatchday[] = days.map((d) => ({
    matches: d.rows.map((r) => ({
      home: r.home,
      away: r.away,
      scoreHome: r.scoreHome,
      scoreAway: r.scoreAway,
      date: d.date,
      time: r.time,
      venue: r.venue,
    })),
  }))

  const field = 'bg-gray-950 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white min-w-0'

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {days.map((day, i) => {
        const used = day.rows.flatMap((r) => [r.home, r.away]).filter(Boolean)
        const repeated = new Set(used.filter((t, idx) => used.indexOf(t) !== idx))
        const resting = teams.filter((t) => !used.includes(t.id))
        return (
          <section key={day.key} className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl uppercase text-white">Jornada {i + 1}</h2>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Fecha en que se jugó
                <input
                  id={`fecha-${day.key}`}
                  type="date"
                  required
                  value={day.date}
                  onChange={(e) => updateDay(day.key, (d) => ({ ...d, date: e.target.value }))}
                  className={field}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {day.rows.map((row) => (
                <div key={row.key} className="border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_3.2rem_auto_3.2rem_minmax(0,1fr)] items-center gap-2">
                    <select
                      aria-label="Equipo local"
                      value={row.home}
                      onChange={(e) => updateRow(day.key, row.key, { home: e.target.value })}
                      className={`${field} ${repeated.has(row.home) ? 'border-red-600' : ''}`}
                    >
                      <option value="">Local…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Goles del local"
                      inputMode="numeric"
                      maxLength={2}
                      value={row.scoreHome}
                      onChange={(e) => updateRow(day.key, row.key, { scoreHome: e.target.value.replace(/\D/g, '') })}
                      className={`${field} text-center`}
                    />
                    <span className="text-gray-500 text-sm">vs</span>
                    <input
                      aria-label="Goles del visitante"
                      inputMode="numeric"
                      maxLength={2}
                      value={row.scoreAway}
                      onChange={(e) => updateRow(day.key, row.key, { scoreAway: e.target.value.replace(/\D/g, '') })}
                      className={`${field} text-center`}
                    />
                    <select
                      aria-label="Equipo visitante"
                      value={row.away}
                      onChange={(e) => updateRow(day.key, row.key, { away: e.target.value })}
                      className={`${field} ${repeated.has(row.away) ? 'border-red-600' : ''}`}
                    >
                      <option value="">Visitante…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      aria-label="Hora"
                      type="time"
                      value={row.time}
                      onChange={(e) => updateRow(day.key, row.key, { time: e.target.value })}
                      className={field}
                    />
                    <select
                      aria-label="Cancha"
                      value={row.venue}
                      onChange={(e) => updateRow(day.key, row.key, { venue: e.target.value })}
                      className={`${field} flex-1`}
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => updateDay(day.key, (d) => ({ ...d, rows: d.rows.filter((r) => r.key !== row.key) }))}
                      className="text-gray-500 hover:text-red-400 text-xs px-2"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => updateDay(day.key, (d) => ({ ...d, rows: [...d.rows, newRow()] }))}
                className="text-amber-300 hover:text-amber-200 font-semibold"
              >
                + Agregar partido
              </button>
              <p className="text-gray-500">
                {repeated.size > 0 ? (
                  <span className="text-red-400">
                    {[...repeated].map((t) => name.get(t)).join(', ')} aparece{repeated.size === 1 ? '' : 'n'} dos veces
                  </span>
                ) : resting.length > 0 ? (
                  <>Sin partido: {resting.map((t) => t.name).join(', ')}</>
                ) : (
                  'Todos los equipos jugaron'
                )}
              </p>
            </div>
          </section>
        )
      })}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={days.length >= maxRounds - 1}
          onClick={() => setDays((ds) => [...ds, newDay()])}
          className="border border-white/15 hover:border-white/30 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          + Agregar jornada
        </button>
        {days.length > 1 && (
          <button
            type="button"
            onClick={() => setDays((ds) => ds.slice(0, -1))}
            className="text-gray-400 hover:text-red-400 text-sm font-semibold px-2"
          >
            Quitar J{days.length}
          </button>
        )}
      </div>

      {state?.error && <p className="text-red-300 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{state.error}</p>}

      <div className="border-t border-white/10 pt-5 flex flex-col gap-3">
        <label htmlFor="leave_open" className="flex items-start gap-3 bg-gray-900/70 border border-white/10 rounded-xl p-4 cursor-pointer">
          <input id="leave_open" name="leave_open" type="checkbox" className="mt-1 accent-amber-400" />
          <span className="text-sm">
            <span className="text-white font-semibold">Dejar las cédulas abiertas para capturarlas después</span>
            <span className="block text-gray-400 mt-0.5">
              Cada partido queda con su <strong className="text-white">📋 Link árbitro</strong> para registrar goleadores, tarjetas
              y asistencia. Cuando estén completas, valídalas desde el partido. El marcador cuenta en la tabla desde ya.
            </span>
          </span>
        </label>
        <p className="text-gray-400 text-sm">
          Sin la casilla, los partidos se guardan <strong className="text-white">jugados y validados</strong>, solo con el
          marcador (puedes completarlos después con <strong className="text-white">Reabrir cédula</strong>). Al guardar verás la
          propuesta para el resto del torneo antes de aplicarla.
        </p>
        <button
          disabled={pending}
          className="self-start bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 font-bold px-5 py-3 rounded-xl"
        >
          {pending ? 'Guardando…' : 'Guardar jornadas y planear el resto'}
        </button>
      </div>
    </form>
  )
}
