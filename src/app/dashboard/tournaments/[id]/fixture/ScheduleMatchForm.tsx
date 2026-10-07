'use client'

import { useActionState, useState } from 'react'
import { scheduleMatch } from '@/app/actions/pendingMatches'
import {
  matchdayForDate,
  slotsForDate,
  type MatchdayWindow,
  type ScheduledMatch,
  type VenueClosure,
  type VenueSlot,
} from '@/lib/fixtures/scheduling'

type Venue = { id: string; name: string }

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400'

export default function ScheduleMatchForm({
  tournamentId,
  matchId,
  venues,
  slots,
  scheduled,
  matchdays,
  closures = [],
  initial,
  mode = 'schedule',
}: {
  tournamentId: string
  matchId: string
  venues: Venue[]
  slots: VenueSlot[]
  scheduled: ScheduledMatch[]
  matchdays: MatchdayWindow[]
  closures?: VenueClosure[]
  /** Valores actuales del partido cuando se va a mover */
  initial?: { date: string; venueId: string; startTime: string; endTime: string }
  mode?: 'schedule' | 'move'
}) {
  const [state, formAction, isPending] = useActionState(scheduleMatch, null)
  const [date, setDate] = useState(initial?.date ?? '')
  const [venueId, setVenueId] = useState(initial?.venueId ?? '')
  const [startTime, setStartTime] = useState(initial?.startTime.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(initial?.endTime.slice(0, 5) ?? '')
  const [matchdayId, setMatchdayId] = useState('')
  const [confirm, setConfirm] = useState(false)

  const venueName = new Map(venues.map((v) => [v.id, v.name]))
  const suggestions = date ? slotsForDate(date, slots, scheduled, matchId, closures) : []
  const autoMatchday = date ? matchdayForDate(matchdays, date) : null

  // Cualquier cambio invalida la confirmación de advertencias anteriores
  const touch = () => setConfirm(false)

  if (state && 'success' in state) {
    return <p className="text-green-400 text-sm">✓ Partido {mode === 'move' ? 'movido' : 'programado'}.</p>
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 mt-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="match_id" value={matchId} />

      <div>
        <label className="block text-gray-400 text-xs mb-1">Fecha</label>
        <input
          type="date"
          name="match_date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            touch()
          }}
          className={inputClass}
          required
        />
      </div>

      {date && (
        <div>
          <p className="text-gray-400 text-xs mb-1.5">Horarios de cancha ese día</p>
          {suggestions.length === 0 ? (
            <p className="text-gray-600 text-xs">
              Ninguna cancha tiene disponibilidad registrada ese día. Puedes capturar cancha y horario a mano.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => {
                const selected =
                  venueId === s.venue_id && startTime === s.start_time.slice(0, 5) && endTime === s.end_time.slice(0, 5)
                return (
                  <button
                    key={`${s.venue_id}-${s.start_time}`}
                    type="button"
                    disabled={s.occupied || s.closed}
                    onClick={() => {
                      setVenueId(s.venue_id)
                      setStartTime(s.start_time.slice(0, 5))
                      setEndTime(s.end_time.slice(0, 5))
                      touch()
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      s.occupied || s.closed
                        ? 'border-gray-800 text-gray-600 line-through cursor-not-allowed'
                        : selected
                          ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                          : 'border-gray-700 text-gray-300 hover:border-green-600'
                    }`}
                  >
                    {venueName.get(s.venue_id) ?? 'Cancha'} · {s.start_time.slice(0, 5)}
                    {s.closed ? ' (cerrada)' : s.occupied && ' (ocupado)'}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Cancha</label>
          <select
            name="venue_id"
            value={venueId}
            onChange={(e) => {
              setVenueId(e.target.value)
              touch()
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
          <label className="block text-gray-400 text-xs mb-1">Inicio</label>
          <input
            type="time"
            name="start_time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value)
              touch()
            }}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Fin</label>
          <input
            type="time"
            name="end_time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value)
              touch()
            }}
            className={inputClass}
            required
          />
        </div>
      </div>

      {matchdays.length > 0 && (
        <div>
          <label className="block text-gray-400 text-xs mb-1">Jornada</label>
          <select
            name="matchday_id"
            value={matchdayId}
            onChange={(e) => setMatchdayId(e.target.value)}
            className={inputClass}
          >
            <option value="">
              Automática{autoMatchday ? ` (J${autoMatchday.number}, según la fecha)` : ' (según la fecha)'}
            </option>
            {matchdays.map((md) => (
              <option key={md.id} value={md.id}>
                Jornada {md.number}
              </option>
            ))}
          </select>
        </div>
      )}

      {state && 'error' in state && (
        <p className="text-red-400 text-xs bg-red-950 border border-red-800 rounded-lg px-3 py-2">{state.error}</p>
      )}

      {state && 'warnings' in state && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-lg px-3 py-2">
          <ul className="text-yellow-400 text-xs flex flex-col gap-1">
            {state.warnings.map((w, i) => (
              <li key={i}>⚠️ {w}</li>
            ))}
          </ul>
          <label className="flex items-center gap-2 mt-2 text-yellow-200 text-xs">
            <input type="checkbox" name="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            Entiendo, programarlo de todas formas
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {isPending
          ? mode === 'move' ? 'Moviendo...' : 'Programando...'
          : mode === 'move' ? 'Mover partido' : 'Programar partido'}
      </button>
    </form>
  )
}
