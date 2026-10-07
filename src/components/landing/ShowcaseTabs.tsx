'use client'

import Image from 'next/image'
import { useEffect, useState, type ReactNode } from 'react'

const DURATION = 6500

/* ---------- Vistas simuladas de cada pantalla ---------- */

const Badge = ({ children, tone }: { children: ReactNode; tone: 'green' | 'yellow' | 'red' | 'gray' | 'sky' }) => {
  const tones = {
    green: 'bg-green-950 text-green-300',
    yellow: 'bg-yellow-950 text-yellow-300',
    red: 'bg-red-950 text-red-300',
    gray: 'bg-gray-800 text-gray-300',
    sky: 'bg-sky-950 text-sky-300',
  }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

function FixtureMock() {
  const rows = [
    ['Halcones FC', 'Tigres del Norte', 'Sáb 10:00 · Cancha 1', <Badge key="b" tone="green">✓ Validada · 3-1</Badge>],
    ['Real Pastita', 'León Cañada', 'Sáb 11:00 · Cancha 1', <Badge key="b" tone="yellow">Cédula por validar</Badge>],
    ['Deportes Nash', 'Zorros', 'Sáb 12:00 · Cancha 2', <Badge key="b" tone="sky">↻ Reprogramado</Badge>],
    ['Unión Cuevas', 'Panteras', 'Por programar', <Badge key="b" tone="gray">⏸ Aplazado de J6</Badge>],
  ]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 mb-1">
        {['J5', 'J6', 'J7', 'J8'].map((j) => (
          <span key={j} className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${j === 'J6' ? 'bg-amber-400 text-gray-950' : 'bg-gray-800 text-gray-400'}`}>
            {j}
          </span>
        ))}
        <span className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400">⏸ Pendientes</span>
      </div>
      {rows.map(([h, a, when, badge]) => (
        <div key={String(h)} className="bg-gray-900 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-white font-semibold truncate">
              {h} <span className="text-gray-600 text-xs">vs</span> {a}
            </p>
            <p className="text-xs text-gray-500">{when}</p>
          </div>
          {badge}
        </div>
      ))}
    </div>
  )
}

function CedulaMock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-white/10 rounded-xl p-4 flex items-center justify-around">
        <div className="text-center">
          <p className="text-xs text-gray-400">Halcones FC</p>
          <p className="font-display text-4xl text-white">3</p>
        </div>
        <span className="text-gray-600">–</span>
        <div className="text-center">
          <p className="text-xs text-gray-400">Tigres del Norte</p>
          <p className="font-display text-4xl text-white">1</p>
        </div>
      </div>
      {[
        ['⚽', 'R. Hernández', "12'"],
        ['🟨', 'L. Martínez', "27'"],
        ['⚽', 'J. Pérez', "41'"],
        ['⚽', 'C. Ramírez', "63'"],
      ].map(([i, n, m]) => (
        <div key={n + m} className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-3 text-sm">
          <span>{i}</span>
          <span className="text-gray-200 flex-1">{n}</span>
          <span className="text-gray-500 text-xs">{m}</span>
        </div>
      ))}
      <div className="flex gap-2">
        <span className="flex-1 text-center text-sm font-semibold bg-amber-400 text-gray-950 rounded-lg py-2">Guardar cédula</span>
        <span className="text-center text-sm bg-gray-800 text-gray-300 rounded-lg px-3 py-2">🏳️ W.O.</span>
      </div>
    </div>
  )
}

function TablaMock() {
  const rows = [
    ['Halcones FC', 6, 5, 1, 0, '+11', 16],
    ['Tigres del Norte', 6, 4, 1, 1, '+6', 13],
    ['Real Pastita', 6, 3, 2, 1, '+3', 11],
    ['León Cañada', 6, 2, 1, 3, '-2', 7],
    ['Zorros', 6, 1, 0, 5, '-9', 3],
  ]
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1.5rem_1fr_repeat(5,2.2rem)] gap-1 px-3 py-2 text-[10px] text-gray-500 uppercase font-condensed font-semibold border-b border-white/10">
        <span>#</span>
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">G</span>
        <span className="text-center">E</span>
        <span className="text-center">DG</span>
        <span className="text-center">Pts</span>
      </div>
      {rows.map(([n, pj, g, e, , dg, pts], i) => (
        <div
          key={String(n)}
          className={`grid grid-cols-[1.5rem_1fr_repeat(5,2.2rem)] gap-1 px-3 py-2.5 text-sm items-center ${i === 0 ? 'bg-amber-400/10' : ''} border-b border-white/5`}
        >
          <span className={`font-display ${i === 0 ? 'text-amber-300' : 'text-gray-500'}`}>{i + 1}</span>
          <span className="text-white truncate">{n}</span>
          <span className="text-center text-gray-400">{pj}</span>
          <span className="text-center text-gray-400">{g}</span>
          <span className="text-center text-gray-400">{e}</span>
          <span className="text-center text-gray-400">{dg}</span>
          <span className="text-center font-bold text-white">{pts}</span>
        </div>
      ))}
      <div className="flex gap-2 p-3">
        <span className="text-xs bg-gray-800 text-gray-300 rounded-lg px-3 py-1.5">⬇ PDF</span>
        <span className="text-xs bg-gray-800 text-gray-300 rounded-lg px-3 py-1.5">⬇ Excel</span>
        <span className="text-xs bg-gray-800 text-gray-300 rounded-lg px-3 py-1.5">📤 Compartir</span>
      </div>
    </div>
  )
}

function RolMock() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {['primavera.webp', 'patrio.webp', 'anio-nuevo.webp'].map((f, i) => (
        <div
          key={f}
          className="rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/50"
          style={{ transform: `translateY(${i === 1 ? -10 : 6}px)` }}
        >
          <Image src={`/rol/plantillas/${f}`} alt="Plantilla del rol de juegos" width={1122} height={1402} sizes="(min-width: 768px) 200px, 30vw" />
        </div>
      ))}
    </div>
  )
}

function DisciplinaMock() {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-red-950/50 border border-red-900 rounded-xl px-4 py-3">
        <p className="text-sm text-red-300 font-semibold">🚫 #9 L. Martínez — roja directa</p>
        <p className="text-xs text-red-200/80">Le falta 1 partido · no juega: J7 vs Halcones FC</p>
      </div>
      <div className="bg-yellow-950/50 border border-yellow-800 rounded-xl px-4 py-3">
        <p className="text-sm text-yellow-300 font-semibold">⚠️ #5 C. Ramírez</p>
        <p className="text-xs text-yellow-200/80">2 de 3 amarillas: con la siguiente queda suspendido</p>
      </div>
      <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-3">
        <p className="text-sm text-white font-semibold">📜 Cambió el reglamento</p>
        <p className="text-xs text-green-300 mt-1 border-l-2 border-green-500 pl-2">+ 4. Presentarse 15 minutos antes del partido.</p>
        <p className="text-xs text-red-300/70 line-through mt-1 border-l-2 border-red-600 pl-2">− 4. Tolerancia de 10 minutos.</p>
      </div>
    </div>
  )
}

const TABS = [
  {
    key: 'fixture',
    label: 'Fixture',
    icon: '🗓️',
    title: 'Fixture automático y flexible',
    points: ['Genera todas las jornadas respetando canchas y horarios', 'Aplaza, mueve o intercambia partidos', 'Actualiza el fixture si llegan equipos a media temporada'],
    view: <FixtureMock />,
  },
  {
    key: 'cedula',
    label: 'Cédula',
    icon: '📝',
    title: 'Cédula digital del árbitro',
    points: ['El árbitro entra con un link desde su celular', 'Goles, tarjetas, asistencia, W.O. o partido suspendido', 'Tú validas y la tabla se actualiza sola'],
    view: <CedulaMock />,
  },
  {
    key: 'tabla',
    label: 'Tabla',
    icon: '🏆',
    title: 'Posiciones y estadísticas al momento',
    points: ['Desempates automáticos', 'Goleadores, tarjetas y mejor defensa', 'Exporta en PDF o Excel y comparte'],
    view: <TablaMock />,
  },
  {
    key: 'rol',
    label: 'Rol de juegos',
    icon: '🖼️',
    title: 'El rol listo para WhatsApp',
    points: ['Imagen con logos, horarios y canchas', 'Plantillas que cambian según la temporada', 'Sube tus propios diseños'],
    view: <RolMock />,
  },
  {
    key: 'disciplina',
    label: 'Delegados',
    icon: '🔔',
    title: 'Cada delegado, informado',
    points: ['Suspensiones y amarillas de su equipo', 'Avisos de cambios de horario y reglamento', 'Registro de jugadores con fecha límite'],
    view: <DisciplinaMock />,
  },
]

/** Recorrido por la app: pestañas que cambian solas (o con clic) con una vista simulada de cada pantalla. */
export default function ShowcaseTabs() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setTimeout(() => setActive((a) => (a + 1) % TABS.length), DURATION)
    return () => clearTimeout(id)
  }, [active, paused])

  const tab = TABS[active]

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex gap-2 overflow-x-auto pb-2 justify-start md:justify-center [scrollbar-width:none]">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(i)}
            className={`relative overflow-hidden shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              i === active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
            {i === active && (
              <span
                key={`${active}-${paused}`}
                className={`absolute bottom-0 left-0 h-0.5 w-full bg-amber-400 ${paused ? '' : 'animate-progress'}`}
                style={{ animationDuration: `${DURATION}ms` }}
              />
            )}
          </button>
        ))}
      </div>

      <div key={tab.key} className="mt-8 grid md:grid-cols-[1fr_1.15fr] gap-8 items-center animate-word">
        <div>
          <h3 className="font-display text-3xl sm:text-4xl uppercase leading-tight">{tab.title}</h3>
          <ul className="mt-5 flex flex-col gap-3">
            {tab.points.map((p) => (
              <li key={p} className="flex gap-3 text-gray-300">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-amber-400/15 text-amber-300 text-xs flex items-center justify-center">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 bg-amber-400/10 blur-3xl rounded-full" />
          <div className="relative bg-gray-950/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/60">
            <div className="flex gap-1.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            {tab.view}
          </div>
        </div>
      </div>
    </div>
  )
}
