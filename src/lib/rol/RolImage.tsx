/* eslint-disable @next/next/no-img-element -- la imagen la dibuja el generador de PNG, no el navegador */
import type { CSSProperties, ReactNode } from 'react'
import { CANVAS, type Box, type TemplateLayout } from './templates'

export type RolMatch = {
  homeName: string
  awayName: string
  homeLogo: string | null
  awayLogo: string | null
  time: string
}

export type RolVenue = { name: string; matches: RolMatch[] }
export type RolDateGroup = { date: string; venues: RolVenue[] }

export type RolData = {
  tournamentName: string
  tournamentLogo: string | null
  matchdayNumber: number
  groups: RolDateGroup[]
  resting: { name: string; logo: string | null }[]
  note: string | null
}

/** Ilustraciones ya rasterizadas que usa el diseño */
export type RolArt = { background: string | null; shield: string; banner: string; ball: string }

export const WIDTH = CANVAS.width
export const HEIGHT = CANVAS.height

const GOLD = '#d4af37'
const PANEL_BG = '#0b0b0e'
const SECTION_HEADER = 50

// ---------- Textos ----------

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('es-MX', { ...opts, timeZone: 'UTC' }).toUpperCase().replace(',', '')

/** "12 - 13 DE DICIEMBRE 2026", "SÁBADO 10 DE OCTUBRE 2026" o "30 DE ABRIL - 1 DE MAYO 2026". */
function datesLabel(dates: string[]) {
  if (dates.length === 0) return ''
  const year = dates[dates.length - 1].slice(0, 4)
  if (dates.length === 1) return `${fmt(dates[0], { weekday: 'long', day: 'numeric', month: 'long' })} ${year}`
  const first = dates[0]
  const last = dates[dates.length - 1]
  const day = (d: string) => String(Number(d.slice(8, 10))).padStart(2, '0')
  if (first.slice(0, 7) === last.slice(0, 7)) return `${day(first)} - ${day(last)} DE ${fmt(first, { month: 'long' })} ${year}`
  return `${day(first)} DE ${fmt(first, { month: 'long' })} - ${day(last)} DE ${fmt(last, { month: 'long' })} ${year}`
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

/** Tamaño de letra para que un texto quepa en un ancho (fuente condensada, ~0.5 em por letra). */
const fit = (text: string, width: number, max: number, min = 12, perChar = 0.5) =>
  Math.max(min, Math.floor(Math.min(max, width / (perChar * Math.max(text.length, 1)))))

/** Tamaño para que un nombre quepa en máximo dos renglones (por la palabra más larga y el total). */
function twoLineSize(name: string, width: number, max: number) {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length), 1)
  return Math.max(11, Math.floor(Math.min(max, width / (0.48 * longest), (1.9 * width) / (0.48 * (name.length + 1)))))
}

/** Tamaño de letra de la nota para que quepa en el panel. */
function noteSize(text: string, width: number, height: number) {
  for (let fs = 22; fs > 12; fs--) {
    const perLine = Math.floor(width / (0.44 * fs))
    const lines = Math.ceil(text.length / Math.max(perLine, 1))
    if (lines * fs * 1.36 <= height) return fs
  }
  return 12
}

/** Texto metálico: capa de contorno y sombra detrás, degradado al frente. */
function MetalText({ text, size, gradient, style }: { text: string; size: number; gradient: string; style?: CSSProperties }) {
  const base: CSSProperties = { display: 'flex', fontFamily: 'Anton', fontSize: size, lineHeight: 1.05 }
  return (
    <div style={{ display: 'flex', position: 'relative', ...style }}>
      <div style={{ ...base, color: '#1a1206', WebkitTextStroke: `${Math.round(size * 0.1)}px #1a1206`, textShadow: '0 6px 0 rgba(0,0,0,0.55)' }}>
        {text}
      </div>
      <div style={{ ...base, position: 'absolute', top: 0, left: 0, backgroundImage: gradient, backgroundClip: 'text', color: 'transparent' }}>
        {text}
      </div>
    </div>
  )
}

const GOLD_GRADIENT = 'linear-gradient(180deg, #fff6c9 0%, #f5d061 40%, #d4a017 62%, #8a5a0b 100%)'
const CHROME_GRADIENT = 'linear-gradient(180deg, #ffffff 0%, #e5e7eb 45%, #9ca3af 60%, #f3f4f6 100%)'

// ---------- Piezas ----------

function Logo({ src, name, size }: { src: string | null; name: string; size: number }) {
  if (src) return <img src={src} alt={name} width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />
  return (
    <div
      style={{
        display: 'flex',
        width: size,
        height: size,
        borderRadius: size,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #2b2b30, #111114)',
        border: `2px solid ${GOLD}`,
        color: '#f5d061',
        fontFamily: 'Anton',
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </div>
  )
}

const FieldIcon = ({ size }: { size: number }) => (
  <svg width={size * 1.4} height={size} viewBox="0 0 42 30">
    <rect x="1.5" y="1.5" width="39" height="27" rx="2" fill="none" stroke="#f5d061" strokeWidth="2" />
    <line x1="21" y1="1.5" x2="21" y2="28.5" stroke="#f5d061" strokeWidth="2" />
    <circle cx="21" cy="15" r="5" fill="none" stroke="#f5d061" strokeWidth="2" />
    <rect x="1.5" y="9" width="6" height="12" fill="none" stroke="#f5d061" strokeWidth="2" />
    <rect x="34.5" y="9" width="6" height="12" fill="none" stroke="#f5d061" strokeWidth="2" />
  </svg>
)

const CalendarIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect x="2.5" y="4.5" width="19" height="17" rx="2.5" fill="none" stroke="#ffffff" strokeWidth="1.8" />
    <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" stroke="#ffffff" strokeWidth="1.8" />
    <rect x="6.5" y="2" width="2" height="5" rx="1" fill="#ffffff" />
    <rect x="15.5" y="2" width="2" height="5" rx="1" fill="#ffffff" />
    <rect x="6" y="12.5" width="3" height="2.4" fill="#ffffff" />
    <rect x="10.5" y="12.5" width="3" height="2.4" fill="#ffffff" />
    <rect x="15" y="12.5" width="3" height="2.4" fill="#ffffff" />
    <rect x="6" y="16.5" width="3" height="2.4" fill="#ffffff" />
    <rect x="10.5" y="16.5" width="3" height="2.4" fill="#ffffff" />
  </svg>
)

const MegaphoneIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M3 10v4h3l6 4V6L6 10H3z" fill="#f5d061" />
    <path d="M15 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3" stroke="#f5d061" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M17.5 6.5c1.8 1.4 2.8 3.3 2.8 5.5s-1 4.1-2.8 5.5" stroke="#f5d061" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
)

const panelStyle = (extra?: CSSProperties): CSSProperties => ({
  display: 'flex',
  background: PANEL_BG,
  border: `3px solid ${GOLD}`,
  borderRadius: 14,
  overflow: 'hidden',
  ...extra,
})

const abs = (b: Box): CSSProperties => ({ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h })

// ---------- Partidos ----------

type Section = { title: string; matches: RolMatch[] }

/** Reparte las canchas en dos columnas equilibrando renglones (una sola cancha se parte en dos). */
function distribute(sections: Section[]): [Section[], Section[]] {
  if (sections.length === 1) {
    const s = sections[0]
    if (s.matches.length <= 1) return [[s], []]
    const half = Math.ceil(s.matches.length / 2)
    return [[{ title: s.title, matches: s.matches.slice(0, half) }], [{ title: s.title, matches: s.matches.slice(half) }]]
  }
  const cols: [Section[], Section[]] = [[], []]
  const load = [0, 0]
  for (const s of [...sections]) {
    const i = load[0] <= load[1] ? 0 : 1
    cols[i].push(s)
    load[i] += s.matches.length + 0.6
  }
  return cols
}

function MatchRow({ m, h, width }: { m: RolMatch; h: number; width: number }) {
  const compact = h < 64
  const timeW = compact ? 92 : 118
  const rowStyle: CSSProperties = {
    display: 'flex',
    height: h,
    alignItems: 'center',
    borderRadius: 8,
    border: '1.5px solid rgba(212,175,55,0.55)',
    backgroundImage: 'linear-gradient(180deg, #1c1c21 0%, #0e0e11 100%)',
  }
  const time = (
    <div style={{ display: 'flex', width: timeW, justifyContent: 'center' }}>
      <MetalText text={m.time} size={Math.min(compact ? 30 : 40, Math.floor(h * (compact ? 0.62 : 0.42)))} gradient={GOLD_GRADIENT} />
    </div>
  )

  if (compact) {
    const logo = Math.floor(h * 0.72)
    const nameW = (width - timeW - logo * 2 - 60) / 2
    const name = (t: string, align: 'flex-end' | 'flex-start') => (
      <div
        style={{
          display: 'flex',
          flex: 1,
          justifyContent: align,
          fontFamily: 'Barlow',
          fontWeight: 800,
          fontSize: fit(t, nameW, Math.floor(h * 0.42), 11, 0.48),
          color: '#ffffff',
          textTransform: 'uppercase',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {t}
      </div>
    )
    return (
      <div style={rowStyle}>
        {time}
        {name(m.homeName, 'flex-end')}
        <div style={{ display: 'flex', margin: '0 6px' }}>
          <Logo src={m.homeLogo} name={m.homeName} size={logo} />
        </div>
        <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: Math.floor(h * 0.4), color: '#f5d061' }}>VS</div>
        <div style={{ display: 'flex', margin: '0 6px' }}>
          <Logo src={m.awayLogo} name={m.awayName} size={logo} />
        </div>
        {name(m.awayName, 'flex-start')}
        <div style={{ display: 'flex', width: 8 }} />
      </div>
    )
  }

  const logo = Math.floor(h * 0.5)
  const teamW = (width - timeW - 76) / 2
  const team = (t: string, src: string | null) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: teamW, gap: 3 }}>
      <Logo src={src} name={t} size={logo} />
      <div
        style={{
          display: 'flex',
          fontFamily: 'Barlow',
          fontWeight: 800,
          fontSize: twoLineSize(t, teamW - 8, Math.min(22, Math.floor(h * 0.2))),
          lineHeight: 1,
          color: '#ffffff',
          textTransform: 'uppercase',
          textAlign: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          maxHeight: Math.floor(h * 0.42),
        }}
      >
        {t}
      </div>
    </div>
  )
  return (
    <div style={rowStyle}>
      {time}
      {team(m.homeName, m.homeLogo)}
      <div style={{ display: 'flex', position: 'relative', width: 76, height: h, alignItems: 'flex-start', justifyContent: 'center' }}>
        <svg width="76" height={h} viewBox={`0 0 76 ${h}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <polygon points={`4,0 72,0 38,${h * 0.78}`} fill="#050506" stroke="rgba(212,175,55,0.35)" strokeWidth="1.5" />
        </svg>
        <div style={{ display: 'flex', marginTop: h * 0.12, fontFamily: 'Anton', fontSize: Math.floor(h * 0.3), color: '#ffffff', transform: 'skewX(-8deg)' }}>
          VS
        </div>
      </div>
      {team(m.awayName, m.awayLogo)}
    </div>
  )
}

function SectionBlock({ s, rowH, width, layout }: { s: Section; rowH: number; width: number; layout: TemplateLayout }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          height: SECTION_HEADER,
          alignItems: 'center',
          gap: 14,
          padding: '0 16px',
          borderRadius: 8,
          backgroundImage: `linear-gradient(90deg, ${layout.header[0]} 0%, ${layout.header[1]} 55%, ${layout.header[0]} 100%)`,
        }}
      >
        <FieldIcon size={24} />
        <div
          style={{
            display: 'flex',
            fontFamily: 'Anton',
            fontSize: fit(s.title, width - 110, 32, 16, 0.5),
            color: layout.headerText,
            transform: 'skewX(-8deg)',
            textTransform: 'uppercase',
          }}
        >
          {s.title}
        </div>
      </div>
      {s.matches.map((m, i) => (
        <MatchRow key={i} m={m} h={rowH} width={width} />
      ))}
    </div>
  )
}

// ---------- Imagen completa ----------

export function RolImage({ data, layout, art }: { data: RolData; layout: TemplateLayout; art: RolArt }) {
  const multipleDates = data.groups.length > 1
  const sections: Section[] = data.groups.flatMap((g) =>
    g.venues.map((v) => ({
      title: multipleDates ? `${fmt(g.date, { weekday: 'short', day: 'numeric' }).replace('.', '')} · ${v.name}` : v.name,
      matches: v.matches,
    }))
  )
  const columns = distribute(sections)

  // Alto de renglón común: el que permita que quepa la columna más cargada
  const PAD = 10
  const colW = (layout.cards.w - 18) / 2
  const innerW = colW - PAD * 2 - 6
  const rowHFor = (col: Section[]) => {
    const rows = col.reduce((n, s) => n + s.matches.length, 0)
    if (rows === 0) return 104
    const fixed = col.length * (SECTION_HEADER + 6) + (col.length - 1) * 10 + (rows - col.length) * 6 + PAD * 2 + 6
    return (layout.cards.h - fixed) / rows
  }
  const rowH = Math.max(30, Math.min(104, Math.floor(Math.min(rowHFor(columns[0]), rowHFor(columns[1])))))

  const number = String(data.matchdayNumber)
  const numberBox = (() => {
    const b = layout.number
    const fs = Math.min(b.h * 0.8, Math.max(b.h * 0.5, (b.w + 6) / (0.56 * number.length)))
    const w = Math.max(b.w + 12, Math.ceil(0.58 * number.length * fs) + 22)
    return { box: { x: b.x + b.w / 2 - w / 2, y: b.y - 6, w, h: b.h + 12 }, fs }
  })()

  const dateText = datesLabel(data.groups.map((g) => g.date))
  const panelW = (layout.panels.w - 18) / 2

  const filler: ReactNode = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 }}>
      <Logo src={data.tournamentLogo ?? art.ball} name={data.tournamentName} size={120} />
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: fit(data.tournamentName, colW - 60, 34, 16), color: '#f5d061', textAlign: 'center', textTransform: 'uppercase' }}>
        {data.tournamentName}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', position: 'relative', width: WIDTH, height: HEIGHT, background: '#0b0b0e', fontFamily: 'Barlow', color: '#ffffff' }}>
      {art.background && <img src={art.background} alt="" width={WIDTH} height={HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }} />}

      {/* Fondo limpio (plantilla del admin): escudo, título y banda los dibuja la app */}
      {!layout.baked && (
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: WIDTH, height: 420 }}>
          <img src={art.shield} alt="" width={186} height={210} style={{ position: 'absolute', left: layout.shieldCenter.x - 93, top: 4 }} />
          <div style={{ display: 'flex', position: 'absolute', top: 206, left: 0, width: WIDTH, justifyContent: 'center', alignItems: 'flex-end', gap: 18 }}>
            <MetalText text="JORNADA" size={100} gradient={CHROME_GRADIENT} style={{ transform: 'skewX(-8deg)' }} />
            <MetalText text={number} size={112} gradient={GOLD_GRADIENT} style={{ transform: 'skewX(-8deg)' }} />
          </div>
          <div style={{ display: 'flex', position: 'absolute', top: 324, left: WIDTH / 2 - 250, width: 500, height: 70, alignItems: 'center', justifyContent: 'center' }}>
            <img src={art.banner} alt="" width={500} height={70} style={{ position: 'absolute', top: 0, left: 0 }} />
            <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 44, color: '#141414', letterSpacing: 2, transform: 'skewX(-8deg)' }}>ROL DE JUEGOS</div>
          </div>
        </div>
      )}

      {/* Logo del torneo dentro del escudo */}
      {(data.tournamentLogo || !layout.baked) && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: layout.shieldCenter.x - 80,
            top: layout.shieldCenter.y - 80,
            width: 160,
            height: 160,
            borderRadius: 160,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 40% 35%, #2a2a30, #09090b)',
            border: `5px solid ${GOLD}`,
          }}
        >
          <img src={data.tournamentLogo ?? art.ball} alt={data.tournamentName} width={118} height={118} style={{ objectFit: 'contain' }} />
        </div>
      )}

      {/* Número de jornada (tapa el "1" de ejemplo de la plantilla) */}
      {layout.baked && (
        <div style={{ ...abs(numberBox.box), ...panelStyle({ alignItems: 'center', justifyContent: 'center', borderRadius: 16, border: `4px solid ${GOLD}` }) }}>
          <MetalText text={number} size={Math.floor(numberBox.fs)} gradient={GOLD_GRADIENT} style={{ transform: 'skewX(-8deg)' }} />
        </div>
      )}

      {/* Fecha */}
      <div
        style={{
          ...abs(layout.date),
          ...panelStyle({ alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: 10, border: `2px solid ${GOLD}` }),
        }}
      >
        <CalendarIcon size={30} />
        <div style={{ display: 'flex', fontWeight: 800, fontSize: fit(dateText, layout.date.w - 90, 34, 16, 0.5), letterSpacing: 1 }}>{dateText}</div>
      </div>

      {/* Partidos en dos columnas */}
      <div style={{ ...abs(layout.cards), display: 'flex', gap: 18 }}>
        {columns.map((col, ci) => (
          <div key={ci} style={panelStyle({ flexDirection: 'column', width: colW, height: layout.cards.h, padding: PAD, gap: 10 })}>
            {col.length === 0 ? filler : col.map((s, i) => <SectionBlock key={i} s={s} rowH={rowH} width={innerW} layout={layout} />)}
          </div>
        ))}
      </div>

      {/* Descansa y notas */}
      <div style={{ ...abs(layout.panels), display: 'flex', gap: 18 }}>
        <div style={panelStyle({ width: panelW, height: layout.panels.h, alignItems: 'center', padding: '0 20px', gap: 18 })}>
          <img src={art.ball} alt="" width={72} height={72} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
            <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 28, color: '#f5d061', transform: 'skewX(-8deg)' }}>
              {data.resting.length > 1 ? 'EQUIPOS QUE DESCANSAN' : 'EQUIPO QUE DESCANSA'}
            </div>
            {data.resting.length === 0 ? (
              <div style={{ display: 'flex', fontWeight: 600, fontSize: 22, color: 'rgba(255,255,255,0.75)' }}>Todos los equipos juegan esta jornada</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                {data.resting.slice(0, 3).map((t) => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Logo src={t.logo} name={t.name} size={data.resting.length > 1 ? 44 : 60} />
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'Barlow',
                        fontWeight: 800,
                        fontSize: data.resting.length > 1 ? 20 : fit(t.name, panelW - 220, 32, 18, 0.5),
                        textTransform: 'uppercase',
                      }}
                    >
                      {t.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={panelStyle({ width: panelW, height: layout.panels.h, padding: '14px 22px', gap: 14 })}>
          <MegaphoneIcon size={44} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
            <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 28, color: '#f5d061', transform: 'skewX(-8deg)' }}>NOTAS</div>
            <div
              style={{
                display: 'flex',
                fontWeight: 600,
                fontSize: data.note ? noteSize(data.note, panelW - 110, layout.panels.h - 74) : 21,
                lineHeight: 1.22,
                color: data.note ? '#ffffff' : 'rgba(255,255,255,0.65)',
                overflow: 'hidden',
              }}
            >
              {data.note ?? 'Sin avisos para esta jornada.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
