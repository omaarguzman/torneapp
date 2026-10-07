/**
 * Ilustraciones en SVG para la imagen del rol (fondos por temporada, escudo,
 * brochazos). Se entregan como data URI: el motor que dibuja el PNG (resvg)
 * soporta filtros como desenfoque y texturas, que dan el acabado "de diseño".
 */
import type { ThemeKey } from './themes'

export const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

/** Números pseudoaleatorios con semilla: la ilustración sale igual cada vez. */
function seeded(seed: number) {
  let s = seed % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const f = (n: number) => n.toFixed(1)

const DEFS = `
  <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="glowS" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0"/>
  </filter>
  <filter id="grass" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves="2" seed="9"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0.12  0 0 0 0 0  0 0 0 0.45 0"/>
  </filter>
  <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
    <stop offset="60%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.65"/>
  </radialGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.25" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>`

/** Torre de luces de estadio con resplandor y haz de luz hacia el campo. */
function lightTower(cx: number, cy: number, dir: 1 | -1, H: number) {
  const bulbs: string[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      bulbs.push(`<rect x="${cx - 62 + c * 26}" y="${cy - 30 + r * 22}" width="20" height="16" rx="4" fill="#fffef5"/>`)
    }
  }
  return `
    <polygon points="${cx - 60},${cy} ${cx + 60},${cy} ${cx + dir * 520},${H * 0.62} ${cx + dir * 120},${H * 0.66}" fill="url(#beam)" filter="url(#glowS)"/>
    <circle cx="${cx}" cy="${cy}" r="260" fill="url(#halo)" opacity="0.55"/>
    <circle cx="${cx}" cy="${cy}" r="130" fill="url(#halo)"/>
    <rect x="${cx - 70}" y="${cy - 38}" width="140" height="80" rx="8" fill="#1e293b"/>
    ${bulbs.join('')}
    <circle cx="${cx}" cy="${cy}" r="90" fill="url(#halo)" opacity="0.7"/>`
}

/** Tribuna con público (siluetas y puntitos de colores) detrás del campo. */
function crowd(y: number, rand: () => number, tint: string) {
  let path = `M0,${y + 60} `
  for (let x = 0; x <= 1080; x += 18) path += `L${x},${f(y + 20 + rand() * 18)} `
  path += `L1080,${y + 140} L0,${y + 140} Z`
  const dots: string[] = []
  for (let i = 0; i < 220; i++) {
    const colors = ['#ef4444', '#facc15', '#ffffff', '#3b82f6', '#22c55e', tint]
    dots.push(`<circle cx="${f(rand() * 1080)}" cy="${f(y + 30 + rand() * 90)}" r="${f(1.5 + rand() * 2.5)}" fill="${colors[i % colors.length]}" opacity="0.5"/>`)
  }
  return `<path d="${path}" fill="#05070f" opacity="0.92"/>${dots.join('')}
    <rect x="0" y="${y + 120}" width="1080" height="24" fill="#0b1324"/>`
}

/** Campo de pasto con franjas de corte, textura y líneas de cal. */
function field(top: number, H: number, light: string, dark: string) {
  const stripes: string[] = []
  const h = H - top
  for (let i = 0; i < 10; i++) {
    stripes.push(`<rect x="0" y="${f(top + (i * h) / 10)}" width="1080" height="${f(h / 10 + 1)}" fill="${i % 2 ? dark : light}"/>`)
  }
  return `
    <g>${stripes.join('')}</g>
    <rect x="0" y="${top}" width="1080" height="${h}" filter="url(#grass)"/>
    <ellipse cx="540" cy="${f(top + h * 0.75)}" rx="300" ry="90" fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="6"/>
    <line x1="0" y1="${f(top + h * 0.75)}" x2="1080" y2="${f(top + h * 0.75)}" stroke="#fff" stroke-opacity="0.12" stroke-width="6"/>
    <rect x="0" y="${top}" width="1080" height="${f(h * 0.25)}" fill="url(#fieldFade)"/>`
}

function papelPicado(y: number, colors: string[], rand: () => number, cut: 'skull' | 'star', sag = 26) {
  const flags = 10
  const w = 1080 / flags
  const out: string[] = [`<path d="M-10,${y} Q540,${y + sag} 1090,${y}" stroke="#e5e7eb" stroke-width="3" fill="none"/>`]
  for (let i = 0; i < flags; i++) {
    const x = i * w + 5
    const fw = w - 10
    const t = (i + 0.5) / flags
    const yy = y + sag * 4 * t * (1 - t) * 0.5
    const zig = Array.from({ length: 9 }, (_, k) => `${f(x + fw - (k * fw) / 8)},${f(yy + (k % 2 ? 108 : 118))}`).join(' ')
    const color = colors[i % colors.length]
    const rot = (rand() - 0.5) * 6
    // Recortes: calavera sencilla al centro y rombos alrededor
    out.push(`<g transform="rotate(${f(rot)} ${f(x + fw / 2)} ${f(yy)})">
      <polygon points="${f(x)},${f(yy)} ${f(x + fw)},${f(yy)} ${zig}" fill="${color}" opacity="0.95"/>
      ${cut === 'skull'
        ? `<circle cx="${f(x + fw / 2)}" cy="${f(yy + 48)}" r="20" fill="#000" opacity="0.38"/>
      <rect x="${f(x + fw / 2 - 11)}" y="${f(yy + 62)}" width="22" height="12" rx="3" fill="#000" opacity="0.38"/>
      <circle cx="${f(x + fw / 2 - 7)}" cy="${f(yy + 46)}" r="5" fill="${color}"/>
      <circle cx="${f(x + fw / 2 + 7)}" cy="${f(yy + 46)}" r="5" fill="${color}"/>`
        : `<polygon points="${starPoints(x + fw / 2, yy + 52, 24)}" fill="#000" opacity="0.38"/>`}
      <rect x="${f(x + 10)}" y="${f(yy + 16)}" width="9" height="9" fill="#000" opacity="0.35" transform="rotate(45 ${f(x + 14)} ${f(yy + 20)})"/>
      <rect x="${f(x + fw - 19)}" y="${f(yy + 16)}" width="9" height="9" fill="#000" opacity="0.35" transform="rotate(45 ${f(x + fw - 14)} ${f(yy + 20)})"/>
      <rect x="${f(x + 10)}" y="${f(yy + 84)}" width="9" height="9" fill="#000" opacity="0.35" transform="rotate(45 ${f(x + 14)} ${f(yy + 88)})"/>
      <rect x="${f(x + fw - 19)}" y="${f(yy + 84)}" width="9" height="9" fill="#000" opacity="0.35" transform="rotate(45 ${f(x + fw - 14)} ${f(yy + 88)})"/>
    </g>`)
  }
  return out.join('')
}

function starPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2
    const rr = k % 2 ? r * 0.45 : r
    return `${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`
  }).join(' ')
}

function marigold(cx: number, cy: number, r: number) {
  const petals: string[] = []
  for (let ring = 0; ring < 3; ring++) {
    const n = 12 - ring * 3
    const rr = r * (1 - ring * 0.28)
    const color = ['#ea580c', '#f97316', '#fdba74'][ring]
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ring * 0.4
      petals.push(`<ellipse cx="${f(cx + Math.cos(a) * rr * 0.55)}" cy="${f(cy + Math.sin(a) * rr * 0.55)}" rx="${f(rr * 0.42)}" ry="${f(rr * 0.3)}" transform="rotate(${f((a * 180) / Math.PI)} ${f(cx + Math.cos(a) * rr * 0.55)} ${f(cy + Math.sin(a) * rr * 0.55)})" fill="${color}"/>`)
    }
  }
  return `<g>${petals.join('')}<circle cx="${cx}" cy="${cy}" r="${f(r * 0.16)}" fill="#9a3412"/></g>`
}

function candle(x: number, y: number) {
  return `<g>
    <circle cx="${x}" cy="${y - 40}" r="46" fill="#fbbf24" opacity="0.5" filter="url(#glow)"/>
    <rect x="${x - 14}" y="${y - 20}" width="28" height="70" rx="4" fill="#fef3c7"/>
    <path d="M${x},${y - 52} Q${x + 12},${y - 34} ${x},${y - 22} Q${x - 12},${y - 34} ${x},${y - 52} Z" fill="#fb923c"/>
    <path d="M${x},${y - 44} Q${x + 6},${y - 33} ${x},${y - 26} Q${x - 6},${y - 33} ${x},${y - 44} Z" fill="#fef08a"/>
  </g>`
}

function firework(cx: number, cy: number, r: number, color: string) {
  const rays: string[] = []
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    rays.push(`<line x1="${f(cx + Math.cos(a) * r * 0.25)}" y1="${f(cy + Math.sin(a) * r * 0.25)}" x2="${f(cx + Math.cos(a) * r)}" y2="${f(cy + Math.sin(a) * r)}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`)
    rays.push(`<circle cx="${f(cx + Math.cos(a) * r * 1.08)}" cy="${f(cy + Math.sin(a) * r * 1.08)}" r="4" fill="${color}"/>`)
  }
  return `<g opacity="0.85"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.25" filter="url(#glow)"/>${rays.join('')}</g>`
}

function ribbon(y: number, flip: boolean) {
  const colors = ['#006847', '#ffffff', '#ce1126']
  return colors
    .map((c, i) => {
      const o = i * 26
      const d = flip
        ? `M1080,${y + o} C860,${y + o - 70} 760,${y + o + 90} 560,${y + o + 10} L560,${y + o + 34} C760,${y + o + 114} 860,${y + o - 46} 1080,${y + o + 24} Z`
        : `M0,${y + o} C220,${y + o - 70} 320,${y + o + 90} 520,${y + o + 10} L520,${y + o + 34} C320,${y + o + 114} 220,${y + o - 46} 0,${y + o + 24} Z`
      return `<path d="${d}" fill="${c}" opacity="0.9"/>`
    })
    .join('')
}

function snowflake(cx: number, cy: number, r: number, op: number) {
  const arms: string[] = []
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    const x2 = cx + Math.cos(a) * r
    const y2 = cy + Math.sin(a) * r
    arms.push(`<line x1="${cx}" y1="${cy}" x2="${f(x2)}" y2="${f(y2)}"/>`)
    const bx = cx + Math.cos(a) * r * 0.6
    const by = cy + Math.sin(a) * r * 0.6
    arms.push(`<line x1="${f(bx)}" y1="${f(by)}" x2="${f(bx + Math.cos(a + 0.7) * r * 0.3)}" y2="${f(by + Math.sin(a + 0.7) * r * 0.3)}"/>`)
    arms.push(`<line x1="${f(bx)}" y1="${f(by)}" x2="${f(bx + Math.cos(a - 0.7) * r * 0.3)}" y2="${f(by + Math.sin(a - 0.7) * r * 0.3)}"/>`)
  }
  return `<g stroke="#ffffff" stroke-width="${f(Math.max(1.5, r / 9))}" stroke-linecap="round" opacity="${op}">${arms.join('')}</g>`
}

function pineBranch(x: number, y: number, flip: boolean, rand: () => number) {
  const s = flip ? -1 : 1
  const needles: string[] = []
  for (let i = 0; i < 46; i++) {
    const t = i / 46
    const bx = x + s * t * 330
    const by = y + t * 120
    const len = 50 - t * 22
    needles.push(`<line x1="${f(bx)}" y1="${f(by)}" x2="${f(bx + s * 18)}" y2="${f(by - len)}" />`)
    needles.push(`<line x1="${f(bx)}" y1="${f(by)}" x2="${f(bx + s * 22)}" y2="${f(by + len * 0.8)}" />`)
  }
  const balls = [
    [0.35, '#dc2626'],
    [0.7, '#fbbf24'],
  ]
    .map(([t, c]) => {
      const bx = x + s * (t as number) * 330
      const by = y + (t as number) * 120 + 70
      return `<line x1="${f(bx)}" y1="${f(by - 70)}" x2="${f(bx)}" y2="${f(by - 26)}" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="${f(bx)}" cy="${f(by)}" r="26" fill="${c}"/>
        <circle cx="${f(bx - 8)}" cy="${f(by - 9)}" r="8" fill="#fff" opacity="0.55"/>
        <rect x="${f(bx - 8)}" y="${f(by - 32)}" width="16" height="9" rx="2" fill="#d4d4d8"/>`
    })
    .join('')
  return `<g stroke="#14532d" stroke-width="5" stroke-linecap="round">
      <path d="M${x},${y} L${x + s * 330},${y + 120}" stroke="#3f2a14" stroke-width="10"/>
      ${needles.join('')}</g>
    <g stroke="#166534" stroke-width="3" opacity="${f(0.6 + rand() * 0.3)}"><path d="M${x},${y + 4} L${x + s * 320},${y + 122}"/></g>
    ${balls}`
}

function stringLights(y: number, rand: () => number) {
  const colors = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#f97316']
  const out = [`<path d="M-10,${y} Q270,${y + 70} 540,${y} T1090,${y}" stroke="#14532d" stroke-width="4" fill="none"/>`]
  for (let i = 0; i < 18; i++) {
    const t = i / 17
    const x = t * 1080
    const yy = y + Math.sin(t * Math.PI * 2) * -35 + 35 * (1 - Math.cos(t * Math.PI * 4)) * 0.0
    const c = colors[Math.floor(rand() * colors.length)]
    out.push(`<circle cx="${f(x)}" cy="${f(yy + 18)}" r="22" fill="${c}" opacity="0.55" filter="url(#glowS)"/>
      <ellipse cx="${f(x)}" cy="${f(yy + 18)}" rx="8" ry="12" fill="${c}"/>`)
  }
  return out.join('')
}

function flower(cx: number, cy: number, r: number, petal: string, center: string) {
  const petals = Array.from({ length: 5 }, (_, k) => {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2
    return `<ellipse cx="${f(cx + Math.cos(a) * r * 0.55)}" cy="${f(cy + Math.sin(a) * r * 0.55)}" rx="${f(r * 0.5)}" ry="${f(r * 0.34)}" transform="rotate(${f((a * 180) / Math.PI)} ${f(cx + Math.cos(a) * r * 0.55)} ${f(cy + Math.sin(a) * r * 0.55)})" fill="${petal}"/>`
  }).join('')
  return `<g>${petals}<circle cx="${cx}" cy="${cy}" r="${f(r * 0.26)}" fill="${center}"/></g>`
}

function butterfly(x: number, y: number, s: number, color: string) {
  return `<g transform="translate(${x} ${y}) scale(${s}) rotate(-15)" opacity="0.9">
    <ellipse cx="-14" cy="-10" rx="16" ry="12" fill="${color}"/><ellipse cx="14" cy="-10" rx="16" ry="12" fill="${color}"/>
    <ellipse cx="-10" cy="10" rx="10" ry="9" fill="${color}" opacity="0.85"/><ellipse cx="10" cy="10" rx="10" ry="9" fill="${color}" opacity="0.85"/>
    <rect x="-2" y="-18" width="4" height="34" rx="2" fill="#1f2937"/></g>`
}

/** Fondo completo de la imagen según el tema. */
export function backgroundSvg(theme: ThemeKey, H: number) {
  const rand = seeded(H * 7 + theme.length * 131)
  const W = 1080
  const fieldTop = Math.round(H * 0.42)
  let sky = ''
  let extras = ''
  let fieldLight = '#15803d'
  let fieldDark = '#166534'

  if (theme === 'estadio') {
    sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="0.55" stop-color="#0b2545"/><stop offset="1" stop-color="#0f3b2a"/></linearGradient>`
    extras = lightTower(70, 70, 1, H) + lightTower(1010, 70, -1, H) + crowd(fieldTop - 150, rand, '#facc15')
  } else if (theme === 'navidad') {
    sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030712"/><stop offset="0.5" stop-color="#0c1d3d"/><stop offset="1" stop-color="#14532d"/></linearGradient>`
    fieldLight = '#166534'
    fieldDark = '#14532d'
    const bokeh = Array.from({ length: 26 }, () => {
      const c = ['#ef4444', '#fbbf24', '#22c55e', '#ffffff'][Math.floor(rand() * 4)]
      return `<circle cx="${f(rand() * W)}" cy="${f(rand() * H * 0.5)}" r="${f(10 + rand() * 26)}" fill="${c}" opacity="${f(0.12 + rand() * 0.2)}" filter="url(#glowS)"/>`
    }).join('')
    const flakes = Array.from({ length: 80 }, () => {
      const x = rand() * W
      const y = rand() * H
      // Sin copos detrás de los títulos (estorban la lectura)
      if (y < 420 && x > 320) return ''
      return snowflake(x, y, 6 + rand() * 16, 0.35 + rand() * 0.5)
    }).join('')
    extras = bokeh + crowd(fieldTop - 150, rand, '#ef4444') + stringLights(18, rand) + pineBranch(-30, 0, false, rand) + pineBranch(W + 30, 0, true, rand) + flakes
  } else if (theme === 'muertos') {
    sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0418"/><stop offset="0.5" stop-color="#3b0f52"/><stop offset="1" stop-color="#1c0a2a"/></linearGradient>`
    fieldLight = '#3f1d4f'
    fieldDark = '#341544'
    const moon = `<circle cx="880" cy="250" r="110" fill="#fde68a" opacity="0.25" filter="url(#soft)"/><circle cx="880" cy="250" r="62" fill="#fef3c7" opacity="0.85"/>`
    const flowersL = Array.from({ length: 9 }, (_, i) => marigold(20 + (i % 3) * 60 + rand() * 20, H - 40 - Math.floor(i / 3) * 55 - rand() * 20, 34 + rand() * 12)).join('')
    const flowersR = Array.from({ length: 9 }, (_, i) => marigold(W - 20 - (i % 3) * 60 - rand() * 20, H - 40 - Math.floor(i / 3) * 55 - rand() * 20, 34 + rand() * 12)).join('')
    const petals = Array.from({ length: 50 }, () => `<ellipse cx="${f(rand() * W)}" cy="${f(rand() * H)}" rx="6" ry="3.5" fill="#f97316" opacity="${f(0.3 + rand() * 0.4)}" transform="rotate(${f(rand() * 180)})"/>`).join('')
    extras =
      moon +
      crowd(fieldTop - 150, rand, '#f97316') +
      `<rect x="0" y="${fieldTop - 40}" width="${W}" height="200" fill="#f97316" opacity="0.12" filter="url(#soft)"/>` +
      papelPicado(4, ['#f97316', '#ec4899', '#a855f7', '#facc15', '#22c55e'], rand, 'skull') +
      candle(60, H - 220) + candle(W - 60, H - 220) + candle(130, H - 170) + candle(W - 130, H - 170) +
      flowersL + flowersR + petals
  } else if (theme === 'patrio') {
    sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="0.55" stop-color="#0b2a1d"/><stop offset="1" stop-color="#14361f"/></linearGradient>`
    const works =
      firework(160, 260, 120, '#22c55e') + firework(930, 210, 140, '#ef4444') + firework(560, 120, 90, '#ffffff') + firework(820, 470, 80, '#22c55e') + firework(260, 520, 70, '#ef4444')
    const confetti = Array.from({ length: 60 }, (_, i) => {
      const c = ['#006847', '#ffffff', '#ce1126'][i % 3]
      return `<rect x="${f(rand() * W)}" y="${f(rand() * H)}" width="${f(8 + rand() * 8)}" height="${f(4 + rand() * 4)}" fill="${c}" opacity="0.5" transform="rotate(${f(rand() * 180)})"/>`
    }).join('')
    extras = works + crowd(fieldTop - 150, rand, '#ce1126') + ribbon(H * 0.28, false) + ribbon(H * 0.3, true) + papelPicado(4, ['#006847', '#ffffff', '#ce1126'], rand, 'star') + confetti
  } else {
    // primavera
    sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="0.45" stop-color="#7dd3fc"/><stop offset="1" stop-color="#bbf7d0"/></linearGradient>`
    fieldLight = '#22c55e'
    fieldDark = '#16a34a'
    const sun = `<circle cx="960" cy="110" r="190" fill="#fef9c3" opacity="0.6" filter="url(#soft)"/><circle cx="960" cy="110" r="80" fill="#fde047"/>` +
      Array.from({ length: 16 }, (_, k) => {
        const a = (k / 16) * Math.PI * 2
        return `<line x1="${f(960 + Math.cos(a) * 100)}" y1="${f(110 + Math.sin(a) * 100)}" x2="${f(960 + Math.cos(a) * 150)}" y2="${f(110 + Math.sin(a) * 150)}" stroke="#fde047" stroke-width="8" stroke-linecap="round" opacity="0.8"/>`
      }).join('')
    const clouds = [
      [180, 120],
      [520, 200],
    ]
      .map(([x, y]) => `<g fill="#fff" opacity="0.85"><ellipse cx="${x}" cy="${y}" rx="90" ry="34"/><ellipse cx="${x - 50}" cy="${y + 10}" rx="60" ry="26"/><ellipse cx="${x + 55}" cy="${y + 8}" rx="65" ry="28"/></g>`)
      .join('')
    const palette: [string, string][] = [
      ['#f472b6', '#fde047'],
      ['#fde047', '#f97316'],
      ['#ffffff', '#facc15'],
      ['#c084fc', '#fde047'],
    ]
    const flowers = Array.from({ length: 30 }, (_, i) => {
      const left = i % 2 === 0
      const [p, c] = palette[i % palette.length]
      return flower(left ? rand() * 120 : W - rand() * 120, H - rand() * 380, 18 + rand() * 18, p, c)
    }).join('')
    const petals = Array.from({ length: 40 }, () => `<ellipse cx="${f(rand() * W)}" cy="${f(rand() * H)}" rx="7" ry="4" fill="#f9a8d4" opacity="${f(0.4 + rand() * 0.4)}" transform="rotate(${f(rand() * 180)})"/>`).join('')
    const hills = `<path d="M0,${fieldTop + 10} C200,${fieldTop - 120} 380,${fieldTop - 110} 560,${fieldTop - 20} C720,${fieldTop - 150} 920,${fieldTop - 130} 1080,${fieldTop - 30} L1080,${fieldTop + 40} L0,${fieldTop + 40} Z" fill="#4ade80"/>
      <path d="M0,${fieldTop + 20} C260,${fieldTop - 60} 520,${fieldTop - 40} 760,${fieldTop + 5} C880,${fieldTop - 40} 1000,${fieldTop - 50} 1080,${fieldTop} L1080,${fieldTop + 40} L0,${fieldTop + 40} Z" fill="#22c55e"/>`
    extras = sun + clouds + hills + butterfly(140, 330, 1.4, '#f472b6') + butterfly(930, 420, 1.2, '#a78bfa') + flowers + petals
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${DEFS}${sky}
    <linearGradient id="fieldFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${field(fieldTop, H, fieldLight, fieldDark)}
  ${extras}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`
}

/** Escudo dorado con estrellas y laureles; el logo del torneo va encima, al centro. */
export function shieldSvg(inner: string, innerDark: string) {
  // Corona de laurel: hojas a lo largo de un arco alrededor de la parte baja del escudo
  const leaves = (side: 1 | -1) =>
    Array.from({ length: 11 }, (_, i) => {
      const t = i / 10
      const a = Math.PI / 2 + side * (0.35 + t * 1.75) // desde abajo hacia arriba, por cada lado
      const cx = 160 + Math.cos(a) * 128
      const cy = 178 + Math.sin(a) * 140
      const rot = (a * 180) / Math.PI + (side === 1 ? 70 : 110)
      const out = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="9" ry="21" transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})" fill="url(#gold)" stroke="#7c4a03" stroke-width="1.5"/>`
      // Segunda fila de hojas, un poco hacia adentro
      const cx2 = 160 + Math.cos(a + side * 0.09) * 112
      const cy2 = 178 + Math.sin(a + side * 0.09) * 124
      return out + `<ellipse cx="${f(cx2)}" cy="${f(cy2)}" rx="7" ry="17" transform="rotate(${f(rot - side * 40)} ${f(cx2)} ${f(cy2)})" fill="url(#gold)" stroke="#7c4a03" stroke-width="1.5"/>`
    }).join('')
  const star = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, k) => {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2
      const rr = k % 2 ? r * 0.45 : r
      return `${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`
    }).join(' ')
    return `<polygon points="${pts}" fill="url(#gold)" stroke="#7c4a03" stroke-width="2"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="360" viewBox="0 0 320 360">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7c2"/><stop offset="0.35" stop-color="#facc15"/><stop offset="0.7" stop-color="#ca8a04"/><stop offset="1" stop-color="#fde68a"/></linearGradient>
    <radialGradient id="inner" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${innerDark}"/></radialGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity="0.6"/></filter>
  </defs>
  <g filter="url(#sh)">
    ${leaves(1)}${leaves(-1)}
    <path d="M160,40 L268,78 C268,190 236,268 160,318 C84,268 52,190 52,78 Z" fill="url(#gold)" stroke="#7c4a03" stroke-width="4"/>
    <path d="M160,60 L250,92 C250,190 222,254 160,296 C98,254 70,190 70,92 Z" fill="url(#inner)"/>
    <path d="M160,60 L250,92 C250,120 248,140 244,160 C200,120 120,120 76,160 C72,140 70,120 70,92 Z" fill="#fff" opacity="0.12"/>
    ${star(160, 24, 20)}${star(116, 34, 14)}${star(204, 34, 14)}
  </g>
</svg>`
}

/** Brochazo con bordes irregulares (para "JORNADA", "DESCANSA", "NOTA", "VS"). */
export function brushSvg(color: string, w: number, h: number, seed = 3) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="rough" x="-10%" y="-20%" width="120%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035 0.09" numOctaves="3" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${Math.round(h * 0.35)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.25"/></linearGradient>
  </defs>
  <g filter="url(#rough)">
    <path d="M${w * 0.04},${h * 0.18} L${w * 0.97},${h * 0.08} L${w * 0.93},${h * 0.88} L${w * 0.02},${h * 0.94} Z" fill="${color}"/>
    <path d="M${w * 0.04},${h * 0.18} L${w * 0.97},${h * 0.08} L${w * 0.93},${h * 0.88} L${w * 0.02},${h * 0.94} Z" fill="url(#bg)"/>
  </g>
</svg>`
}

/** Balón para los encabezados de cancha. */
export const BALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <defs><radialGradient id="b" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cbd5e1"/></radialGradient></defs>
  <circle cx="50" cy="50" r="46" fill="url(#b)" stroke="#0f172a" stroke-width="3"/>
  <polygon points="50,30 69,44 62,66 38,66 31,44" fill="#0f172a"/>
  <polygon points="50,4 60,12 56,22 44,22 40,12" fill="#0f172a"/>
  <polygon points="94,40 90,54 80,52 77,40 88,32" fill="#0f172a"/>
  <polygon points="6,40 12,32 23,40 20,52 10,54" fill="#0f172a"/>
  <polygon points="76,88 66,94 58,86 64,76 76,78" fill="#0f172a"/>
  <polygon points="24,88 24,78 36,76 42,86 34,94" fill="#0f172a"/>
</svg>`
