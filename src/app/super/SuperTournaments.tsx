'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState, useTransition } from 'react'
import {
  createClaimLink,
  deleteTournamentAsSuper,
  setTournamentPaused,
  transferTournament,
  type SuperResult,
} from '@/app/actions/superAdmin'

export type SuperTournament = {
  id: string
  name: string
  logo_url: string | null
  start_date: string | null
  created_at: string
  disabled_at: string | null
  admin_id: string
  admin_email: string | null
  teams: number
  matches: number
  played: number
  last_activity: string
}

const dateLabel = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

type Panel = 'link' | 'transfer' | 'delete' | null

function Feedback({ state }: { state: SuperResult }) {
  if (!state) return null
  return 'error' in state ? (
    <p className="text-red-300 text-sm">{state.error}</p>
  ) : (
    <p className="text-green-300 text-sm">✓ {state.success}</p>
  )
}

function ClaimLinkPanel({ tournamentId }: { tournamentId: string }) {
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-400">
        Quien abra este link e inicie sesión queda como admin del torneo. Vale 7 días y se usa una sola vez.
      </p>
      {link ? (
        <div className="flex gap-2">
          <input readOnly value={link} className="flex-1 min-w-0 bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200" />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true), () => setCopied(false))}
            className="bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-bold px-3 rounded-lg"
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await createClaimLink(tournamentId)
              if (result && 'token' in result) setLink(`${window.location.origin}/torneo/${result.token}`)
              else setError(result?.error ?? 'No se pudo generar el link.')
            })
          }
          className="self-start bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 text-sm font-bold px-4 py-2 rounded-lg"
        >
          {pending ? 'Generando…' : 'Generar link'}
        </button>
      )}
      {error && <p className="text-red-300 text-sm">{error}</p>}
    </div>
  )
}

function TransferPanel({ tournamentId }: { tournamentId: string }) {
  const [state, action, pending] = useActionState(transferTournament, null)
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <label htmlFor={`transfer-${tournamentId}`} className="text-sm text-gray-400">
        Correo de la cuenta de Torneapp que será la nueva dueña:
      </label>
      <div className="flex gap-2">
        <input
          id={`transfer-${tournamentId}`}
          name="email"
          type="email"
          required
          placeholder="correo@ejemplo.com"
          className="flex-1 min-w-0 bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        />
        <button disabled={pending} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 text-sm font-bold px-4 rounded-lg">
          {pending ? '…' : 'Transferir'}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  )
}

function DeletePanel({ tournament }: { tournament: SuperTournament }) {
  const [state, action, pending] = useActionState(deleteTournamentAsSuper, null)
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="tournament_id" value={tournament.id} />
      <p className="text-sm text-red-200">
        Se borra el torneo con sus equipos, jugadores, partidos, cédulas, pagos e imágenes. <strong>No se puede deshacer.</strong>
      </p>
      <label htmlFor={`delete-${tournament.id}`} className="text-sm text-gray-400">
        Escribe <strong className="text-white">{tournament.name}</strong> para confirmar:
      </label>
      <div className="flex gap-2">
        <input
          id={`delete-${tournament.id}`}
          name="confirm_name"
          autoComplete="off"
          required
          className="flex-1 min-w-0 bg-gray-950 border border-red-900 rounded-lg px-3 py-2 text-sm text-white"
        />
        <button disabled={pending} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold px-4 rounded-lg">
          {pending ? 'Borrando…' : 'Borrar'}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  )
}

function TournamentRow({ t }: { t: SuperTournament }) {
  const [panel, setPanel] = useState<Panel>(null)
  const [pauseState, setPauseState] = useState<SuperResult>(null)
  const [pausing, start] = useTransition()
  const paused = !!t.disabled_at
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p))

  const btn = 'text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors'
  const idle = `${btn} border-white/10 text-gray-300 hover:text-white hover:border-white/30`
  const on = `${btn} border-amber-400/60 text-amber-300 bg-amber-400/10`

  return (
    <li className={`bg-gray-900/70 border rounded-xl p-4 ${paused ? 'border-violet-700/60' : 'border-white/10'}`}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {t.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.logo_url} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-xl">🏆</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-condensed text-lg font-bold text-white truncate">
            {t.name}
            {paused && <span className="ml-2 align-middle text-[11px] font-bold uppercase tracking-wide text-violet-200 bg-violet-900/70 px-2 py-0.5 rounded-full">⏸ Pausado</span>}
          </p>
          <p className="text-xs text-gray-500 truncate">{t.admin_email ?? 'Sin admin'}</p>
          <p className="text-xs text-gray-500 mt-1 tabular-nums">
            {t.teams} equipos · {t.played}/{t.matches} partidos jugados · creado {dateLabel(t.created_at)} · última actividad{' '}
            {dateLabel(t.last_activity)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/dashboard/tournaments/${t.id}`} className={idle}>
            Abrir
          </Link>
          <button type="button" onClick={() => toggle('link')} className={panel === 'link' ? on : idle}>
            🔗 Link
          </button>
          <button type="button" onClick={() => toggle('transfer')} className={panel === 'transfer' ? on : idle}>
            ⇄ Transferir
          </button>
          <button
            type="button"
            disabled={pausing}
            onClick={() => start(async () => setPauseState(await setTournamentPaused(t.id, !paused)))}
            className={idle}
          >
            {pausing ? '…' : paused ? '▶ Reactivar' : '⏸ Pausar'}
          </button>
          <button
            type="button"
            onClick={() => toggle('delete')}
            className={panel === 'delete' ? `${btn} border-red-600 text-red-300 bg-red-950/40` : `${btn} border-red-900/60 text-red-400 hover:border-red-600`}
          >
            Borrar
          </button>
        </div>
      </div>
      {pauseState && 'error' in pauseState && <p className="text-red-300 text-sm mt-2">{pauseState.error}</p>}
      {panel && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {panel === 'link' && <ClaimLinkPanel tournamentId={t.id} />}
          {panel === 'transfer' && <TransferPanel tournamentId={t.id} />}
          {panel === 'delete' && <DeletePanel tournament={t} />}
        </div>
      )}
    </li>
  )
}

export default function SuperTournaments({ tournaments }: { tournaments: SuperTournament[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tournaments.filter(
      (t) =>
        (filter === 'all' || (filter === 'paused') === !!t.disabled_at) &&
        (!q || t.name.toLowerCase().includes(q) || (t.admin_email ?? '').toLowerCase().includes(q))
    )
  }, [tournaments, query, filter])

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="super-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por torneo o correo del admin"
          className="flex-1 min-w-[14rem] bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600"
        />
        <div className="flex gap-1 bg-gray-900 border border-white/10 rounded-xl p-1">
          {(
            [
              ['all', 'Todos'],
              ['active', 'Activos'],
              ['paused', 'Pausados'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${filter === key ? 'bg-amber-400/15 text-amber-300' : 'text-gray-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {shown.map((t) => (
            <TournamentRow key={t.id} t={t} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-gray-500 text-sm">
          {tournaments.length === 0 ? 'Todavía no hay torneos en Torneapp.' : 'Ningún torneo coincide con la búsqueda.'}
        </p>
      )}
    </section>
  )
}
