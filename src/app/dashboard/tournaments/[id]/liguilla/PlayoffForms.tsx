'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { savePlayoffConfig, type PlayoffResult } from '@/app/actions/playoffs'
import { STAGE_LABEL, stagesFor, type PlayoffConfig, type Stage } from '@/lib/playoffs/bracket'

function Feedback({ state }: { state: PlayoffResult }) {
  if (!state) return null
  return 'error' in state ? (
    <p className="text-red-300 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">{state.error}</p>
  ) : state.success !== 'ok' ? (
    <p className="text-green-300 text-sm">✓ {state.success}</p>
  ) : null
}

export function PlayoffConfigForm({
  tournamentId,
  options,
  config,
}: {
  tournamentId: string
  options: { qualifiers: number; directs: number[] }[]
  config: PlayoffConfig | null
}) {
  const [state, action, pending] = useActionState(savePlayoffConfig, null)
  const [enabled, setEnabled] = useState(!!config)
  const [qualifiers, setQualifiers] = useState(config?.qualifiers ?? options[options.length - 1]?.qualifiers ?? 4)
  const directs = options.find((o) => o.qualifiers === qualifiers)?.directs ?? []
  const [direct, setDirect] = useState(config && directs.includes(config.direct) ? config.direct : qualifiers)
  const safeDirect = directs.includes(direct) ? direct : qualifiers
  const stages: Stage[] = [...stagesFor({ qualifiers, direct: safeDirect }), 'tercer_lugar']

  const field = 'bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white'

  if (options.length === 0) {
    return <p className="text-gray-400 text-sm">Se necesitan al menos 4 equipos para tener liguilla.</p>
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <label htmlFor="playoff-enabled" className="flex items-center gap-3 cursor-pointer">
        <input id="playoff-enabled" name="enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-amber-400" />
        <span className="text-white font-semibold">Este torneo tiene liguilla</span>
      </label>

      {enabled && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-gray-400">
              Equipos en la fase final
              <select
                id="playoff-qualifiers"
                name="qualifiers"
                value={qualifiers}
                onChange={(e) => {
                  setQualifiers(Number(e.target.value))
                  setDirect(Number(e.target.value))
                }}
                className={field}
              >
                {options.map((o) => (
                  <option key={o.qualifiers} value={o.qualifiers}>
                    {o.qualifiers} ({STAGE_LABEL[o.qualifiers === 16 ? 'octavos' : o.qualifiers === 8 ? 'cuartos' : 'semifinal'].toLowerCase()})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-400">
              Pasan directo
              <select id="playoff-direct" name="direct" value={safeDirect} onChange={(e) => setDirect(Number(e.target.value))} className={field}>
                {directs.map((d) => (
                  <option key={d} value={d}>
                    {d === qualifiers
                      ? `Del 1 al ${qualifiers} (sin repechaje)`
                      : `Del 1 al ${d}; repechaje del ${d + 1} al ${2 * qualifiers - d}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-gray-400 mb-1">Cómo se juega cada ronda</legend>
            {stages.map((s) => (
              <div key={s} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-white text-sm">
                  {STAGE_LABEL[s]}
                  {s === 'tercer_lugar' && <span className="text-gray-500"> (opcional, se decide al terminar las semifinales)</span>}
                </span>
                <div className="flex gap-3 text-sm">
                  {[1, 2].map((n) => (
                    <label key={n} className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        name={`legs_${s}`}
                        value={n}
                        defaultChecked={(config?.legs[s] ?? 1) === n}
                        className="accent-amber-400"
                      />
                      {n === 1 ? 'Partido único' : 'Ida y vuelta'}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-gray-400 mb-1">Si una eliminatoria termina empatada (en el global)</legend>
            {(
              [
                ['seed', 'Avanza el mejor posicionado en la tabla general'],
                ['penalties', 'Se define por penales (se capturan en la cédula del último partido)'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="radio" name="tiebreak" value={value} defaultChecked={(config?.tiebreak ?? 'seed') === value} className="accent-amber-400" />
                {label}
              </label>
            ))}
          </fieldset>

          <p className="text-gray-500 text-xs">
            En cada ronda se reacomodan los equipos por su lugar en la tabla general y juega el mejor contra el peor. Es local el
            mejor posicionado; en ida y vuelta, cierra en casa. Las suspensiones pendientes se cumplen en la liguilla.
          </p>
        </>
      )}

      <Feedback state={state} />
      <button disabled={pending} className="self-start bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 text-sm font-bold px-5 py-2.5 rounded-xl">
        {pending ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </form>
  )
}

/** Botón con confirmación en la misma página para iniciar, avanzar o deshacer rondas. */
export function RoundActionButton({
  action,
  tournamentId,
  stage,
  label,
  confirmText,
  tone = 'primary',
  children,
}: {
  action: (prev: PlayoffResult, formData: FormData) => Promise<PlayoffResult>
  tournamentId: string
  stage?: string
  label: string
  confirmText: string
  tone?: 'primary' | 'danger'
  /** Campos extra del formulario (p. ej. la casilla del 3er lugar) */
  children?: ReactNode
}) {
  const [state, run, pending] = useActionState(action, null)
  const [asking, setAsking] = useState(false)
  const main =
    tone === 'danger'
      ? 'border border-red-800 text-red-300 hover:border-red-500'
      : 'bg-amber-400 hover:bg-amber-300 text-gray-950'

  return (
    <form action={run} className="flex flex-col gap-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      {stage && <input type="hidden" name="stage" value={stage} />}
      {children}
      {asking ? (
        <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-300 flex-1 min-w-[12rem]">{confirmText}</p>
          <button disabled={pending} className={`${main} disabled:opacity-50 text-sm font-bold px-4 py-2 rounded-lg`}>
            {pending ? 'Un momento…' : 'Sí, continuar'}
          </button>
          <button type="button" onClick={() => setAsking(false)} className="text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className={`${main} self-start text-sm font-bold px-5 py-2.5 rounded-xl`}>
          {label}
        </button>
      )}
      <Feedback state={state} />
    </form>
  )
}
