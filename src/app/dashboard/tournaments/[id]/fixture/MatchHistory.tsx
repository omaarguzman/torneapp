import { changeKindLabels as kindLabels, describeSnapshot as describe, type ScheduleSnapshot as Snapshot } from '@/lib/fixtures/matchLabel'

export type MatchChange = {
  id: string
  kind: string
  source: string | null
  old: Snapshot
  new: Snapshot
  changed_at: string
  home_team_id: string | null
  away_team_id: string | null
}

function when(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
}

function ChangeRow({ c, teamNames }: { c: MatchChange; teamNames: Record<string, string> }) {
  return (
    <li className="text-xs">
      <span className="text-white">
        {teamNames[c.home_team_id ?? ''] ?? '—'} vs {teamNames[c.away_team_id ?? ''] ?? '—'}
      </span>{' '}
      <span className="text-gray-400">{kindLabels[c.kind] ?? c.kind}</span>
      <p className="text-gray-500 capitalize">
        {describe(c.old)} → <span className="text-gray-300">{describe(c.new)}</span>
      </p>
    </li>
  )
}

/**
 * Lista de cambios al calendario, del más reciente al más antiguo. Los cambios
 * hechos en un solo paso (actualizar fixture, recorrer jornada, cerrar cancha)
 * comparten fecha y origen, y se agrupan en un solo renglón desplegable.
 */
export default function MatchHistory({ changes, teamNames }: { changes: MatchChange[]; teamNames: Record<string, string> }) {
  if (changes.length === 0) {
    return (
      <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 text-sm">Todavía no hay cambios registrados en el calendario.</p>
      </div>
    )
  }

  const groups: MatchChange[][] = []
  for (const c of changes) {
    const last = groups[groups.length - 1]
    if (last && last[0].changed_at === c.changed_at && last[0].source === c.source && c.source) last.push(c)
    else groups.push([c])
  }

  return (
    <ul className="flex flex-col gap-2">
      {groups.map((g) => (
        <li key={g[0].id} className="bg-gray-900/70 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-gray-500 text-[11px] mb-1.5">
            {when(g[0].changed_at)}
            {g[0].source && <span className="text-yellow-500"> · {g[0].source}</span>}
          </p>
          {g.length === 1 ? (
            <ul>
              <ChangeRow c={g[0]} teamNames={teamNames} />
            </ul>
          ) : (
            <details>
              <summary className="cursor-pointer text-white text-xs">{g.length} partidos cambiaron ▾</summary>
              <ul className="mt-2 flex flex-col gap-2">
                {g.map((c) => (
                  <ChangeRow key={c.id} c={c} teamNames={teamNames} />
                ))}
              </ul>
            </details>
          )}
        </li>
      ))}
    </ul>
  )
}
