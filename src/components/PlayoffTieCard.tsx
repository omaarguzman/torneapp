import type { TieView } from '@/lib/playoffs/playoffData'

/** Una eliminatoria de la liguilla: equipos con su lugar, marcador de cada partido y quién avanza. */
export default function TieCard({ tie, name }: { tie: TieView; name: (id: string) => string }) {
  const o = tie.outcome
  const winner = o.status === 'decided' ? o.winner : null
  const row = (teamId: string, seed: number) => (
    <div className={`flex items-center justify-between gap-3 ${winner && winner !== teamId ? 'opacity-50' : ''}`}>
      <span className="truncate">
        <span className="text-gray-500 tabular-nums mr-2">{seed}.</span>
        <span className={winner === teamId ? 'text-amber-300 font-semibold' : 'text-white'}>{name(teamId)}</span>
      </span>
      <span className="flex gap-2 tabular-nums text-gray-300">
        {tie.matches.map((m) => (
          <span key={m.id} className="w-6 text-center">
            {m.scoreHome === null ? '–' : m.homeTeamId === teamId ? m.scoreHome : m.scoreAway}
          </span>
        ))}
      </span>
    </div>
  )
  return (
    <div className="bg-gray-900/70 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 text-sm">
      {row(tie.high.teamId, tie.high.seed)}
      {row(tie.low.teamId, tie.low.seed)}
      <p className="text-xs text-gray-500 mt-1">
        {o.status === 'pending' && (tie.legs === 2 ? 'Ida y vuelta · por jugar' : 'Partido único · por jugar')}
        {o.status === 'needs_penalties' && <span className="text-yellow-300">Empate global {o.aggregate[0]}–{o.aggregate[1]}: falta capturar los penales</span>}
        {o.status === 'decided' &&
          `Avanza ${name(o.winner)}${
            o.by === 'seed' ? ' (empate: mejor posicionado)' : o.by === 'penalties' ? ` (penales ${penaltiesText(tie)})` : tie.legs === 2 ? ` (global ${Math.max(...o.aggregate)}–${Math.min(...o.aggregate)})` : ''
          }`}
      </p>
    </div>
  )
}


/** Penales del último partido, del lado del local: "4–3". */
function penaltiesText(tie: TieView) {
  const last = tie.matches[tie.matches.length - 1]
  return last && last.penaltiesHome !== null ? `${last.penaltiesHome}–${last.penaltiesAway}` : ''
}
