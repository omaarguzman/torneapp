import type { DisciplineReport, DisciplineRow } from '@/lib/stats/disciplineData'
import type { SuspensionReason } from '@/lib/stats/suspensions'

const reasonLabels: Record<SuspensionReason, string> = {
  yellow_accumulation: 'acumulación de amarillas',
  red_card: 'roja directa',
  double_yellow: 'doble amarilla',
}

function nextLabel(next: NonNullable<DisciplineRow['next']>) {
  const date = next.date
    ? new Date(next.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    : null
  return [next.matchday ? `J${next.matchday}` : null, `vs ${next.opponent}`, date].filter(Boolean).join(' · ')
}

function Row({ r, threshold }: { r: DisciplineRow; threshold: number | null }) {
  const name = `${r.jersey !== null ? `#${r.jersey} ` : ''}${r.playerName}`
  if (r.status === 'suspended') {
    return (
      <li className="bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
        <p className="text-red-300 text-sm font-semibold">
          🚫 {name} <span className="font-normal text-red-400/80">— {r.reason ? reasonLabels[r.reason] : 'suspendido'}</span>
        </p>
        <p className="text-red-200/80 text-xs mt-0.5">
          Le {r.remaining === 1 ? 'falta 1 partido' : `faltan ${r.remaining} partidos`} de suspensión
          {r.next ? <> · no juega: <span className="capitalize">{nextLabel(r.next)}</span></> : ' (aún sin partido programado)'}
        </p>
      </li>
    )
  }
  if (r.status === 'limit') {
    return (
      <li className="bg-yellow-950/40 border border-yellow-800 rounded-lg px-3 py-2">
        <p className="text-yellow-300 text-sm font-semibold">⚠️ {name}</p>
        <p className="text-yellow-200/80 text-xs mt-0.5">
          {r.yellows} de {threshold} amarillas: con la siguiente queda suspendido
        </p>
      </li>
    )
  }
  return (
    <li className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
      <span className="text-gray-300">{name}</span>
      <span className="text-yellow-500 text-xs whitespace-nowrap">
        🟨 {r.yellows}
        {threshold ? ` de ${threshold}` : ''}
      </span>
    </li>
  )
}

/**
 * Quién no puede jugar los próximos partidos y quién está cerca del límite de
 * amarillas, por equipo. Se recalcula con las cédulas capturadas.
 */
export default function DisciplinePanel({ report, emptyText }: { report: DisciplineReport; emptyText?: string }) {
  const withRows = report.teams.filter((t) => t.rows.length > 0)
  const suspendedCount = report.teams.reduce((n, t) => n + t.rows.filter((r) => r.status === 'suspended').length, 0)
  const limitCount = report.teams.reduce((n, t) => n + t.rows.filter((r) => r.status === 'limit').length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap text-xs">
        <span className="bg-red-950 text-red-300 px-2.5 py-1 rounded-full">🚫 {suspendedCount} suspendido(s)</span>
        {report.threshold && (
          <span className="bg-yellow-950 text-yellow-300 px-2.5 py-1 rounded-full">⚠️ {limitCount} al límite de amarillas</span>
        )}
        <span className="text-gray-500 px-1 py-1">
          {report.threshold ? `Suspensión por acumulación: ${report.threshold} amarillas.` : 'Este torneo no suspende por acumulación de amarillas.'}
        </span>
      </div>

      {withRows.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">{emptyText ?? 'Nadie está suspendido ni amonestado por ahora.'}</p>
        </div>
      ) : (
        withRows.map((t) => (
          <section key={t.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <h3 className="text-white font-semibold text-sm mb-2">{t.name}</h3>
            <ul className="flex flex-col gap-1.5">
              {t.rows.map((r) => (
                <Row key={r.playerId} r={r} threshold={report.threshold} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
