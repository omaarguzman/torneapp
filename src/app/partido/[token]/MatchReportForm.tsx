'use client'

import { useActionState, useState } from 'react'
import { submitMatchReport } from '@/app/actions/matchReport'
import type { MatchData } from './page'

type LocalEvent = {
  id: string
  playerId: string
  playerName: string
  teamId: string
  type: 'goal' | 'yellow_card' | 'red_card'
  minute: string
}

const eventLabels: Record<LocalEvent['type'], { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Gol' },
  yellow_card: { icon: '🟨', label: 'Amarilla' },
  red_card: { icon: '🟥', label: 'Roja directa' },
}

export default function MatchReportForm({
  token,
  match,
  readOnly = false,
  showAttendance = true,
}: {
  token: string
  match: MatchData
  readOnly?: boolean
  /** En el panel del admin la asistencia se edita aparte (incluso con la cédula validada). */
  showAttendance?: boolean
}) {
  const [attendance, setAttendance] = useState<Set<string>>(new Set(match.attendance))
  const [events, setEvents] = useState<LocalEvent[]>(
    match.events.map((e) => {
      const player = [...match.home_team.players, ...match.away_team.players].find((p) => p.id === e.player_id)
      return {
        id: e.id,
        playerId: e.player_id,
        playerName: player?.full_name ?? 'Jugador',
        teamId: e.team_id,
        type: e.type,
        minute: e.minute?.toString() ?? '',
      }
    })
  )
  const [scoreHome, setScoreHome] = useState(match.score_home?.toString() ?? '')
  const [scoreAway, setScoreAway] = useState(match.score_away?.toString() ?? '')
  const [state, formAction, isPending] = useActionState(submitMatchReport, null)
  const isResumption = match.status === 'scheduled' && match.suspended_minute !== null
  const [suspended, setSuspended] = useState(match.status === 'suspended')
  const [suspendedMinute, setSuspendedMinute] = useState(
    match.status === 'suspended' ? (match.suspended_minute?.toString() ?? '') : ''
  )
  const [suspensionReason, setSuspensionReason] = useState(
    match.status === 'suspended' ? (match.suspension_reason ?? '') : ''
  )

  function addEvent(playerId: string, playerName: string, teamId: string, type: LocalEvent['type']) {
    setEvents((prev) => [
      ...prev,
      { id: crypto.randomUUID(), playerId, playerName, teamId, type, minute: '' },
    ])
  }

  function updateMinute(id: string, minute: string) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, minute } : e)))
  }

  function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  function cardCount(playerId: string, type: 'yellow_card' | 'red_card') {
    return events.filter((e) => e.playerId === playerId && e.type === type).length
  }

  function playerStatus(playerId: string) {
    const yellows = cardCount(playerId, 'yellow_card')
    const reds = cardCount(playerId, 'red_card')
    if (reds >= 1) return { expelled: true, reason: 'Expulsado — roja directa' }
    if (yellows >= 2) return { expelled: true, reason: 'Expulsado — doble amarilla' }
    return { expelled: false, reason: null as string | null }
  }

  const goalsHome = events.filter((e) => e.type === 'goal' && e.teamId === match.home_team.id).length
  const goalsAway = events.filter((e) => e.type === 'goal' && e.teamId === match.away_team.id).length
  const homeScoreMismatch = scoreHome !== '' && parseInt(scoreHome) !== goalsHome
  const awayScoreMismatch = scoreAway !== '' && parseInt(scoreAway) !== goalsAway
  const canSubmit = !homeScoreMismatch && !awayScoreMismatch

  // Quien tiene gol o tarjeta asistió: se marca solo y no se puede desmarcar
  const forcedAttendance = new Set(events.map((e) => e.playerId))
  const attended = (playerId: string) => attendance.has(playerId) || forcedAttendance.has(playerId)

  function toggleAttendance(playerId: string) {
    setAttendance((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function markAll(playerIds: string[]) {
    setAttendance((prev) => new Set([...prev, ...playerIds]))
  }

  const attendancePayload = JSON.stringify([...new Set([...attendance, ...forcedAttendance])])

  const eventsPayload = JSON.stringify(
    events.map((e) => ({
      player_id: e.playerId,
      player_name: e.playerName,
      team_id: e.teamId,
      type: e.type,
      minute: e.minute,
    }))
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="events" value={eventsPayload} />
      {showAttendance && <input type="hidden" name="attendance" value={attendancePayload} />}

      {isResumption && (
        <p className="bg-sky-950 border border-sky-800 text-sky-300 text-sm rounded-lg px-4 py-3 mb-6">
          ↻ Reanudación: este partido se suspendió en el minuto {match.suspended_minute} con marcador{' '}
          {match.score_home ?? 0}–{match.score_away ?? 0}. Los goles y tarjetas de antes ya están capturados; agrega lo
          que pase a partir de ahí y guarda el resultado final.
        </p>
      )}

      {readOnly && (
        <p className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">
          ✓ Esta cédula ya fue validada por el administrador del torneo y no se puede modificar.
        </p>
      )}

      {/* disabled en el fieldset deshabilita todos los campos y botones que contiene */}
      <fieldset disabled={readOnly} className="flex flex-col gap-6 min-w-0 disabled:opacity-70">

      {/* Marcador */}
      <div className="bg-gray-900/70 border border-white/10 rounded-xl p-5">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Marcador final</p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-white text-sm text-center max-w-[100px] truncate">{match.home_team.name}</span>
            <input
              name="score_home"
              type="number"
              min={0}
              required
              value={scoreHome}
              onChange={(e) => setScoreHome(e.target.value)}
              className={`w-16 bg-gray-800 border text-white text-center text-2xl font-bold rounded-lg py-2 ${
                homeScoreMismatch ? 'border-red-600' : 'border-gray-700'
              }`}
            />
            <span className={`text-[11px] ${homeScoreMismatch ? 'text-red-400' : 'text-gray-600'}`}>
              Goles registrados: {goalsHome}
            </span>
          </div>
          <span className="text-gray-600 text-xl mt-6">–</span>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-white text-sm text-center max-w-[100px] truncate">{match.away_team.name}</span>
            <input
              name="score_away"
              type="number"
              min={0}
              required
              value={scoreAway}
              onChange={(e) => setScoreAway(e.target.value)}
              className={`w-16 bg-gray-800 border text-white text-center text-2xl font-bold rounded-lg py-2 ${
                awayScoreMismatch ? 'border-red-600' : 'border-gray-700'
              }`}
            />
            <span className={`text-[11px] ${awayScoreMismatch ? 'text-red-400' : 'text-gray-600'}`}>
              Goles registrados: {goalsAway}
            </span>
          </div>
        </div>
        {(homeScoreMismatch || awayScoreMismatch) && (
          <p className="text-red-400 text-xs text-center mt-3">
            Los goles registrados no coinciden con el marcador. Ajusta uno de los dos antes de guardar.
          </p>
        )}
      </div>

      {/* Roster de cada equipo con botones rápidos */}
      {[match.home_team, match.away_team].map((team) => (
        <div key={team.id} className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">{team.name}</p>
            {showAttendance && team.players.length > 0 && (
              <button
                type="button"
                onClick={() => markAll(team.players.map((p) => p.id))}
                className="text-amber-300 hover:text-amber-200 text-xs font-semibold"
              >
                Marcar todos asistieron
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {team.players.length === 0 && (
              <p className="text-gray-600 text-xs">Este equipo no tiene jugadores registrados.</p>
            )}
            {team.players.map((p) => {
              const yellows = cardCount(p.id, 'yellow_card')
              const reds = cardCount(p.id, 'red_card')
              const status = playerStatus(p.id)

              return (
                <div key={p.id} className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    {showAttendance && (
                      <input
                        type="checkbox"
                        checked={attended(p.id)}
                        disabled={forcedAttendance.has(p.id)}
                        onChange={() => toggleAttendance(p.id)}
                        title={forcedAttendance.has(p.id) ? 'Tiene gol o tarjeta: asistió' : 'Asistió'}
                        aria-label={`Asistió ${p.full_name}`}
                        className="w-4 h-4 accent-green-500 flex-shrink-0"
                      />
                    )}
                    <span className="text-gray-500 text-xs w-6 text-center flex-shrink-0">
                      {p.jersey_number ?? '—'}
                    </span>
                    <span className="text-gray-200 text-sm flex-1 truncate">{p.full_name}</span>
                    <button
                      type="button"
                      onClick={() => addEvent(p.id, p.full_name, team.id, 'goal')}
                      className="text-lg leading-none px-1.5 py-1 rounded hover:bg-gray-700 transition-colors"
                      title="Registrar gol"
                    >
                      ⚽
                    </button>
                    <button
                      type="button"
                      disabled={status.expelled}
                      onClick={() => addEvent(p.id, p.full_name, team.id, 'yellow_card')}
                      className="text-lg leading-none px-1.5 py-1 rounded hover:bg-gray-700 transition-colors disabled:opacity-25 disabled:pointer-events-none"
                      title={status.expelled ? 'Jugador ya expulsado' : 'Registrar tarjeta amarilla'}
                    >
                      🟨
                    </button>
                    <button
                      type="button"
                      disabled={status.expelled}
                      onClick={() => addEvent(p.id, p.full_name, team.id, 'red_card')}
                      className="text-lg leading-none px-1.5 py-1 rounded hover:bg-gray-700 transition-colors disabled:opacity-25 disabled:pointer-events-none"
                      title={status.expelled ? 'Jugador ya expulsado' : 'Registrar tarjeta roja directa'}
                    >
                      🟥
                    </button>
                  </div>
                  {status.expelled && (
                    <span
                      className={`inline-block mt-1.5 ml-8 text-[10px] px-2 py-0.5 rounded-full ${
                        reds >= 1
                          ? 'bg-red-950 text-red-400'
                          : 'bg-orange-950 text-orange-400'
                      }`}
                    >
                      {status.reason}
                    </span>
                  )}
                  {!status.expelled && yellows === 1 && (
                    <span className="inline-block mt-1.5 ml-8 text-[10px] px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-500">
                      1 amarilla
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Eventos registrados */}
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
          Eventos registrados ({events.length})
        </p>
        {events.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 bg-gray-900/70 border border-white/10 rounded-xl px-3 py-2">
                <span className="text-base">{eventLabels[e.type].icon}</span>
                <span className="text-gray-200 text-sm flex-1 truncate">{e.playerName}</span>
                <span className="text-gray-500 text-xs">{eventLabels[e.type].label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="min"
                  value={e.minute}
                  onChange={(ev) => updateMinute(e.id, ev.target.value)}
                  className="w-12 bg-gray-800 border border-gray-700 text-white text-xs text-center rounded px-1 py-1"
                />
                <button
                  type="button"
                  onClick={() => removeEvent(e.id)}
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-xs">
            Toca ⚽ 🟨 🟥 junto a un jugador para registrar goles y tarjetas.
          </p>
        )}
      </div>

      {/* Partido suspendido */}
      <div className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
        <label className="flex items-center gap-2 text-white text-sm font-semibold">
          <input
            type="checkbox"
            name="suspended"
            checked={suspended}
            onChange={(e) => setSuspended(e.target.checked)}
          />
          ⛔ El partido se suspendió antes de terminar
        </label>
        {suspended && (
          <div className="mt-3 grid grid-cols-[6rem_1fr] gap-2">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Minuto</label>
              <input
                type="number"
                name="suspended_minute"
                min={1}
                max={200}
                required
                value={suspendedMinute}
                onChange={(e) => setSuspendedMinute(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Motivo</label>
              <input
                type="text"
                name="suspension_reason"
                maxLength={200}
                required
                placeholder="Ej. lluvia, falta de luz, riña"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              />
            </div>
            <p className="col-span-2 text-gray-500 text-xs">
              Captura el marcador, goles y tarjetas hasta el momento de la suspensión. El administrador del torneo
              decidirá si se reanuda en otra fecha o se da un resultado final.
            </p>
          </div>
        )}
      </div>

      {/* Notas del árbitro */}
      <div>
        <label className="text-gray-500 text-xs uppercase tracking-wide mb-2 block">
          Notas del árbitro (opcional)
        </label>
        <textarea
          name="referee_notes"
          rows={3}
          defaultValue={match.referee_notes ?? ''}
          placeholder="Ej: la porra del equipo visitante agredió a un jugador al finalizar el partido..."
          className="w-full bg-gray-900/70 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 resize-none"
        />
      </div>

      {state && 'success' in state && (
        <p className="text-green-400 text-sm text-center">✓ Cédula guardada correctamente.</p>
      )}
      {state && 'error' in state && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      {!readOnly && (
        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:text-gray-700 disabled:cursor-not-allowed text-gray-950 font-semibold py-3 rounded-lg transition-colors"
        >
          {isPending ? 'Guardando...' : suspended ? 'Guardar cédula (partido suspendido)' : 'Guardar cédula'}
        </button>
      )}
      </fieldset>
    </form>
  )
}
