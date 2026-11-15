// Cartoon versions of the real machines, drawn simply but with the right parts in the right places
// (three legs, six wheels, dish antennas, camera masts...). Each sprite stands on the ground at (0, 0)
// and is drawn upwards (negative y). `PARTS` gives where each part is, for labels and highlights.
import type { ReactNode } from 'react'
import { AstronautFigure } from '../AstronautFigure'

export const INK = '#1e293b'
const SILVER = '#cbd5e1'
const LIGHT = '#e2e8f0'
const WHITE = '#f8fafc'
const DARK = '#334155'
const SOLAR = '#1e3a8a'
const GRID = '#60a5fa'
const GOLD = '#f2b84b'

export type SpriteProps = { sleep?: boolean; look?: 'left' | 'right' | 'ahead' }
type Pt = { x: number; y: number }

/** Two friendly eyes. Closed when asleep. */
export function Eyes({ x, y, gap = 22, r = 7, sleep, look = 'ahead' }: { x: number; y: number; gap?: number; r?: number } & SpriteProps) {
  const dx = look === 'left' ? -r * 0.35 : look === 'right' ? r * 0.35 : 0
  if (sleep) {
    return (
      <g stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round">
        <path d={`M${x - gap / 2 - r} ${y} q${r} ${r * 0.8} ${2 * r} 0`} />
        <path d={`M${x + gap / 2 - r} ${y} q${r} ${r * 0.8} ${2 * r} 0`} />
      </g>
    )
  }
  return (
    <g className="cf-blink">
      {[-1, 1].map((s) => (
        <g key={s}>
          <circle cx={x + (s * gap) / 2} cy={y} r={r} fill={WHITE} stroke={INK} strokeWidth={2} />
          <circle cx={x + (s * gap) / 2 + dx} cy={y + 1} r={r * 0.5} fill={INK} />
          <circle cx={x + (s * gap) / 2 + dx + r * 0.2} cy={y - r * 0.15} r={r * 0.16} fill={WHITE} />
        </g>
      ))}
    </g>
  )
}

function Grid({ x, y, w, h, cols = 4, rows = 2 }: { x: number; y: number; w: number; h: number; cols?: number; rows?: number }) {
  const lines: ReactNode[] = []
  for (let i = 1; i < cols; i++) lines.push(<line key={`c${i}`} x1={x + (w * i) / cols} y1={y} x2={x + (w * i) / cols} y2={y + h} />)
  for (let j = 1; j < rows; j++) lines.push(<line key={`r${j}`} x1={x} y1={y + (h * j) / rows} x2={x + w} y2={y + (h * j) / rows} />)
  return (
    <g stroke={GRID} strokeWidth={1.2} opacity={0.8}>
      {lines}
    </g>
  )
}

function Wheel({ cx, cy, r, mesh }: { cx: number; cy: number; r: number; mesh?: boolean }) {
  return (
    <g className="cf-wheel">
      <circle cx={cx} cy={cy} r={r} fill={mesh ? '#94a3b8' : '#475569'} stroke={INK} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={mesh ? INK : '#94a3b8'} strokeWidth={mesh ? 1.5 : 2} strokeDasharray={mesh ? '3 3' : undefined} />
      <line x1={cx - r * 0.8} y1={cy} x2={cx + r * 0.8} y2={cy} stroke={INK} strokeWidth={1.5} opacity={0.5} />
      <line x1={cx} y1={cy - r * 0.8} x2={cx} y2={cy + r * 0.8} stroke={INK} strokeWidth={1.5} opacity={0.5} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill={SILVER} stroke={INK} strokeWidth={1.5} />
    </g>
  )
}

function Foot({ x, y, rx = 18 }: { x: number; y: number; rx?: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.32} fill={LIGHT} stroke={INK} strokeWidth={3} />
}

// ------------------------------------------------------------------ Surveyor 3

export function Surveyor({ sleep, look }: SpriteProps) {
  return (
    <g strokeLinejoin="round">
      <line x1="0" y1="-84" x2="0" y2="-14" stroke={INK} strokeWidth="6" />
      <Foot x={0} y={-10} rx={15} />
      <line x1="-28" y1="-86" x2="-104" y2="-12" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <line x1="28" y1="-86" x2="104" y2="-12" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <Foot x={-108} y={-7} rx={22} />
      <Foot x={108} y={-7} rx={22} />
      {/* scoop arm */}
      <path d="M34 -98 L78 -78 L108 -62" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 -70 L122 -66 L116 -50 L102 -52 Z" fill={SILVER} stroke={INK} strokeWidth="3" />
      {/* frame and body */}
      <path d="M-48 -80 L48 -80 L32 -122 L-32 -122 Z" fill={SILVER} stroke={INK} strokeWidth="3" />
      <rect x="-28" y="-116" width="56" height="30" rx="6" fill={WHITE} stroke={INK} strokeWidth="3" />
      {/* mast, solar panel, flat antenna */}
      <line x1="0" y1="-122" x2="0" y2="-236" stroke={INK} strokeWidth="5" />
      <g transform="rotate(-14 -40 -236)">
        <rect x="-78" y="-254" width="64" height="34" rx="2" fill={SOLAR} stroke={INK} strokeWidth="3" />
        <Grid x={-78} y={-254} w={64} h={34} />
      </g>
      <rect x="10" y="-258" width="44" height="40" rx="2" fill={LIGHT} stroke={INK} strokeWidth="3" />
      <Grid x={10} y={-258} w={44} h={40} cols={3} rows={3} />
      {/* TV camera with its mirror hood */}
      <rect x="-72" y="-160" width="28" height="54" rx="7" fill={WHITE} stroke={INK} strokeWidth="3" />
      <path d="M-76 -160 L-40 -160 L-46 -180 L-70 -178 Z" fill={SILVER} stroke={INK} strokeWidth="3" />
      <Eyes x={0} y={-101} gap={24} r={7} sleep={sleep} look={look} />
    </g>
  )
}

// ------------------------------------------------------------------ Apollo 12 science station (ALSEP)

export function Alsep({ sleep, look, powered = true }: SpriteProps & { powered?: boolean }) {
  return (
    <g strokeLinejoin="round">
      {/* cables */}
      <g stroke={DARK} strokeWidth="2" fill="none">
        <path d="M-138 -8 Q-90 4 -40 -6" />
        <path d="M40 -6 Q66 2 86 -6" />
        <path d="M40 -10 Q110 8 182 -6" />
      </g>
      {/* plutonium generator (RTG): finned cylinder */}
      <g>
        <rect x="-166" y="-62" width="28" height="56" rx="6" fill={DARK} stroke={INK} strokeWidth="3" />
        {[-176, -128].map((x) => (
          <rect key={x} x={x} y="-56" width="10" height="44" rx="2" fill="#475569" stroke={INK} strokeWidth="2" />
        ))}
        <circle cx="-152" cy="-34" r="8" fill={powered ? '#fb923c' : '#475569'} className={powered ? 'cf-pulse' : undefined} />
      </g>
      {/* central station with sunshade */}
      <line x1="-36" y1="-60" x2="-36" y2="-48" stroke={INK} strokeWidth="3" />
      <line x1="36" y1="-60" x2="36" y2="-48" stroke={INK} strokeWidth="3" />
      <rect x="-54" y="-68" width="108" height="9" rx="2" fill={LIGHT} stroke={INK} strokeWidth="3" />
      <rect x="-42" y="-50" width="84" height="46" rx="6" fill={GOLD} stroke={INK} strokeWidth="3" />
      <rect x="-30" y="-44" width="60" height="30" rx="5" fill={WHITE} stroke={INK} strokeWidth="2" />
      {/* helical antenna pointing at Earth */}
      <line x1="16" y1="-68" x2="16" y2="-150" stroke={INK} strokeWidth="3" />
      <path d="M8 -78 L24 -86 L8 -94 L24 -102 L8 -110 L24 -118 L8 -126 L24 -134 L8 -142" fill="none" stroke={INK} strokeWidth="2.5" />
      {/* seismometer: silver drum under a shiny skirt */}
      <ellipse cx="112" cy="-6" rx="38" ry="9" fill={LIGHT} stroke={INK} strokeWidth="3" />
      <path d="M92 -8 Q92 -42 112 -44 Q132 -42 132 -8 Z" fill={SILVER} stroke={INK} strokeWidth="3" />
      {/* magnetometer: three arms with sensors */}
      <line x1="196" y1="-6" x2="196" y2="-44" stroke={INK} strokeWidth="4" />
      <g stroke={INK} strokeWidth="3">
        <line x1="196" y1="-44" x2="164" y2="-62" />
        <line x1="196" y1="-44" x2="228" y2="-62" />
        <line x1="196" y1="-44" x2="196" y2="-82" />
      </g>
      {[
        [164, -62],
        [228, -62],
        [196, -82],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill={WHITE} stroke={INK} strokeWidth="2.5" />
      ))}
      <Eyes x={0} y={-29} gap={24} r={7} sleep={sleep} look={look} />
    </g>
  )
}

// ------------------------------------------------------------------ Apollo 15 moon buggy (LRV)

export function Lrv({ sleep, look }: SpriteProps) {
  return (
    <g strokeLinejoin="round">
      {/* dish antenna on its mast */}
      <line x1="100" y1="-50" x2="100" y2="-150" stroke={INK} strokeWidth="4" />
      <path d="M66 -150 Q100 -196 134 -150 Z" fill={LIGHT} stroke={INK} strokeWidth="3" />
      <g stroke={INK} strokeWidth="1" opacity={0.5}>
        <line x1="100" y1="-150" x2="100" y2="-172" />
        <line x1="82" y1="-152" x2="92" y2="-168" />
        <line x1="118" y1="-152" x2="108" y2="-168" />
      </g>
      {/* chassis */}
      <rect x="-124" y="-52" width="246" height="12" rx="4" fill={SILVER} stroke={INK} strokeWidth="3" />
      {/* two seats */}
      {[-58, -14].map((x) => (
        <path key={x} d={`M${x} -52 L${x} -86 L${x + 7} -86 L${x + 7} -62 L${x + 36} -62 L${x + 36} -52 Z`} fill="#94a3b8" stroke={INK} strokeWidth="3" />
      ))}
      {/* T-shaped hand controller between the seats and the front */}
      <line x1="36" y1="-52" x2="36" y2="-84" stroke={INK} strokeWidth="4" />
      <rect x="28" y="-92" width="16" height="9" rx="3" fill={DARK} stroke={INK} strokeWidth="2" />
      {/* control and display panel: the buggy's face */}
      <line x1="72" y1="-52" x2="72" y2="-90" stroke={INK} strokeWidth="4" />
      <rect x="52" y="-124" width="44" height="36" rx="5" fill={LIGHT} stroke={INK} strokeWidth="3" />
      {/* batteries at the front */}
      <rect x="92" y="-64" width="28" height="12" rx="2" fill={GOLD} stroke={INK} strokeWidth="2.5" />
      {/* fenders and wire-mesh wheels */}
      {[-80, 80].map((x) => (
        <path key={x} d={`M${x - 36} -34 A36 36 0 0 1 ${x + 36} -34`} fill="none" stroke={LIGHT} strokeWidth="7" strokeLinecap="round" />
      ))}
      <Wheel cx={-80} cy={-28} r={28} mesh />
      <Wheel cx={80} cy={-28} r={28} mesh />
      <Eyes x={74} y={-106} gap={18} r={6} sleep={sleep} look={look} />
    </g>
  )
}

// ------------------------------------------------------------------ Viking lander

export function Viking({ sleep, look }: SpriteProps) {
  return (
    <g strokeLinejoin="round">
      <line x1="0" y1="-50" x2="0" y2="-14" stroke={INK} strokeWidth="6" />
      <Foot x={0} y={-10} rx={14} />
      <line x1="-56" y1="-62" x2="-108" y2="-12" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <line x1="56" y1="-62" x2="108" y2="-12" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <Foot x={-112} y={-7} rx={20} />
      <Foot x={112} y={-7} rx={20} />
      {/* weather boom on a leg */}
      <line x1="76" y1="-46" x2="104" y2="-126" stroke={INK} strokeWidth="3" />
      <rect x="96" y="-136" width="18" height="10" rx="2" fill={WHITE} stroke={INK} strokeWidth="2.5" />
      {/* sampler arm and scoop */}
      <path d="M70 -70 L120 -54 L146 -40" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M140 -48 L160 -42 L152 -30 L140 -32 Z" fill={SILVER} stroke={INK} strokeWidth="3" />
      {/* six-sided body */}
      <path d="M-74 -68 L-58 -102 L58 -102 L74 -68 L58 -48 L-58 -48 Z" fill={LIGHT} stroke={INK} strokeWidth="3" />
      <path d="M-58 -60 L58 -60" stroke={SILVER} strokeWidth="3" />
      {/* plutonium generators with fins */}
      {[-60, 40].map((x) => (
        <g key={x}>
          <rect x={x} y="-122" width="22" height="20" rx="3" fill={DARK} stroke={INK} strokeWidth="2.5" />
          <line x1={x + 5} y1="-122" x2={x + 5} y2="-102" stroke="#64748b" strokeWidth="2" />
          <line x1={x + 11} y1="-122" x2={x + 11} y2="-102" stroke="#64748b" strokeWidth="2" />
          <line x1={x + 17} y1="-122" x2={x + 17} y2="-102" stroke="#64748b" strokeWidth="2" />
        </g>
      ))}
      {/* dish antenna */}
      <line x1="-30" y1="-102" x2="-44" y2="-162" stroke={INK} strokeWidth="4" />
      <path d="M-78 -170 Q-44 -140 -10 -170 Z" fill={WHITE} stroke={INK} strokeWidth="3" />
      {/* two cameras = two eyes */}
      {[-14, 14].map((x) => (
        <g key={x}>
          <rect x={x - 9} y="-140" width="18" height="40" rx="6" fill={WHITE} stroke={INK} strokeWidth="3" />
        </g>
      ))}
      <Eyes x={0} y={-128} gap={28} r={7} sleep={sleep} look={look} />
    </g>
  )
}

// ------------------------------------------------------------------ Sojourner

export function Sojourner({ sleep, look }: SpriteProps) {
  return (
    <g strokeLinejoin="round">
      <line x1="-36" y1="-70" x2="-42" y2="-124" stroke={INK} strokeWidth="2.5" />
      <circle cx="-42" cy="-126" r="4" fill={GOLD} stroke={INK} strokeWidth="2" />
      <path d="M-52 -15 L-26 -42 L0 -15 M-26 -42 L28 -46 L52 -15" fill="none" stroke={DARK} strokeWidth="4" strokeLinecap="round" />
      <rect x="-46" y="-62" width="92" height="26" rx="5" fill={GOLD} stroke={INK} strokeWidth="3" />
      <rect x="-58" y="-72" width="116" height="11" rx="2" fill={SOLAR} stroke={INK} strokeWidth="3" />
      <Grid x={-58} y={-72} w={116} h={11} cols={8} rows={1} />
      <Wheel cx={-52} cy={-15} r={15} />
      <Wheel cx={0} cy={-15} r={15} />
      <Wheel cx={52} cy={-15} r={15} />
      <Eyes x={0} y={-49} gap={20} r={6} sleep={sleep} look={look} />
    </g>
  )
}

// ------------------------------------------------------------------ Spirit and Opportunity (MER)

export function Mer({ sleep, look, color = '#f1e3b0' }: SpriteProps & { color?: string }) {
  return (
    <g strokeLinejoin="round">
      {/* low-gain antenna and dish antenna */}
      <line x1="-92" y1="-98" x2="-96" y2="-152" stroke={INK} strokeWidth="2.5" />
      <line x1="-58" y1="-98" x2="-58" y2="-118" stroke={INK} strokeWidth="3" />
      <ellipse cx="-58" cy="-124" rx="17" ry="8" fill={WHITE} stroke={INK} strokeWidth="3" />
      {/* rocker-bogie suspension */}
      <path d="M-78 -20 L-40 -54 L0 -20 M-40 -54 L36 -58 L78 -20" fill="none" stroke={DARK} strokeWidth="5" strokeLinecap="round" />
      {/* body */}
      <rect x="-58" y="-88" width="116" height="36" rx="6" fill={color} stroke={INK} strokeWidth="3" />
      {/* wing-shaped solar panels */}
      <path d="M-128 -102 L128 -102 L150 -90 L-150 -90 Z" fill={SOLAR} stroke={INK} strokeWidth="3" />
      <Grid x={-128} y={-102} w={256} h={12} cols={10} rows={1} />
      {/* robotic arm with its tool turret (Rock Abrasion Tool) */}
      <path d="M58 -68 L98 -60 L112 -38" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <circle cx="114" cy="-30" r="9" fill={SILVER} stroke={INK} strokeWidth="3" />
      <rect x="110" y="-24" width="8" height="10" rx="2" fill={DARK} />
      {/* camera mast and head: the eyes */}
      <line x1="30" y1="-102" x2="30" y2="-178" stroke={INK} strokeWidth="5" />
      <rect x="4" y="-198" width="56" height="22" rx="6" fill={WHITE} stroke={INK} strokeWidth="3" />
      <Wheel cx={-78} cy={-20} r={20} />
      <Wheel cx={0} cy={-20} r={20} />
      <Wheel cx={78} cy={-20} r={20} />
      <Eyes x={32} y={-187} gap={26} r={7} sleep={sleep} look={look} />
    </g>
  )
}

// ------------------------------------------------------------------ Perseverance (a newer rover, for the hand-off)

export function NewRover({ look }: SpriteProps) {
  return (
    <g strokeLinejoin="round">
      <path d="M-84 -24 L-44 -60 L0 -24 M-44 -60 L40 -64 L84 -24" fill="none" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
      <rect x="-66" y="-100" width="132" height="42" rx="7" fill={WHITE} stroke={INK} strokeWidth="3" />
      {/* nuclear power source at the back, no solar panels */}
      <g transform="rotate(-25 -78 -96)">
        <rect x="-104" y="-104" width="34" height="18" rx="5" fill={DARK} stroke={INK} strokeWidth="3" />
      </g>
      <path d="M66 -78 L104 -70 L118 -44" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <circle cx="120" cy="-36" r="10" fill={SILVER} stroke={INK} strokeWidth="3" />
      <line x1="34" y1="-100" x2="34" y2="-184" stroke={INK} strokeWidth="5" />
      <rect x="6" y="-206" width="58" height="24" rx="6" fill={WHITE} stroke={INK} strokeWidth="3" />
      <Wheel cx={-84} cy={-24} r={24} />
      <Wheel cx={0} cy={-24} r={24} />
      <Wheel cx={84} cy={-24} r={24} />
      <Eyes x={35} y={-194} gap={26} r={7} look={look} />
    </g>
  )
}

// ------------------------------------------------------------------ Apollo lunar module (two halves)

export function LmDescent() {
  return (
    <g strokeLinejoin="round">
      <line x1="-46" y1="-62" x2="-102" y2="-10" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <line x1="46" y1="-62" x2="102" y2="-10" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <line x1="-30" y1="-52" x2="-96" y2="-30" stroke={INK} strokeWidth="3" />
      <line x1="30" y1="-52" x2="96" y2="-30" stroke={INK} strokeWidth="3" />
      <Foot x={-104} y={-6} rx={18} />
      <Foot x={104} y={-6} rx={18} />
      <path d="M-14 -48 L14 -48 L20 -32 L-20 -32 Z" fill={DARK} stroke={INK} strokeWidth="3" />
      <path d="M-60 -98 L60 -98 L60 -48 L-60 -48 Z" fill={GOLD} stroke={INK} strokeWidth="3" />
      <g stroke="#b45309" strokeWidth="2" opacity={0.7}>
        <line x1="-30" y1="-98" x2="-30" y2="-48" />
        <line x1="0" y1="-98" x2="0" y2="-48" />
        <line x1="30" y1="-98" x2="30" y2="-48" />
      </g>
    </g>
  )
}

export function LmAscent() {
  return (
    <g strokeLinejoin="round">
      <line x1="40" y1="-160" x2="52" y2="-182" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="54" cy="-186" rx="10" ry="5" fill={WHITE} stroke={INK} strokeWidth="2" />
      <path d="M-48 -98 L-54 -140 L-32 -170 L30 -170 L52 -140 L46 -98 Z" fill="#d1d5db" stroke={INK} strokeWidth="3" />
      <rect x="-10" y="-178" width="20" height="8" rx="2" fill={SILVER} stroke={INK} strokeWidth="2" />
      <path d="M-30 -146 L-14 -158 L-14 -134 Z" fill="#0f172a" />
      <path d="M30 -146 L14 -158 L14 -134 Z" fill="#0f172a" />
    </g>
  )
}

// ------------------------------------------------------------------ rocket, astronaut, Quill

export function Rocket({ tall }: { tall?: boolean }) {
  const h = tall ? 150 : 110
  return (
    <g strokeLinejoin="round">
      <path d={`M-14 0 L-28 18 L-14 14 Z M14 0 L28 18 L14 14 Z`} fill="#ef4444" stroke={INK} strokeWidth="2.5" />
      <rect x="-14" y={-h} width="28" height={h + 14} rx="4" fill={WHITE} stroke={INK} strokeWidth="3" />
      {tall && <rect x="-14" y={-h * 0.62} width="28" height="10" fill={INK} />}
      <rect x="-14" y={-h * 0.3} width="28" height="10" fill={INK} />
      <path d={`M-14 ${-h} Q0 ${-h - 40} 14 ${-h} Z`} fill={SILVER} stroke={INK} strokeWidth="3" />
      <circle cx="0" cy={-h * 0.8} r="6" fill="#7dd3fc" stroke={INK} strokeWidth="2" />
    </g>
  )
}

/** A plain astronaut with a gold visor: no names, flags or badges. */
export function Astronaut() {
  return (
    <g strokeLinejoin="round">
      <g className="cf-step">
        <rect x="-16" y="-44" width="13" height="40" rx="6" fill={WHITE} stroke={INK} strokeWidth="3" />
        <rect x="3" y="-44" width="13" height="40" rx="6" fill={WHITE} stroke={INK} strokeWidth="3" />
        <rect x="-18" y="-8" width="16" height="8" rx="3" fill={DARK} />
        <rect x="2" y="-8" width="16" height="8" rx="3" fill={DARK} />
      </g>
      <rect x="-30" y="-96" width="20" height="44" rx="5" fill={SILVER} stroke={INK} strokeWidth="3" />
      <rect x="-22" y="-100" width="44" height="58" rx="14" fill={WHITE} stroke={INK} strokeWidth="3" />
      <rect x="18" y="-94" width="12" height="34" rx="6" fill={WHITE} stroke={INK} strokeWidth="3" />
      <circle cx="0" cy="-118" r="24" fill={WHITE} stroke={INK} strokeWidth="3" />
      <path d="M-15 -128 Q0 -138 17 -128 L17 -112 Q0 -102 -15 -112 Z" fill={GOLD} stroke={INK} strokeWidth="2.5" />
    </g>
  )
}

/** Quill, the rookie astronaut (same drawing as the app's Quill). Feet at (0,0). */
export function QuillBot({ talking }: { talking?: boolean }) {
  return (
    <g transform="scale(0.72) translate(-80 -198)">
      <AstronautFigure arm="point" mood={talking ? 'speaking' : 'idle'} />
    </g>
  )
}

// ------------------------------------------------------------------ which sprite for which machine

type SpriteDef = {
  draw: (p: SpriteProps) => ReactNode
  /** Size on stage (sprites are drawn at different sizes). */
  scale: number
  /** Where each part is, in sprite coordinates. */
  parts: Record<string, Pt>
  /** Where the eyes are (for "photo" flashes) and the working tool (for digging, grinding). */
  camera: Pt
  tool?: Pt
  twins?: boolean
}

export const SPRITES: Record<string, SpriteDef> = {
  'surveyor-3': {
    draw: (p) => <Surveyor {...p} />,
    scale: 1,
    parts: { legs: { x: -100, y: -22 }, camera: { x: -58, y: -150 }, scoop: { x: 112, y: -58 }, 'solar-panel': { x: -46, y: -238 }, antenna: { x: 32, y: -238 } },
    camera: { x: -58, y: -170 },
    tool: { x: 112, y: -50 },
  },
  'apollo-12-alsep': {
    draw: (p) => <Alsep {...p} />,
    scale: 0.95,
    parts: { 'central-station': { x: 0, y: -28 }, antenna: { x: 16, y: -120 }, rtg: { x: -152, y: -34 }, seismometer: { x: 112, y: -26 }, magnetometer: { x: 196, y: -62 } },
    camera: { x: 0, y: -29 },
  },
  'apollo-15-lrv': {
    draw: (p) => <Lrv {...p} />,
    scale: 1.2,
    parts: { wheels: { x: 80, y: -28 }, batteries: { x: 106, y: -58 }, seats: { x: -26, y: -70 }, 'hand-controller': { x: 36, y: -88 }, 'navigation-panel': { x: 74, y: -106 }, antenna: { x: 100, y: -164 } },
    camera: { x: 74, y: -106 },
  },
  'viking-landers': {
    draw: (p) => <Viking {...p} />,
    scale: 1.15,
    parts: { legs: { x: -100, y: -22 }, cameras: { x: 0, y: -128 }, 'sampler-arm': { x: 146, y: -38 }, 'weather-boom': { x: 105, y: -131 }, rtg: { x: -49, y: -112 }, 'biology-lab': { x: 0, y: -76 } },
    camera: { x: 0, y: -140 },
    tool: { x: 150, y: -32 },
    twins: true,
  },
  sojourner: {
    draw: (p) => <Sojourner {...p} />,
    scale: 1.9,
    parts: { wheels: { x: 0, y: -15 }, 'solar-panel': { x: 0, y: -67 }, cameras: { x: 0, y: -49 }, antenna: { x: -42, y: -118 } },
    camera: { x: 0, y: -49 },
    tool: { x: -46, y: -40 },
  },
  'spirit-opportunity': {
    draw: (p) => <Mer {...p} />,
    scale: 1.1,
    parts: {
      wheels: { x: 0, y: -20 },
      'mast-cameras': { x: 32, y: -187 },
      'solar-wings': { x: -110, y: -96 },
      'robotic-arm': { x: 98, y: -60 },
      'rock-abrasion-tool': { x: 114, y: -28 },
      antenna: { x: -58, y: -124 },
    },
    camera: { x: 32, y: -187 },
    tool: { x: 116, y: -18 },
    twins: true,
  },
}
