/**
 * Ilustraciones en SVG para la imagen del rol (escudo, brochazos, íconos).
 * Se rasterizan con sharp (ver assets.ts) antes de pegarse en la imagen.
 */

export const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const f = (n: number) => n.toFixed(1)

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
