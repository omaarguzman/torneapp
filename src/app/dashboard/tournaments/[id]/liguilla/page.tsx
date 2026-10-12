import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createNextPlayoffRound, startPlayoffs, undoPlayoffRound } from '@/app/actions/playoffs'
import { playoffOptions, STAGE_LABEL, STAGE_ORDER, type TiePlan } from '@/lib/playoffs/bracket'
import { currentSeeds, loadPlayoffState, plannedRound, type TieView } from '@/lib/playoffs/playoffData'
import { PlayoffConfigForm, RoundActionButton } from './PlayoffForms'

export const metadata: Metadata = { title: 'Liguilla' }

function TieCard({ tie, name }: { tie: TieView; name: (id: string) => string }) {
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
            o.by === 'seed' ? ' (empate: mejor posicionado)' : o.by === 'penalties' ? ' (penales)' : tie.legs === 2 ? ` (global ${Math.max(...o.aggregate)}–${Math.min(...o.aggregate)})` : ''
          }`}
      </p>
    </div>
  )
}

function Pairings({ ties, name }: { ties: TiePlan[]; name: (id: string) => string }) {
  return (
    <ul className="grid sm:grid-cols-2 gap-2 text-sm">
      {ties.map((t) => (
        <li key={t.position} className="bg-gray-900/70 border border-white/10 rounded-lg px-3 py-2 text-gray-300">
          <span className="text-gray-500 tabular-nums">{t.high.seed}.</span> {name(t.high.teamId)}{' '}
          <span className="text-gray-500">vs</span> <span className="text-gray-500 tabular-nums">{t.low.seed}.</span>{' '}
          {name(t.low.teamId)}
        </li>
      ))}
    </ul>
  )
}

export default async function PlayoffsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tournament }, state, { count: teamCount }, { data: regular }] = await Promise.all([
    supabase.from('tournaments').select('name').eq('id', id).single(),
    loadPlayoffState(supabase, id),
    supabase.from('teams').select('id', { count: 'exact', head: true }).eq('tournament_id', id),
    supabase.from('matches').select('status').eq('tournament_id', id).is('playoff_tie_id', null),
  ])
  if (!tournament) notFound()

  const name = (teamId: string) => state.teamNames[teamId] ?? '—'
  const seeds = state.started ? state.seeds : await currentSeeds(supabase, id)
  const next = plannedRound(state, seeds)
  const unplayed = (regular ?? []).filter((m) => m.status === 'scheduled' || m.status === 'pending' || m.status === 'suspended').length
  const final = state.ties.find((t) => t.stage === 'final')
  const champion = final?.outcome.status === 'decided' ? final.outcome.winner : null

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href={`/dashboard/tournaments/${id}`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al torneo
        </Link>
        <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-4">Liguilla</h1>
        <p className="text-gray-500 text-sm mb-6">{tournament.name}</p>

        {!state.started ? (
          <div className="flex flex-col gap-8">
            <section className="bg-gray-900/40 border border-white/10 rounded-2xl p-5">
              <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white mb-4">Configuración</h2>
              <PlayoffConfigForm tournamentId={id} options={playoffOptions(teamCount ?? 0)} config={state.config} />
            </section>

            {state.config && next && (
              <section className="flex flex-col gap-4">
                <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white">
                  {STAGE_LABEL[next.stage]} con la tabla de hoy
                </h2>
                <Pairings ties={next.ties} name={name} />
                {state.config.direct < state.config.qualifiers && (
                  <p className="text-sm text-gray-400">
                    Pasan directo: {seeds.slice(0, state.config.direct).map((s) => `${s.seed}. ${name(s.teamId)}`).join(', ')}.
                  </p>
                )}
                {unplayed > 0 && (
                  <p className="text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
                    Todavía hay {unplayed} partido{unplayed === 1 ? '' : 's'} de fase regular sin jugar. Si inicias ahora, la tabla
                    se congela tal como está y esos partidos ya no cambiarán los lugares de la liguilla.
                  </p>
                )}
                <RoundActionButton
                  action={startPlayoffs}
                  tournamentId={id}
                  label="Iniciar liguilla"
                  confirmText="Se congela la tabla general y se programa la primera ronda. Generar, actualizar e importar fixture quedan bloqueados."
                />
              </section>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {champion && (
              <div className="text-center bg-amber-400/10 border border-amber-400/40 rounded-2xl p-6">
                <p className="text-4xl">🏆</p>
                <p className="font-condensed text-sm uppercase tracking-widest text-amber-300 mt-2">Campeón</p>
                <p className="font-display text-3xl uppercase text-white">{name(champion)}</p>
              </div>
            )}

            {STAGE_ORDER.filter((s) => state.ties.some((t) => t.stage === s)).map((stage) => (
              <section key={stage}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white">{STAGE_LABEL[stage]}</h2>
                  {stage === state.currentStage && !state.currentHasPlayed && (
                    <RoundActionButton
                      action={undoPlayoffRound}
                      tournamentId={id}
                      stage={stage}
                      tone="danger"
                      label="Deshacer ronda"
                      confirmText={`Se borran los partidos de ${STAGE_LABEL[stage].toLowerCase()}${
                        stage === STAGE_ORDER.find((s) => state.ties.some((t) => t.stage === s)) ? ' y la liguilla vuelve a "sin iniciar"' : ''
                      }.`}
                    />
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {state.ties
                    .filter((t) => t.stage === stage)
                    .map((t) => (
                      <TieCard key={t.id} tie={t} name={name} />
                    ))}
                </div>
              </section>
            ))}

            {next && (
              <section className="flex flex-col gap-4 border-t border-white/10 pt-6">
                <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white">Siguiente: {STAGE_LABEL[next.stage]}</h2>
                <Pairings ties={next.ties} name={name} />
                <RoundActionButton
                  action={createNextPlayoffRound}
                  tournamentId={id}
                  label={`Programar ${STAGE_LABEL[next.stage].toLowerCase()}`}
                  confirmText="Se programan los partidos con tus canchas y horarios, a partir de la semana siguiente a la última jornada."
                />
              </section>
            )}

            <p className="text-gray-500 text-xs">
              Los partidos de la liguilla están en el <Link href={`/dashboard/tournaments/${id}/fixture`} className="text-amber-300">Fixture</Link>,
              cada ronda en su pestaña. Ahí se mueven, se aplazan y se captura su cédula como cualquier otro partido.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
