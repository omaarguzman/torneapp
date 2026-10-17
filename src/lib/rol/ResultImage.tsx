/* eslint-disable @next/next/no-img-element -- la imagen la dibuja el generador de PNG, no el navegador */
import type { TemplateLayout } from './templates'
import { abs, fit, GOLD, GOLD_GRADIENT, HEIGHT, Logo, MetalText, panelStyle, WIDTH, type RolArt } from './RolImage'
import { contentBox } from './StatsImage'

export type ResultSide = {
  name: string
  logo: string | null
  goals: number
  /** "J. Pérez 12', 40'" */
  scorers: string[]
}

export type ResultImageData = {
  tournamentName: string
  tournamentLogo: string | null
  /** "Jornada 5" o "Cuartos de final · vuelta" */
  roundLabel: string
  /** "Sábado 12 de octubre · Cancha 2" */
  detail: string
  home: ResultSide
  away: ResultSide
  /** "Penales 4–3" · "Default / W.O.: no se presentó X" · "Global 3–2" */
  notes: string[]
}

function TeamColumn({ side, width }: { side: ResultSide; width: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width }}>
      <Logo src={side.logo} name={side.name} size={190} />
      <div
        style={{
          display: 'flex',
          textAlign: 'center',
          justifyContent: 'center',
          fontFamily: 'Anton',
          fontSize: fit(side.name, width - 10, 40, 22, 0.5),
          color: '#ffffff',
          textTransform: 'uppercase',
          lineHeight: 1.05,
        }}
      >
        {side.name}
      </div>
    </div>
  )
}

function ScorerList({ side, width }: { side: ResultSide; width: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width }}>
      {side.scorers.length === 0 ? (
        <div style={{ display: 'flex', fontSize: 20, color: '#6b7280' }}>{side.goals > 0 ? 'Goles sin capturar' : '—'}</div>
      ) : (
        side.scorers.slice(0, 7).map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 12, background: GOLD }} />
            <div
              style={{
                display: 'flex',
                fontFamily: 'Barlow',
                fontWeight: 800,
                fontSize: fit(s, width - 30, 24, 15, 0.52),
                color: '#ffffff',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/** Resultado de un partido para compartir, sobre la plantilla del rol. */
export function ResultImage({ data, layout, art }: { data: ResultImageData; layout: TemplateLayout; art: RolArt }) {
  const box = contentBox(layout)
  const head = layout.headline
  const title = 'RESULTADO FINAL'
  const col = Math.floor((box.w - 60) * 0.36)
  const scoreText = `${data.home.goals} – ${data.away.goals}`

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
          ...panelStyle({ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 18, border: `3px solid ${GOLD}`, padding: '0 20px' }),
        }}
      >
        <MetalText text={title} size={fit(title, head.w - 40, 72, 36, 0.48)} gradient={GOLD_GRADIENT} style={{ transform: 'skewX(-8deg)' }} />
        <div style={{ display: 'flex', fontFamily: 'Barlow', fontWeight: 800, fontSize: fit(data.tournamentName, head.w - 40, 28, 16, 0.5), textTransform: 'uppercase', textAlign: 'center' }}>
          {data.tournamentName}
        </div>
        <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 22, color: '#f5d061', letterSpacing: 1 }}>{data.roundLabel.toUpperCase()}</div>
      </div>

      <div style={{ ...abs(box), ...panelStyle({ flexDirection: 'column', padding: '28px 24px', gap: 22 }) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TeamColumn side={data.home} width={col} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <MetalText text={scoreText} size={fit(scoreText, box.w - 2 * col - 80, 150, 70, 0.55)} gradient={GOLD_GRADIENT} />
            {data.notes.map((n) => (
              <div
                key={n}
                style={{
                  display: 'flex',
                  fontFamily: 'Barlow',
                  fontWeight: 800,
                  fontSize: fit(n, box.w - 2 * col - 60, 22, 14, 0.52),
                  color: '#e5e7eb',
                  background: 'rgba(245,200,76,0.18)',
                  border: '1px solid rgba(212,175,55,0.55)',
                  borderRadius: 10,
                  padding: '4px 12px',
                  textTransform: 'uppercase',
                }}
              >
                {n}
              </div>
            ))}
          </div>
          <TeamColumn side={data.away} width={col} />
        </div>

        <div style={{ display: 'flex', height: 2, background: 'rgba(212,175,55,0.45)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', fontFamily: 'Anton', fontSize: 26, color: '#f5d061', letterSpacing: 2 }}>GOLES</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
            <ScorerList side={data.home} width={Math.floor((box.w - 72) / 2)} />
            <div style={{ display: 'flex', width: 2, background: 'rgba(255,255,255,0.12)' }} />
            <ScorerList side={data.away} width={Math.floor((box.w - 72) / 2)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 20, color: '#d1d5db' }}>{data.detail}</div>
      </div>
    </div>
  )
}
