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

export default function MatchReportForm({ token, match }: { token: string; match: MatchData }) {
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
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="events" value={eventsPayload} />

      {/* Marcador */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
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
        <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-white font-semibold text-sm mb-3">{team.name}</p>
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
              <div key={e.id} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
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
          className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 resize-none"
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

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {isPending ? 'Guardando...' : 'Guardar cédula'}
      </button>
    </form>
  )
}
