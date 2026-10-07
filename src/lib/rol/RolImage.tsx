/* eslint-disable @next/next/no-img-element -- la imagen la dibuja el generador de PNG, no el navegador */
import type { CSSProperties } from 'react'
import type { RolTheme } from './themes'
import type { RolArt } from './buildArt'

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

export const WIDTH = 1080
const PAD = 32
const GAP = 20
const COL_W = (WIDTH - PAD * 2 - GAP) / 2
const CARD_HEADER = 64
const ROW_H = 86
const ROW_GAP = 10
const CARD_PAD = 12
const HEADER_H = 390
/** Temas con papel picado arriba: el encabezado baja para no encimarse */
const picadoOffset = (key: string) => (key === 'muertos' || key === 'patrio' ? 96 : 0)
const DATE_H = 104

const cardHeight = (rows: number) => CARD_HEADER + CARD_PAD * 2 + rows * ROW_H + Math.max(0, rows - 1) * ROW_GAP

/** Reparte las canchas de un día en dos columnas, siempre en la más corta. Con una sola cancha, ancho completo. */
function layoutColumns(venues: RolVenue[]) {
  if (venues.length === 1) return { columns: [venues], height: cardHeight(venues[0].matches.length), full: true }
  const columns: RolVenue[][] = [[], []]
  const heights = [0, 0]
  for (const v of venues) {
    const i = heights[0] <= heights[1] ? 0 : 1
    columns[i].push(v)
    heights[i] += (columns[i].length > 1 ? GAP : 0) + cardHeight(v.matches.length)
  }
  return { columns, height: Math.max(...heights), full: false }
}

const noteLines = (note: string) => Math.max(1, Math.ceil(note.length / 44))

/** Altura total: la imagen crece con el contenido para que siempre quepa toda la jornada. */
export function rolHeight(data: RolData, theme: RolTheme) {
  let h = HEADER_H + picadoOffset(theme.key) + DATE_H
  const multipleDates = data.groups.length > 1
  for (const g of data.groups) h += (multipleDates ? 66 : 0) + layoutColumns(g.venues).height + 26
  if (data.resting.length > 0) h += 170
  if (data.note) h += 130 + noteLines(data.note) * 46
  h += 90 // pie y margen
  return Math.max(1350, Math.ceil(h))
}

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('es-MX', { ...opts, timeZone: 'UTC' }).toUpperCase().replace(',', '')

function datesLabel(dates: string[]) {
  if (dates.length === 0) return ''
  if (dates.length === 1) {
    return fmt(dates[0], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/ DE (\d{4})$/, ' $1')
  }
  const sameMonth = dates.every((d) => d.slice(0, 7) === dates[0].slice(0, 7))
  if (sameMonth) {
    const days = dates.map((d) => fmt(d, { weekday: 'long', day: 'numeric' }))
    const joined = days.length === 2 ? days.join(' Y ') : `${days.slice(0, -1).join(', ')} Y ${days[days.length - 1]}`
    return `${joined} DE ${fmt(dates[0], { month: 'long' })} ${dates[0].slice(0, 4)}`
  }
  return dates.map((d) => fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })).join(' · ')
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

/** Tamaño de letra para que el nombre quepa (máximo 2 renglones), estimando ~0.5 em por letra. */
function nameFontSize(name: string, width: number, base: number) {
  const longestWord = Math.max(...name.split(/\s+/).map((w) => w.length), 1)
  return Math.max(15, Math.floor(Math.min(base, width / (0.5 * longestWord), (4.2 * width) / (name.length + 2))))
}

/** Texto dorado metálico: capa de contorno y sombra detrás, degradado dorado al frente. */
function GoldText({ text, size, style }: { text: string; size: number; style?: CSSProperties }) {
  const base: CSSProperties = { display: 'flex', fontFamily: 'Anton', fontSize: size, lineHeight: 1.05, letterSpacing: 1 }
  return (
    <div style={{ display: 'flex', position: 'relative', ...style }}>
      <div
        style={{
          ...base,
          color: '#3b2300',
          WebkitTextStroke: `${Math.round(size * 0.11)}px #2a1800`,
          textShadow: '0 7px 0 rgba(0,0,0,0.55)',
        }}
      >
        {text}
      </div>
      <div
        style={{
          ...base,
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundImage: 'linear-gradient(180deg, #fffbe0 0%, #fde047 38%, #eab308 62%, #a16207 100%)',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {text}
      </div>
    </div>
  )
}

/** Texto blanco grueso con contorno oscuro y sombra. */
const heavyWhite = (size: number, stroke = '#0b1220'): CSSProperties => ({
  display: 'flex',
  fontFamily: 'Anton',
  fontSize: size,
  lineHeight: 1.05,
  color: '#ffffff',
  WebkitTextStroke: `${Math.max(2, Math.round(size * 0.05))}px ${stroke}`,
  textShadow: '0 5px 0 rgba(0,0,0,0.55)',
})

function Logo({ src, name, size, theme }: { src: string | null; name: string; size: number; theme: RolTheme }) {
  if (src) {
    return <img src={src} alt={name} width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />
  }
  return (
    <div
      style={{
        display: 'flex',
        width: size,
        height: size,
        borderRadius: size,
        background: `radial-gradient(circle at 35% 30%, ${theme.accent}, ${theme.accentDark})`,
        color: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Anton',
        fontSize: size * 0.4,
        border: `3px solid ${theme.gold[1]}`,
      }}
    >
      {initials(name)}
    </div>
  )
}

type Art = RolArt

function MatchRow({ m, theme, full, art }: { m: RolMatch; theme: RolTheme; full: boolean; art: Art }) {
  const logo = full ? 62 : 46
  const nameWidth = full ? 300 : 98
  const base = full ? 30 : 23
  const nameStyle: CSSProperties = {
    display: 'flex',
    flex: 1,
    fontFamily: 'Barlow',
    fontWeight: 800,
    lineHeight: 1.02,
    color: '#0f172a',
    textTransform: 'uppercase',
    overflow: 'hidden',
    maxHeight: ROW_H - 14,
  }
  return (
    <div style={{ display: 'flex', height: ROW_H, alignItems: 'stretch', borderRadius: 12, borderBottom: '3px solid rgba(0,0,0,0.35)' }}>
      <div
        style={{
          display: 'flex',
          width: full ? 124 : 94,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `linear-gradient(180deg, ${theme.gold[0]} 0%, ${theme.gold[1]} 100%)`,
          color: theme.goldText,
          fontFamily: 'Anton',
          fontSize: full ? 42 : 34,
          borderRadius: '12px 0 0 12px',
          borderRight: '3px solid rgba(0,0,0,0.25)',
        }}
      >
        {m.time}
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 55%, #dbe2ea 100%)',
          borderRadius: '0 12px 12px 0',
        }}
      >
        <div style={{ ...nameStyle, fontSize: nameFontSize(m.homeName, nameWidth, base), justifyContent: 'flex-end', textAlign: 'right' }}>
          {m.homeName}
        </div>
        <Logo src={m.homeLogo} name={m.homeName} size={logo} theme={theme} />
        <div style={{ display: 'flex', position: 'relative', width: full ? 70 : 52, height: full ? 52 : 42, alignItems: 'center', justifyContent: 'center' }}>
          <img src={art.vs} alt="" width={full ? 70 : 52} height={full ? 52 : 42} style={{ position: 'absolute', top: 0, left: 0 }} />
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: full ? 32 : 24, color: theme.goldText, transform: 'skewX(-10deg)' }}>VS</div>
        </div>
        <Logo src={m.awayLogo} name={m.awayName} size={logo} theme={theme} />
        <div style={{ ...nameStyle, fontSize: nameFontSize(m.awayName, nameWidth, base), textAlign: 'left' }}>{m.awayName}</div>
      </div>
    </div>
  )
}

function VenueCard({ venue, theme, width, full, art }: { venue: RolVenue; theme: RolTheme; width: number; full: boolean; art: Art }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        borderRadius: 18,
        background: 'rgba(6,10,22,0.9)',
        border: `3px solid ${theme.accent}`,
        boxShadow: '0 12px 24px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: CARD_HEADER,
          alignItems: 'center',
          gap: 12,
          padding: '0 18px',
          backgroundImage: `linear-gradient(180deg, ${theme.accent} 0%, ${theme.accentDark} 100%)`,
          borderBottom: `3px solid ${theme.gold[1]}`,
        }}
      >
        <img src={art.ball} alt="" width={42} height={42} />
        <div
          style={{
            display: 'flex',
            fontFamily: 'Barlow',
            fontWeight: 800,
            fontSize: 32,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: 1,
            textShadow: '0 3px 0 rgba(0,0,0,0.5)',
          }}
        >
          {venue.name}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP, padding: CARD_PAD }}>
        {venue.matches.map((m, i) => (
          <MatchRow key={i} m={m} theme={theme} full={full} art={art} />
        ))}
      </div>
    </div>
  )
}

export function RolImage({ data, theme, height, art }: { data: RolData; theme: RolTheme; height: number; art: RolArt }) {
  const multipleDates = data.groups.length > 1
  const nameSize = data.tournamentName.length > 34 ? 34 : data.tournamentName.length > 24 ? 42 : 50

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: WIDTH,
        height,
        fontFamily: 'Barlow',
        color: '#ffffff',
        background: '#050b16',
      }}
    >
      <img
        src={art.background}
        alt=""
        width={WIDTH}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, padding: `0 ${PAD}px` }}>
        {/* Encabezado: escudo + títulos */}
        <div style={{ display: 'flex', alignItems: 'center', height: HEADER_H + picadoOffset(theme.key), paddingTop: 10 + picadoOffset(theme.key) }}>
          <div style={{ display: 'flex', position: 'relative', width: 300, height: 338, flexShrink: 0 }}>
            <img src={art.shield} alt="" width={300} height={338} />
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 70,
                left: 80,
                width: 140,
                height: 140,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={data.tournamentLogo ?? art.ball}
                alt={data.tournamentName}
                width={data.tournamentLogo ? 140 : 118}
                height={data.tournamentLogo ? 140 : 118}
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, marginLeft: 12 }}>
            <GoldText text="PROGRAMACIÓN" size={92} />
            <div style={{ display: 'flex', position: 'relative', width: 640, height: 150, alignItems: 'center', justifyContent: 'center', marginTop: -4 }}>
              <img src={art.jornada} alt="" width={640} height={150} style={{ position: 'absolute', top: 0, left: 0 }} />
              <div style={{ ...heavyWhite(116), transform: 'skewX(-8deg)' }}>JORNADA {data.matchdayNumber}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, maxWidth: 700 }}>
              <div style={{ display: 'flex', width: 34, height: 8, background: theme.gold[1], borderRadius: 4 }} />
              <div style={{ ...heavyWhite(nameSize), fontFamily: 'Barlow', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase' }}>
                {data.tournamentName}
              </div>
              <div style={{ display: 'flex', width: 34, height: 8, background: theme.gold[1], borderRadius: 4 }} />
            </div>
          </div>
        </div>

        {/* Fecha(s) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: DATE_H }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '10px 34px',
              borderRadius: 40,
              backgroundImage: 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))',
              border: `3px solid ${theme.gold[1]}`,
              boxShadow: '0 8px 18px rgba(0,0,0,0.55)',
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24">
              <rect x="2.5" y="4.5" width="19" height="17" rx="2.5" fill={theme.gold[0]} stroke="#3b2300" strokeWidth="0.8" />
              <rect x="2.5" y="4.5" width="19" height="5" rx="2" fill={theme.gold[1]} />
              <rect x="6.5" y="2" width="2.2" height="5" rx="1" fill="#3b2300" />
              <rect x="15.3" y="2" width="2.2" height="5" rx="1" fill="#3b2300" />
              <rect x="6" y="12" width="3" height="2.5" fill="#3b2300" />
              <rect x="10.5" y="12" width="3" height="2.5" fill="#3b2300" />
              <rect x="15" y="12" width="3" height="2.5" fill="#3b2300" />
              <rect x="6" y="16" width="3" height="2.5" fill="#3b2300" />
              <rect x="10.5" y="16" width="3" height="2.5" fill="#3b2300" />
            </svg>
            <div style={{ display: 'flex', fontWeight: 800, fontSize: 38, letterSpacing: 1, textShadow: '0 3px 0 rgba(0,0,0,0.5)' }}>
              {datesLabel(data.groups.map((g) => g.date))}
            </div>
          </div>
        </div>

        {/* Partidos por día y cancha */}
        {data.groups.map((g) => {
          const { columns, full } = layoutColumns(g.venues)
          return (
            <div key={g.date} style={{ display: 'flex', flexDirection: 'column', marginBottom: 26 }}>
              {multipleDates && (
                <div style={{ display: 'flex', height: 66, alignItems: 'center' }}>
                  <GoldText text={fmt(g.date, { weekday: 'long', day: 'numeric', month: 'long' })} size={42} />
                </div>
              )}
              <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
                {columns.map((col, ci) => (
                  <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                    {col.map((v) => (
                      <VenueCard key={v.name} venue={v} theme={theme} width={full ? WIDTH - PAD * 2 : COL_W} full={full} art={art} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Descansa */}
        {data.resting.length > 0 && (
          <div style={{ display: 'flex', position: 'relative', height: 150, marginBottom: 20, alignItems: 'center', padding: '0 70px' }}>
            <img src={art.rest} alt="" width={WIDTH - PAD * 2} height={150} style={{ position: 'absolute', top: 0, left: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <div style={{ ...heavyWhite(58), transform: 'skewX(-10deg)' }}>{data.resting.length > 1 ? 'DESCANSAN' : 'DESCANSA'}</div>
              {data.resting.slice(0, 3).map((t) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Logo src={t.logo} name={t.name} size={84} theme={theme} />
                  <GoldText text={t.name.toUpperCase()} size={data.resting.length > 1 ? 34 : 54} style={{ transform: 'skewX(-10deg)' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nota del administrador */}
        {data.note && (
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', alignItems: 'center', marginTop: 34, marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                padding: '52px 40px 26px',
                borderRadius: 20,
                background: 'rgba(6,10,22,0.92)',
                border: `4px solid ${theme.gold[1]}`,
                boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ display: 'flex', fontWeight: 800, fontSize: 38, lineHeight: 1.22, textAlign: 'center', textTransform: 'uppercase', textShadow: '0 3px 0 rgba(0,0,0,0.5)' }}>
                {data.note}
              </div>
            </div>
            <div style={{ display: 'flex', position: 'absolute', top: -38, width: 260, height: 82, alignItems: 'center', justifyContent: 'center' }}>
              <img src={art.note} alt="" width={260} height={82} style={{ position: 'absolute', top: 0, left: 0 }} />
              <div style={{ ...heavyWhite(54), transform: 'skewX(-10deg)' }}>NOTA:</div>
            </div>
          </div>
        )}

        {/* Pie */}
        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            paddingBottom: 24,
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 22,
            color: 'rgba(255,255,255,0.75)',
            textShadow: '0 2px 0 rgba(0,0,0,0.6)',
          }}
        >
          Rol generado con Torneapp
        </div>
      </div>
    </div>
  )
}
