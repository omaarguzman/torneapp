/** Escudo de Torneapp: escudo dorado con balón y laureles. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 100 112" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#f5c84c" />
          <stop offset="0.75" stopColor="#c99a1e" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id="tg-inner" cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#1f2937" />
          <stop offset="1" stopColor="#030712" />
        </radialGradient>
      </defs>
      {/* Laureles */}
      {[-1, 1].map((side) =>
        [0, 1, 2, 3, 4].map((i) => {
          const a = Math.PI / 2 + side * (0.55 + i * 0.32)
          const cx = 50 + Math.cos(a) * 44
          const cy = 58 + Math.sin(a) * 46
          const rot = (a * 180) / Math.PI + (side === 1 ? 70 : 110)
          return (
            <ellipse
              key={`${side}-${i}`}
              cx={cx}
              cy={cy}
              rx="3.6"
              ry="8"
              transform={`rotate(${rot} ${cx} ${cy})`}
              fill="url(#tg-gold)"
              stroke="#7c4a03"
              strokeWidth="0.8"
            />
          )
        })
      )}
      {/* Escudo */}
      <path d="M50 8 L86 20 C86 58 76 84 50 100 C24 84 14 58 14 20 Z" fill="url(#tg-gold)" stroke="#7c4a03" strokeWidth="1.5" />
      <path d="M50 15 L80 25 C80 58 71 79 50 92 C29 79 20 58 20 25 Z" fill="url(#tg-inner)" />
      {/* Balón */}
      <circle cx="50" cy="50" r="19" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.6" />
      <polygon points="50,41 58.6,47.2 55.3,57.3 44.7,57.3 41.4,47.2" fill="#0f172a" />
      <polygon points="50,31.5 54.5,34.8 52.7,38.5 47.3,38.5 45.5,34.8" fill="#0f172a" />
      <polygon points="68.2,45 67.5,51 63.2,50.2 62,45.6 65.6,42.3" fill="#0f172a" />
      <polygon points="31.8,45 34.4,42.3 38,45.6 36.8,50.2 32.5,51" fill="#0f172a" />
      <polygon points="61.3,66.3 57,68.4 54.6,65 57,61.7 61,62.5" fill="#0f172a" />
      <polygon points="38.7,66.3 39,62.5 43,61.7 45.4,65 43,68.4" fill="#0f172a" />
      {/* Estrella */}
      <polygon points="50,0 52.4,5.2 58,5.6 53.7,9.2 55.1,14.6 50,11.7 44.9,14.6 46.3,9.2 42,5.6 47.6,5.2" fill="url(#tg-gold)" stroke="#7c4a03" strokeWidth="0.6" />
    </svg>
  )
}

/** Escudo + nombre. */
export default function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display tracking-wide leading-none" style={{ fontSize: size * 0.72 }}>
        <span className="text-white">TORNE</span>
        <span className="text-amber-400">APP</span>
      </span>
    </span>
  )
}
