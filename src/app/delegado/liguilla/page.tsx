import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveCurrentTeam } from '@/lib/delegateTeam'
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/playoffs/bracket'
import { loadPlayoffState } from '@/lib/playoffs/playoffData'
import TieCard from '@/components/PlayoffTieCard'

export const metadata: Metadata = { title: 'Liguilla' }

/** La llave de la liguilla del torneo del delegado (solo lectura). */
export default async function DelegatePlayoffsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { team } = await resolveCurrentTeam(supabase, user.id)
  if (!team) redirect('/delegado')
  if (team.access_blocked) redirect('/delegado')

  const state = await loadPlayoffState(supabase, team.tournament_id)
  const name = (id: string) => `${state.teamNames[id] ?? '—'}${id === team.id ? ' (tu equipo)' : ''}`
  const final = state.ties.find((t) => t.stage === 'final')
  const champion = final?.outcome.status === 'decided' ? final.outcome.winner : null
  const stages = STAGE_ORDER.filter((s) => state.ties.some((t) => t.stage === s))

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <p className="font-condensed text-sm uppercase tracking-widest text-amber-300">{team.tournament_name}</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-white mt-1 mb-6">Liguilla</h1>

        {stages.length === 0 ? (
          <p className="text-gray-400 text-sm">La liguilla todavía no empieza.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {champion && (
              <div className="text-center bg-amber-400/10 border border-amber-400/40 rounded-2xl p-6">
                <p className="text-4xl">🏆</p>
                <p className="font-condensed text-sm uppercase tracking-widest text-amber-300 mt-2">Campeón</p>
                <p className="font-display text-3xl uppercase text-white">{name(champion)}</p>
              </div>
            )}
            {stages.map((stage) => (
              <section key={stage}>
                <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white mb-3">{STAGE_LABEL[stage]}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {state.ties
                    .filter((t) => t.stage === stage)
                    .map((t) => (
                      <TieCard key={t.id} tie={t} name={name} />
                    ))}
                </div>
              </section>
            ))}
            <p className="text-gray-500 text-xs">
              El número junto a cada equipo es su lugar en la tabla general. En cada ronda juega el mejor contra el peor de los que
              siguen vivos. Las fechas y canchas están en el Calendario.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
