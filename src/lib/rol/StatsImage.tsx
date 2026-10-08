/* eslint-disable @next/next/no-img-element -- la imagen la dibuja el generador de PNG, no el navegador */
import type { CSSProperties } from 'react'
import type { TemplateLayout } from './templates'
import {
  abs,
  fit,
  GOLD,
  GOLD_GRADIENT,
  HEIGHT,
  Logo,
  MetalText,
  panelStyle,
  WIDTH,
  type RolArt,
} from './RolImage'

export type StatsTeam = {
  name: string
  logo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export type StatsImageData = {
  tournamentName: string
  tournamentLogo: string | null
  /** "Actualizada al 7 de octubre de 2026 · 32 partidos jugados" */
  updatedLabel: string
  standings: StatsTeam[]
  scorers: { name: string; team: string; teamLogo: string | null; goals: number }[]
  cards: { name: string; team: string; yellows: number; reds: number }[] | null
  bestDefense: StatsTeam | null
}

const MEDALS = ['#eab308', '#9ca3af', '#b46e3c']

/** Zona donde va el contenido: la que ocupan las tarjetas y los paneles de la plantilla. */
function contentBox(layout: TemplateLayout) {
  const x = Math.min(layout.cards.x, layout.panels.x)
  const right = Math.max(layout.cards.x + layout.cards.w, layout.panels.x + layout.panels.w)
  return { x, y: layout.cards.y, w: right - x, h: layout.panels.y + layout.panels.h - layout.cards.y }
}

function PanelTitle({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        height: 46,
        alignItems: 'center',
        padding: '0 18px',
        borderRadius: 8,
        backgroundImage: 'linear-gradient(90deg, #8a6a1f 0%, #f5c84c 55%, #8a6a1f 100%)',
      }}
    >
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 28, color: '#111111', transform: 'skewX(-8deg)' }}>{text}</div>
    </div>
  )
}

const cellNum: CSSProperties = { display: 'flex', justifyContent: 'center', fontFamily: 'Barlow', fontWeight: 700 }

function StandingsTable({ teams, width, height }: { teams: StatsTeam[]; width: number; height: number }) {
  const cols = [56, 0, 52, 46, 46, 46, 52, 52, 60, 64] // la columna 1 (equipo) toma el resto
  const fixed = cols.reduce((a, b) => a + b, 0)
  const teamW = width - 24 - fixed
  const headH = 44
  const rowH = Math.max(26, Math.min(56, Math.floor((height - 30 - headH) / Math.max(teams.length, 1))))
  const fs = Math.max(15, Math.min(24, Math.floor(rowH * 0.5)))
  const logo = Math.floor(rowH * 0.72)
  const widthOf = (i: number) => (i === 1 ? teamW : cols[i])
  const headers = ['#', 'EQUIPO', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DIF', 'PTS']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', height: headH, alignItems: 'center', borderBottom: '2px solid rgba(212,175,55,0.6)' }}>
        {headers.map((h, i) => (
          <div
            key={h}
            style={{
              ...cellNum,
              width: widthOf(i),
              justifyContent: i === 1 ? 'flex-start' : 'center',
              paddingLeft: i === 1 ? logo + 14 : 0,
              fontFamily: 'Anton',
              fontWeight: 400,
              fontSize: 20,
              color: '#f5d061',
            }}
          >
            {h}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {teams.map((t, i) => {
          const leader = i === 0
          const values = [t.played, t.won, t.drawn, t.lost, t.goalsFor, t.goalsAgainst, t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff, t.points]
          return (
            <div
              key={t.name}
              style={{
                display: 'flex',
                height: rowH,
                alignItems: 'center',
                borderRadius: 6,
                background: leader ? 'rgba(245,200,76,0.22)' : i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: leader ? `4px solid ${GOLD}` : '4px solid transparent',
              }}
            >
              <div style={{ ...cellNum, width: cols[0] - 4, fontFamily: 'Anton', fontWeight: 400, fontSize: fs + 2, color: leader ? '#f5d061' : '#9ca3af' }}>
                {i + 1}
              </div>
              <div style={{ display: 'flex', width: teamW, alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                <Logo src={t.logo} name={t.name} size={logo} />
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Barlow',
                    fontWeight: 800,
                    fontSize: fit(t.name, teamW - logo - 20, fs + 2, 12, 0.5),
                    color: '#ffffff',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.name}
                </div>
              </div>
              {values.map((v, j) => (
                <div
                  key={j}
                  style={{
                    ...cellNum,
                    width: cols[j + 2],
                    fontSize: j === 7 ? fs + 4 : fs,
                    fontFamily: j === 7 ? 'Anton' : 'Barlow',
                    fontWeight: j === 7 ? 400 : 700,
                    color: j === 7 ? (leader ? '#f5d061' : '#ffffff') : '#d1d5db',
                  }}
                >
                  {v}
                </div>
              ))}
            </div>
          )
        })}
        {teams.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: '#9ca3af', fontSize: 24 }}>Aún no hay partidos jugados.</div>
        )}
      </div>
    </div>
  )
}

function ScorersList({ scorers, height }: { scorers: StatsImageData['scorers']; height: number }) {
  const rowH = Math.max(34, Math.min(60, Math.floor((height - 80) / Math.max(scorers.length, 1)) - 6))
  const fs = Math.max(16, Math.min(24, Math.floor(rowH * 0.42)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <PanelTitle text="GOLEADORES" />
      {scorers.map((s, i) => (
        <div
          key={s.name + s.team}
          style={{
            display: 'flex',
            height: rowH,
            alignItems: 'center',
            gap: 12,
            padding: '0 12px',
            borderRadius: 8,
            background: i < 3 ? 'rgba(245,200,76,0.12)' : 'rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 36,
              height: 36,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              background: MEDALS[i] ?? 'transparent',
              color: i < 3 ? '#ffffff' : '#9ca3af',
              fontFamily: 'Anton',
              fontSize: 20,
            }}
          >
            {i + 1}
          </div>
          <Logo src={s.teamLogo} name={s.team} size={Math.floor(rowH * 0.7)} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 800, fontSize: fs, color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {s.name}
            </div>
            <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 600, fontSize: fs - 4, color: '#9ca3af', whiteSpace: 'nowrap' }}>{s.team}</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: fs + 10, color: '#f5d061' }}>{s.goals}</div>
        </div>
      ))}
      {scorers.length === 0 && <div style={{ display: 'flex', padding: 20, color: '#9ca3af', fontSize: 22 }}>Aún no hay goles registrados.</div>}
    </div>
  )
}

function SideStats({ data }: { data: StatsImageData }) {
  const attack = [...data.standings].sort((a, b) => b.goalsFor - a.goalsFor).slice(0, 6)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.bestDefense && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PanelTitle text="MEJOR DEFENSA" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' }}>
            <Logo src={data.bestDefense.logo} name={data.bestDefense.name} size={64} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 800, fontSize: 26, color: '#ffffff', textTransform: 'uppercase' }}>
                {data.bestDefense.name}
              </div>
              <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 600, fontSize: 18, color: '#9ca3af' }}>
                {data.bestDefense.played} partidos jugados
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 40, color: '#f5d061' }}>{data.bestDefense.goalsAgainst}</div>
              <div style={{ display: 'flex', fontSize: 14, color: '#9ca3af' }}>goles recibidos</div>
            </div>
          </div>
        </div>
      )}

      {data.cards ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <PanelTitle text="TARJETAS" />
          {data.cards.slice(0, 7).map((c) => (
            <div
              key={c.name + c.team}
              style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 800, fontSize: 19, color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                <div style={{ display: 'flex', fontSize: 14, color: '#9ca3af', whiteSpace: 'nowrap' }}>{c.team}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', width: 18, height: 26, borderRadius: 3, background: '#facc15' }} />
                <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 24, color: '#ffffff', width: 26 }}>{c.yellows}</div>
                <div style={{ display: 'flex', width: 18, height: 26, borderRadius: 3, background: '#dc2626' }} />
                <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 24, color: '#ffffff', width: 20 }}>{c.reds}</div>
              </div>
            </div>
          ))}
          {data.cards.length === 0 && <div style={{ display: 'flex', padding: 14, color: '#9ca3af', fontSize: 20 }}>Sin tarjetas registradas.</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <PanelTitle text="MEJOR OFENSIVA" />
          {attack.map((t, i) => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 46, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', width: 24, fontFamily: 'Anton', fontSize: 20, color: '#9ca3af' }}>{i + 1}</div>
              <Logo src={t.logo} name={t.name} size={34} />
              <div style={{ display: 'flex', flex: 1, fontFamily: 'Barlow', fontWeight: 800, fontSize: 19, color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {t.name}
              </div>
              <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 26, color: '#f5d061' }}>{t.goalsFor}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Página 1 (tabla) o 2 (goleadores, mejor defensa, tarjetas) sobre la plantilla del rol de juegos. */
export function StatsImage({ page, data, layout, art }: { page: 1 | 2; data: StatsImageData; layout: TemplateLayout; art: RolArt }) {
  const box = contentBox(layout)
  const head = layout.headline
  const title = page === 1 ? 'TABLA DE POSICIONES' : 'ESTADÍSTICAS'

  return (
    <div style={{ display: 'flex', position: 'relative', width: WIDTH, height: HEIGHT, background: '#0b0b0e', fontFamily: 'Barlow', color: '#ffffff' }}>
      {art.background && <img src={art.background} alt="" width={WIDTH} height={HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }} />}

      {/* Fondo limpio (plantilla del admin): el escudo lo dibuja la app */}
      {!layout.baked && (
        <img src={art.shield} alt="" width={186} height={210} style={{ position: 'absolute', left: layout.shieldCenter.x - 93, top: 4 }} />
      )}
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

      {/* Título (tapa "JORNADA 1 · ROL DE JUEGOS" y la fecha de ejemplo) */}
      <div
        style={{
          ...abs(head),
          ...panelStyle({ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, border: `3px solid ${GOLD}`, padding: '0 20px' }),
        }}
      >
        <MetalText text={title} size={fit(title, head.w - 40, 76, 40, 0.48)} gradient={GOLD_GRADIENT} style={{ transform: 'skewX(-8deg)' }} />
        <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 800, fontSize: fit(data.tournamentName, head.w - 40, 30, 16, 0.5), textTransform: 'uppercase', textAlign: 'center' }}>
          {data.tournamentName}
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: '#d1d5db' }}>{data.updatedLabel}</div>
      </div>

      {/* Contenido */}
      {page === 1 ? (
        <div style={{ ...abs(box), ...panelStyle({ flexDirection: 'column', padding: 12 }) }}>
          <StandingsTable teams={data.standings} width={box.w - 6} height={box.h} />
        </div>
      ) : (
        <div style={{ ...abs(box), ...panelStyle({ padding: 12, gap: 12 }) }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: (box.w - 50) * 0.54 }}>
            <ScorersList scorers={data.scorers} height={box.h - 24} />
          </div>
          <div style={{ display: 'flex', width: 2, background: 'rgba(212,175,55,0.45)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', width: (box.w - 50) * 0.46 }}>
            <SideStats data={data} />
          </div>
        </div>
      )}
    </div>
  )
}
