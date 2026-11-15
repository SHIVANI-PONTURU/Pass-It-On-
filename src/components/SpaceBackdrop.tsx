import { AstronautFigure, CartoonRocket } from './AstronautFigure'

// Decorative space scenery behind the map, machine and finale pages: stars, galaxies, planets,
// clouds along the bottom, Quill waving in one corner and a rocket in the other.
// Pure decoration (aria-hidden, no clicks); the films and photos carry the real NASA content.

// Fixed pseudo-random stars, so the sky is the same on every visit.
const STARS = (() => {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 90 }, (_, i) => ({ x: rnd() * 1600, y: rnd() * 900, r: rnd() * 1.6 + 0.5, twinkle: i % 7 === 0 }))
})()

function Planet({ x, y, r, base, band, ring }: { x: number; y: number; r: number; base: string; band: string; ring?: string }) {
  return (
    <g>
      {ring && <ellipse cx={x} cy={y} rx={r * 1.75} ry={r * 0.45} fill="none" stroke={ring} strokeWidth={r * 0.14} transform={`rotate(-16 ${x} ${y})`} opacity={0.9} />}
      <circle cx={x} cy={y} r={r} fill={base} />
      <path d={`M${x - r} ${y - r * 0.2} Q${x} ${y - r * 0.45} ${x + r} ${y - r * 0.2}`} stroke={band} strokeWidth={r * 0.16} fill="none" opacity={0.7} />
      <path d={`M${x - r * 0.95} ${y + r * 0.3} Q${x} ${y + r * 0.05} ${x + r * 0.95} ${y + r * 0.3}`} stroke={band} strokeWidth={r * 0.12} fill="none" opacity={0.55} />
      <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.22} fill="#fff" opacity={0.25} />
      {ring && (
        <path
          d={`M${x - r * 1.68} ${y + r * 0.2} Q${x} ${y + r * 0.75} ${x + r * 1.68} ${y - r * 0.38}`}
          fill="none"
          stroke={ring}
          strokeWidth={r * 0.14}
          transform={`rotate(-16 ${x} ${y})`}
          opacity={0.95}
        />
      )}
    </g>
  )
}

export default function SpaceBackdrop({ astronaut = true }: { astronaut?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(ellipse_at_top,#292524_0%,#0c0a09_50%,#000_100%)]">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="sb-galaxy-a">
            <stop offset="0%" stopColor="#fde68a" stopOpacity={0.55} />
            <stop offset="35%" stopColor="#fb923c" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#1c1917" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="sb-galaxy-b">
            <stop offset="0%" stopColor="#e7e5e4" stopOpacity={0.5} />
            <stop offset="40%" stopColor="#a8a29e" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#0c0a09" stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={1290} cy={170} rx={150} ry={70} fill="url(#sb-galaxy-a)" transform="rotate(-20 1290 170)" />
        <ellipse cx={150} cy={560} rx={170} ry={60} fill="url(#sb-galaxy-a)" transform="rotate(-12 150 560)" />
        <ellipse cx={560} cy={760} rx={150} ry={80} fill="url(#sb-galaxy-b)" />
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.75}>
            {s.twinkle && <animate attributeName="opacity" values="0.9;0.2;0.9" dur={`${2 + (i % 5)}s`} repeatCount="indefinite" />}
          </circle>
        ))}
        <Planet x={110} y={120} r={58} base="#d6b48c" band="#a16207" ring="#fbbf24" />
        <Planet x={1500} y={90} r={50} base="#c2410c" band="#7c2d12" />
        <Planet x={70} y={380} r={42} base="#a8a29e" band="#57534e" ring="#d6d3d1" />
        <Planet x={1530} y={380} r={40} base="#e7a27a" band="#b45309" />
        <g>
          <circle cx={1500} cy={560} r={30} fill="#78716c" />
          <circle cx={1490} cy={552} r={7} fill="#57534e" />
          <circle cx={1510} cy={572} r={5} fill="#57534e" />
          <circle cx={1514} cy={548} r={4} fill="#57534e" />
        </g>
        <Planet x={1460} y={720} r={78} base="#fb923c" band="#c2410c" />
        {/* soft clouds along the bottom */}
        <g fill="#292524" opacity={0.7}>
          {[0, 120, 260, 420, 560, 720, 880, 1040, 1180, 1320, 1470, 1600].map((x, i) => (
            <circle key={x} cx={x} cy={905 - (i % 3) * 14} r={70 + (i % 4) * 14} />
          ))}
        </g>
      </svg>
      {/* Quill waving (bottom left) and a rocket (bottom right); only on wide screens, beside the content */}
      {astronaut && (
        <svg viewBox="-6 -14 172 214" className="absolute bottom-4 left-4 hidden h-40 w-auto 2xl:block" style={{ overflow: 'visible' }}>
          <AstronautFigure arm="wave" float />
        </svg>
      )}
      <div className="space-rocket absolute bottom-10 right-8 hidden 2xl:block">
        <svg viewBox="0 0 100 220" className="h-44 w-auto rotate-12">
          <CartoonRocket flying />
        </svg>
      </div>
    </div>
  )
}
