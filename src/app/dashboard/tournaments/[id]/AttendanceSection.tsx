import { setMinMatchesRequired } from '@/app/actions/attendance'
import { attendanceStatus, attendanceToneClass } from '@/lib/attendance'

type Player = { id: string; full_name: string; jersey_number: number | null }

export default function AttendanceSection({
  tournamentId,
  minRequired,
  teams,
  counts,
  playedByTeam,
}: {
  tournamentId: string
  minRequired: number | null
  teams: { id: string; name: string; players: Player[] }[]
  counts: Map<string, number>
  playedByTeam: Map<string, number>
}) {
  return (
    <section>
      <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white mb-4">Asistencia de jugadores</h2>

      <form
        action={setMinMatchesRequired}
        className="bg-gray-900/70 border border-white/10 rounded-xl p-4 mb-6 flex items-end gap-3 flex-wrap"
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-gray-300 block">Partidos mínimos para ser elegible</label>
          <p className="text-gray-500 text-xs mb-2">Por ejemplo, para jugar la liguilla. Déjalo vacío si el reglamento no lo pide.</p>
          <input
            name="min_matches_required"
            type="number"
            min={1}
            defaultValue={minRequired ?? ''}
            placeholder="Sin mínimo"
            className="w-32 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400"
          />
        </div>
        <button className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          Guardar regla
        </button>
      </form>

      <p className="text-gray-500 text-xs mb-3">
        La asistencia se marca en la cédula de cada partido. Puedes corregirla desde el fixture → &ldquo;Ver cédula&rdquo;.
      </p>

      {teams.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">Aún no hay equipos registrados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map((team) => {
            const notEligible = minRequired
              ? team.players.filter((p) => (counts.get(p.id) ?? 0) < minRequired).length
              : 0

            return (
              <details key={team.id} className="group bg-gray-900/70 border border-white/10 rounded-xl">
                <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{team.name}</p>
                    <p className="text-gray-500 text-xs">{playedByTeam.get(team.id) ?? 0} partidos jugados</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {minRequired && notEligible > 0 && (
                      <span className="bg-yellow-950 text-yellow-500 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                        {notEligible} sin el mínimo
                      </span>
                    )}
                    <span className="text-gray-600 text-xs transition-transform group-open:rotate-180">▾</span>
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-3 border-t border-gray-800 flex flex-col gap-1.5">
                  {team.players.length === 0 && <p className="text-gray-600 text-xs">Sin jugadores registrados.</p>}
                  {team.players.map((p) => {
                    const status = attendanceStatus(counts.get(p.id) ?? 0, minRequired)
                    return (
                      <div key={p.id} className="flex items-center gap-2.5 bg-gray-800/50 rounded-lg px-3 py-2">
                        <span className="text-gray-500 text-xs w-6 text-center">{p.jersey_number ?? '—'}</span>
                        <span className="text-gray-200 text-sm flex-1 truncate">{p.full_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${attendanceToneClass[status.tone]}`}>
                          {status.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}
