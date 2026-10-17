/* eslint-disable @next/next/no-img-element -- la imagen la dibuja el generador de PNG, no el navegador */
import type { TemplateLayout } from './templates'
import { abs, fit, GOLD, GOLD_GRADIENT, HEIGHT, Logo, MetalText, panelStyle, WIDTH, type RolArt } from './RolImage'
import { contentBox, PanelTitle } from './StatsImage'

export type BracketTeam = { name: string; logo: string | null; seed: number }

export type BracketTie = {
  high: BracketTeam
  low: BracketTeam
  /** Goles de cada partido, del lado de cada equipo: [[ida high, ida low], [vuelta high, vuelta low]] */
  legs: [number | null, number | null][]
  /** Penales del partido que definió, [high, low] */
  penalties: [number, number] | null
  winner: 'high' | 'low' | null
}

export type BracketImageData = {
  tournamentName: string
  tournamentLogo: string | null
  stages: { label: string; ties: BracketTie[] }[]
  champion: BracketTeam | null
}

function TeamLine({ team, scores, pens, won, lost, height }: {
  team: BracketTeam
  scores: (number | null)[]
  pens: number | null
  won: boolean
  lost: boolean
  height: number
}) {
  const fs = Math.max(13, Math.min(22, Math.floor(height * 0.55)))
  const logo = Math.floor(height * 0.8)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height,
        padding: '0 8px',
        borderRadius: 6,
        background: won ? 'rgba(245,200,76,0.22)' : 'transparent',
        opacity: lost ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', width: 26, justifyContent: 'center', fontFamily: 'Anton', fontSize: fs - 2, color: won ? '#f5d061' : '#9ca3af' }}>
        {team.seed}
      </div>
      <Logo src={team.logo} name={team.name} size={logo} />
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          fontFamily: 'Barlow',
          fontWeight: 800,
          fontSize: fit(team.name, 230, fs, 11, 0.52),
          color: won ? '#f5d061' : '#ffffff',
          textTransform: 'uppercase',
        }}
      >
        {team.name}
      </div>
      {scores.map((s, i) => (
        <div key={i} style={{ display: 'flex', width: 30, justifyContent: 'center', fontFamily: 'Anton', fontSize: fs + 2, color: '#ffffff' }}>
          {s === null ? '–' : s}
        </div>
      ))}
      {pens !== null && (
        <div style={{ display: 'flex', width: 34, justifyContent: 'center', fontFamily: 'Barlow', fontWeight: 700, fontSize: fs - 4, color: '#d1d5db' }}>
          {`(${pens})`}
        </div>
      )}
    </div>
  )
}

function TieBox({ tie, width, height }: { tie: BracketTie; width: number; height: number }) {
  const line = Math.floor((height - 10) / 2)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        width,
        height,
        padding: '3px 4px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(212,175,55,0.35)',
      }}
    >
      <TeamLine
        team={tie.high}
        scores={tie.legs.map((l) => l[0])}
        pens={tie.penalties ? tie.penalties[0] : null}
        won={tie.winner === 'high'}
        lost={tie.winner === 'low'}
        height={line}
      />
      <TeamLine
        team={tie.low}
        scores={tie.legs.map((l) => l[1])}
        pens={tie.penalties ? tie.penalties[1] : null}
        won={tie.winner === 'low'}
        lost={tie.winner === 'high'}
        height={line}
      />
    </div>
  )
}

/** Llave de la liguilla (las rondas creadas, con marcadores y quién avanza) sobre la plantilla del rol. */
export function BracketImage({ data, layout, art }: { data: BracketImageData; layout: TemplateLayout; art: RolArt }) {
  const box = contentBox(layout)
  const head = layout.headline
  const title = 'LIGUILLA'

  // Cada ronda: título + filas de 2 eliminatorias. El alto de cada tarjeta se ajusta a lo que quepa;
  // si ni así caben (p. ej. octavos + cuartos + semis + final), se omiten las rondas más antiguas.
  const champH = data.champion ? 90 : 0
  const NOTE_H = 30
  const MIN_TIE = 58
  // Bloques: cada ronda en su fila; la final y el 3er lugar (un partido cada uno) van lado a lado
  type Block = BracketImageData['stages']
  const blocksOf = (stages: BracketImageData['stages']): Block[] => {
    const blocks: Block[] = []
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i]
      const next = stages[i + 1]
      if (s.ties.length === 1 && next?.ties.length === 1) {
        blocks.push([next, s])
        i++
      } else blocks.push([s])
    }
    return blocks
  }
  const rowsOf = (b: Block) => (b.length === 2 ? 1 : Math.ceil(b[0].ties.length / 2))
  const layoutFor = (stages: BracketImageData['stages'], note: boolean) => {
    const blocks = blocksOf(stages)
    const rows = blocks.reduce((n, b) => n + rowsOf(b), 0)
    const fixed = blocks.length * (46 + 8) + (rows - blocks.length) * 8 + blocks.length * 10 + champH + 24 + (note ? NOTE_H : 0)
    return Math.floor((box.h - fixed) / Math.max(rows, 1))
  }
  let shown = data.stages
  while (shown.length > 1 && layoutFor(shown, shown.length < data.stages.length) < MIN_TIE) shown = shown.slice(1)
  const omitted = shown.length < data.stages.length
  const blocks = blocksOf(shown)
  const tieH = Math.max(MIN_TIE, Math.min(120, layoutFor(shown, omitted)))
  // Ancho interior: el panel tiene 12 px de relleno y 3 px de borde por lado; 8 px entre las dos columnas
  const tieW = Math.floor((box.w - 24 - 6 - 8 - 4) / 2)

  return (
    <div style={{ display: 'flex', position: 'relative', width: WIDTH, height: HEIGHT, background: '#0b0b0e', fontFamily: 'Barlow', color: '#ffffff' }}>
      {art.background && <img src={art.background} alt="" width={WIDTH} height={HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }} />}

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
        <MetalText text={title} size={fit(title, head.w - 40, 84, 40, 0.48)} gradient={GOLD_GRADIENT} style={{ transform: 'skewX(-8deg)' }} />
        <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 800, fontSize: fit(data.tournamentName, head.w - 40, 30, 16, 0.5), textTransform: 'uppercase', textAlign: 'center' }}>
          {data.tournamentName}
        </div>
      </div>

      <div style={{ ...abs(box), ...panelStyle({ flexDirection: 'column', padding: 12, gap: 10 }) }}>
        {data.champion && (
          <div
            style={{
              display: 'flex',
              height: champH - 10,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              borderRadius: 12,
              background: 'rgba(245,200,76,0.18)',
              border: `2px solid ${GOLD}`,
            }}
          >
            <Logo src={data.champion.logo} name={data.champion.name} size={56} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 18, color: '#f5d061', letterSpacing: 2 }}>CAMPEÓN</div>
              <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: fit(data.champion.name, box.w - 200, 40, 20, 0.5), color: '#ffffff', textTransform: 'uppercase' }}>
                {data.champion.name}
              </div>
            </div>
          </div>
        )}
        {blocks.map((block) =>
          block.length === 2 ? (
            <div key={block[0].label} style={{ display: 'flex', gap: 8 }}>
              {block.map((stage) => (
                <div key={stage.label} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: tieW }}>
                  <PanelTitle text={stage.label.toUpperCase()} />
                  <TieBox tie={stage.ties[0]} width={tieW} height={tieH} />
                </div>
              ))}
            </div>
          ) : (
            <div key={block[0].label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PanelTitle text={block[0].label.toUpperCase()} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: block[0].ties.length === 1 ? 'center' : 'flex-start' }}>
                {block[0].ties.map((tie, i) => (
                  <TieBox key={i} tie={tie} width={tieW} height={tieH} />
                ))}
              </div>
            </div>
          )
        )}
        {omitted && (
          <div style={{ display: 'flex', height: NOTE_H - 10, alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#9ca3af' }}>
            Rondas anteriores en Torneapp
          </div>
        )}
      </div>
    </div>
  )
}
