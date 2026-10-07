'use client'

import { useActionState, useState } from 'react'
import { shiftMatchday } from '@/app/actions/fixtureEdits'
import EditResultNotice from './EditResultNotice'

const WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function ShiftMatchdayForm({
  tournamentId,
  matchdayNumber,
  isLast,
}: {
  tournamentId: string
  matchdayNumber: number
  isLast: boolean
}) {
  const [state, formAction, isPending] = useActionState(shiftMatchday, null)
  const [weeks, setWeeks] = useState('1')
  const [cascade, setCascade] = useState(true)

  return (
    <details className="mb-4 group">
      <summary className="cursor-pointer list-none text-gray-400 hover:text-gray-200 text-xs font-semibold">
        📅 Recorrer jornada <span className="group-open:hidden">▾</span>
        <span className="hidden group-open:inline">▴</span>
      </summary>
      <form
        action={formAction}
        onSubmit={(e) => {
          const n = parseInt(weeks, 10)
          const which = cascade && !isLast ? `la jornada ${matchdayNumber} y todas las siguientes` : `la jornada ${matchdayNumber}`
          const ok = window.confirm(
            `¿Recorrer ${which} ${Math.abs(n)} semana(s) ${n > 0 ? 'hacia adelante' : 'hacia atrás'}? Solo se mueven partidos sin jugar.`
          )
          if (!ok) e.preventDefault()
        }}
        className="mt-3 bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col gap-3"
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="matchday_number" value={matchdayNumber} />
        <div className="flex items-center gap-2 flex-wrap">
          <select
            name="weeks"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
          >
            {WEEK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} semana{n > 1 ? 's' : ''} después
              </option>
            ))}
            {WEEK_OPTIONS.map((n) => (
              <option key={-n} value={-n}>
                {n} semana{n > 1 ? 's' : ''} antes
              </option>
            ))}
          </select>
          {!isLast && (
            <label className="flex items-center gap-2 text-gray-300 text-xs">
              <input type="checkbox" name="cascade" checked={cascade} onChange={(e) => setCascade(e.target.checked)} />
              Recorrer también las jornadas siguientes
            </label>
          )}
        </div>
        <p className="text-gray-500 text-[11px]">
          Ejemplo: por un día festivo, recorre esta jornada y las siguientes 1 semana para que el torneo no tenga partidos
          ese fin de semana.
        </p>
        <EditResultNotice state={state} confirm={false} onConfirmChange={() => {}} />
        <button
          type="submit"
          disabled={isPending}
          className="self-start bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Recorriendo...' : 'Recorrer'}
        </button>
      </form>
    </details>
  )
}
