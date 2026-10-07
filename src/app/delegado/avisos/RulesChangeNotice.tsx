import Link from 'next/link'
import { diffLines } from '@/lib/textDiff'
import { changedSettings, type RulesSnapshot } from '@/lib/rulesSnapshot'

/** Aviso de cambio de reglamento: muestra solo lo que cambió (nuevo en verde, eliminado tachado en rojo). */
export default function RulesChangeNotice({ oldS, newS }: { oldS: RulesSnapshot | null; newS: RulesSnapshot }) {
  const diff = diffLines(oldS?.rules, newS.rules)
  const textChanges = diff.filter((d) => d.type !== 'same')
  const settings = changedSettings(oldS, newS)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-white text-sm font-semibold">📜 Cambió el reglamento del torneo</p>

      {textChanges.length > 0 && (
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 flex flex-col gap-1">
          {textChanges.slice(0, 12).map((d, i) =>
            d.type === 'added' ? (
              <p key={i} className="text-green-300 text-xs bg-green-950/50 border-l-2 border-green-500 pl-2 py-0.5">
                <span className="font-bold mr-1">+</span>
                {d.text}
              </p>
            ) : (
              <p key={i} className="text-red-300/80 text-xs bg-red-950/40 border-l-2 border-red-600 pl-2 py-0.5 line-through">
                <span className="font-bold mr-1 no-underline">−</span>
                {d.text}
              </p>
            )
          )}
          {textChanges.length > 12 && <p className="text-gray-500 text-xs">…y {textChanges.length - 12} cambio(s) más.</p>}
        </div>
      )}

      {settings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {settings.map((s) => (
            <li key={s.key} className="text-xs bg-yellow-950/40 border-l-2 border-yellow-500 pl-2 py-1">
              <span className="text-yellow-300 font-semibold">{s.label}:</span>{' '}
              <span className="text-gray-500 line-through">{s.before}</span> → <span className="text-white">{s.value}</span>
            </li>
          ))}
        </ul>
      )}

      {textChanges.length === 0 && settings.length === 0 && (
        <p className="text-gray-400 text-xs">Se actualizó el reglamento.</p>
      )}

      <Link href="/delegado/reglamento" className="text-amber-300 hover:text-amber-200 text-xs">
        Ver reglamento completo →
      </Link>
    </div>
  )
}
