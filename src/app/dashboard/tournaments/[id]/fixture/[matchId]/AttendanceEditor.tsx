'use client'

import { useActionState, useState } from 'react'
import { saveAttendance } from '@/app/actions/attendance'
import type { MatchData } from '@/app/partido/[token]/page'

export default function AttendanceEditor({ tournamentId, match }: { tournamentId: string; match: MatchData }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(match.attendance))
  const [state, formAction, isPending] = useActionState(saveAttendance, null)
  const forced = new Set(match.events.map((e) => e.player_id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <form action={formAction} className="bg-gray-900/70 border border-white/10 rounded-xl p-5">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="match_id" value={match.id} />

      <p className="text-white font-semibold">Asistencia</p>
      <p className="text-gray-500 text-xs mt-1 mb-4">
        Solo tú puedes modificarla, incluso con la cédula validada. Quien tuvo gol o tarjeta cuenta como asistencia.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[match.home_team, match.away_team].map((team) => (
          <div key={team.id}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-300 text-sm font-semibold truncate">{team.name}</p>
              <button
                type="button"
                onClick={() => setSelected((prev) => new Set([...prev, ...team.players.map((p) => p.id)]))}
                className="text-amber-300 hover:text-amber-200 text-xs"
              >
                Todos
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {team.players.length === 0 && <p className="text-gray-600 text-xs">Sin jugadores registrados.</p>}
              {team.players.map((p) => {
                const isForced = forced.has(p.id)
                return (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="player_id"
                      value={p.id}
                      checked={isForced || selected.has(p.id)}
                      disabled={isForced}
                      onChange={() => toggle(p.id)}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-gray-500 text-xs w-5 text-center">{p.jersey_number ?? '—'}</span>
                    <span className="truncate">{p.full_name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
        <span className="text-xs">
          {state && 'success' in state && <span className="text-green-400">✓ Asistencia guardada.</span>}
          {state && 'error' in state && <span className="text-red-400">{state.error}</span>}
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 text-gray-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Guardando...' : 'Guardar asistencia'}
        </button>
      </div>
    </form>
  )
}
