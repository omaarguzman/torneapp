import { setChargePaid, deleteCharge } from '@/app/actions/charges'
import { chargeLabel, formatMoney, totalAmount, type Charge } from '@/lib/charges'
import ChargeForm from './ChargeForm'

export default function PaymentsSection({
  tournamentId,
  teams,
  charges,
}: {
  tournamentId: string
  teams: { id: string; name: string }[]
  charges: Charge[]
}) {
  const pendingTotal = totalAmount(charges.filter((c) => !c.paid))

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Pagos por equipo</h2>
        <span className="text-sm text-gray-400">
          Por cobrar: <span className="text-white font-semibold">{formatMoney(pendingTotal)}</span>
        </span>
      </div>

      <p className="text-gray-500 text-xs mb-4">
        Mientras un equipo tenga cargos pendientes, su delegado no podrá ver la tabla, las estadísticas ni los
        marcadores del fixture.
      </p>

      <div className="mb-6">
        <ChargeForm tournamentId={tournamentId} teams={teams} />
      </div>

      {teams.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">Aún no hay equipos registrados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map((team) => {
            const teamCharges = charges.filter((c) => c.team_id === team.id)
            const pending = teamCharges.filter((c) => !c.paid)
            const paid = teamCharges.filter((c) => c.paid)

            return (
              <details key={team.id} className="group bg-gray-900 border border-gray-800 rounded-lg">
                <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-white font-semibold truncate">{team.name}</span>
                  <div className="flex items-center gap-3">
                    {pending.length > 0 ? (
                      <span className="bg-red-950 text-red-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                        🔒 Debe {formatMoney(totalAmount(pending))}
                      </span>
                    ) : (
                      <span className="bg-green-950 text-green-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                        Al corriente
                      </span>
                    )}
                    <span className="text-gray-600 text-xs transition-transform group-open:rotate-180">▾</span>
                  </div>
                </summary>

                <div className="px-4 pb-4 pt-3 border-t border-gray-800 flex flex-col gap-1.5">
                  {teamCharges.length === 0 && (
                    <p className="text-gray-600 text-xs">Sin cargos registrados.</p>
                  )}

                  {[...pending, ...paid].map((charge) => (
                    <div
                      key={charge.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                        charge.paid ? 'bg-gray-800/30' : 'bg-gray-800/60'
                      }`}
                    >
                      <span className={`text-sm flex-1 truncate ${charge.paid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                        {chargeLabel(charge)}
                      </span>
                      <span className={`text-sm tabular-nums ${charge.paid ? 'text-gray-500' : 'text-white'}`}>
                        {formatMoney(Number(charge.amount))}
                      </span>
                      <form action={setChargePaid}>
                        <input type="hidden" name="tournament_id" value={tournamentId} />
                        <input type="hidden" name="charge_id" value={charge.id} />
                        <input type="hidden" name="paid" value={charge.paid ? 'false' : 'true'} />
                        <button
                          className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                            charge.paid
                              ? 'text-gray-500 hover:text-gray-300'
                              : 'bg-green-600 hover:bg-green-500 text-white'
                          }`}
                        >
                          {charge.paid ? 'Deshacer' : 'Marcar pagado'}
                        </button>
                      </form>
                      <form action={deleteCharge}>
                        <input type="hidden" name="tournament_id" value={tournamentId} />
                        <input type="hidden" name="charge_id" value={charge.id} />
                        <button className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                      </form>
                    </div>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}
