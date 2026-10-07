'use client'

import { useEffect, useState } from 'react'
import { LogoMark } from '@/components/Logo'

type Step =
  | { kind: 'goal'; minute: number; team: 'home' | 'away'; player: string }
  | { kind: 'yellow'; minute: number; team: 'home' | 'away'; player: string }
  | { kind: 'notice'; text: string }
  | { kind: 'final' }

const HOME = { name: 'Halcones FC', short: 'HAL', color: '#2563eb' }
const AWAY = { name: 'Tigres del Norte', short: 'TIG', color: '#ea580c' }

const SCRIPT: Step[] = [
  { kind: 'goal', minute: 12, team: 'home', player: 'R. Hernández' },
  { kind: 'yellow', minute: 27, team: 'away', player: 'L. Martínez' },
  { kind: 'goal', minute: 41, team: 'away', player: 'J. Pérez' },
  { kind: 'notice', text: 'J7 reprogramado: sáb 10:00 · Cancha 2' },
  { kind: 'goal', minute: 63, team: 'home', player: 'C. Ramírez' },
  { kind: 'goal', minute: 88, team: 'home', player: 'R. Hernández' },
  { kind: 'final' },
]

function Crest({ color, short }: { color: string; short: string }) {
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center font-display text-lg text-white shadow-lg"
      style={{ background: `linear-gradient(160deg, ${color}, #0b1220)` }}
    >
      {short}
    </div>
  )
}

/** Celular con un partido simulado "en vivo": goles, tarjetas y avisos, en bucle. */
export default function LiveMatchPhone() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (SCRIPT.length + 1)), 2600)
    return () => clearInterval(id)
  }, [])

  const done = SCRIPT.slice(0, step)
  const score = {
    home: done.filter((s) => s.kind === 'goal' && s.team === 'home').length,
    away: done.filter((s) => s.kind === 'goal' && s.team === 'away').length,
  }
  const minuteSteps = done.filter((s): s is Extract<Step, { minute: number }> => 'minute' in s)
  const minute = done.some((s) => s.kind === 'final') ? 'Final' : `${minuteSteps.at(-1)?.minute ?? 0}'`
  const last = done.at(-1)
  const timeline = minuteSteps.slice(-4).reverse()

  return (
    <div className="relative w-[17.5rem] sm:w-[19rem]">
      {/* Aviso emergente del último evento */}
      {last && last.kind !== 'final' && (
        <div
          key={step}
          className="animate-toast absolute -top-16 left-1/2 -translate-x-1/2 z-20 w-[110%] bg-gray-900/95 backdrop-blur border border-amber-400/40 rounded-2xl px-3.5 py-2.5 shadow-2xl shadow-black/60"
        >
          <p className="text-[11px] text-gray-400 font-condensed font-semibold uppercase tracking-wide">
            {last.kind === 'notice' ? 'Aviso para delegados' : 'Cédula del árbitro'}
          </p>
          <p className="text-sm text-white font-semibold">
            {last.kind === 'goal' && `⚽ Gol de ${last.player} (${last.minute}')`}
            {last.kind === 'yellow' && `🟨 Amarilla a ${last.player} (${last.minute}')`}
            {last.kind === 'notice' && `🔔 ${last.text}`}
          </p>
        </div>
      )}

      {/* Celular */}
      <div className="relative rounded-[2.6rem] border-[10px] border-gray-800 bg-gray-950 shadow-2xl shadow-black/70 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-b-2xl z-10" />
        <div className="px-4 pt-9 pb-5 min-h-[30rem] bg-gradient-to-b from-gray-900 to-gray-950">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <LogoMark size={20} />
              <span className="font-display text-sm tracking-wide">
                TORNE<span className="text-amber-400">APP</span>
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-condensed font-bold uppercase text-red-300 bg-red-950/70 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-live" />
              {minute === 'Final' ? 'Final' : 'En vivo'}
            </span>
          </div>

          <p className="mt-5 text-center text-[11px] text-gray-500 font-condensed uppercase tracking-widest">Jornada 6 · Cancha 1</p>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-col items-center gap-1.5 w-20">
              <Crest color={HOME.color} short={HOME.short} />
              <span className="text-[11px] text-gray-300 text-center leading-tight">{HOME.name}</span>
            </div>
            <div className="text-center">
              <div className="font-display text-5xl tabular-nums">
                <span key={`h${score.home}`} className="inline-block animate-score">{score.home}</span>
                <span className="text-gray-600 mx-1.5">-</span>
                <span key={`a${score.away}`} className="inline-block animate-score">{score.away}</span>
              </div>
              <span className="text-xs text-amber-300 font-condensed font-semibold">{minute}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-20">
              <Crest color={AWAY.color} short={AWAY.short} />
              <span className="text-[11px] text-gray-300 text-center leading-tight">{AWAY.name}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 min-h-[11rem]">
            {timeline.map((e, i) => (
              <div
                key={`${e.minute}-${e.player}`}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                  i === 0 ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-gray-800/60 border border-transparent'
                } ${e.team === 'away' ? 'flex-row-reverse text-right' : ''}`}
              >
                <span className="font-condensed font-bold text-amber-300 w-7">{e.minute}&apos;</span>
                <span>{e.kind === 'goal' ? '⚽' : '🟨'}</span>
                <span className="text-gray-200 flex-1">{e.player}</span>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-center text-xs text-gray-600 mt-8">Comienza el partido…</p>}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-gray-500 font-condensed uppercase">
            <span className="rounded-lg bg-gray-800/60 py-1.5">Fixture</span>
            <span className="rounded-lg bg-amber-400/15 text-amber-300 py-1.5">Cédula</span>
            <span className="rounded-lg bg-gray-800/60 py-1.5">Tabla</span>
          </div>
        </div>
      </div>
    </div>
  )
}
