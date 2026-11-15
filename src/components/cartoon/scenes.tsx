// The cartoon mission films: one moving scene per story line.
// Machines are cartoons of the real hardware; the real NASA picture sits on a board in the scene,
// labelled for what it is (real photo, model, NASA drawing...). Narration and captions come from StopScreen.
import { useEffect, useId, useState, type ReactNode } from 'react'
import { formatUsd } from '../../sources'
import type { Machine, MachineImage, SceneSpec, StoryLine, Visual } from '../../types'
import { CARTOON_CSS } from './style'
import { Alsep, Astronaut, INK, LmAscent, LmDescent, Lrv, Mer, NewRover, QuillBot, Rocket, SPRITES, Sojourner, Surveyor } from './sprites'

const GY = 372 // ground line
type Pt = { x: number; y: number }
type DataVisual = Extract<Visual, { type: 'data' }>

function reduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useCountUp(to: number, ms = 3500, delay = 0): number {
  const [n, setN] = useState(() => (reduced() ? to : 0))
  useEffect(() => {
    if (reduced()) {
      setN(to)
      return
    }
    let raf = 0
    const start = performance.now() + delay
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / ms))
      setN(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, delay])
  return n
}

const shortName = (m: Machine) => m.name.split(' (')[0]

// Painted storybook backgrounds made by `npm run art` (public/art). Until they exist, scenes use the drawn ones.
let artFiles: Record<string, string> | null = null
let artLoading: Promise<void> | null = null
function useArt(): Record<string, string> {
  const [, redraw] = useState(0)
  useEffect(() => {
    if (artFiles) return
    artLoading ??= fetch('/art/manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<{ images?: Record<string, { file: string }> }>) : { images: {} }))
      .then((m) => {
        artFiles = Object.fromEntries(Object.entries(m.images ?? {}).map(([k, v]) => [k, `/art/${v.file}`]))
      })
      .catch(() => {
        artFiles = {}
      })
    void artLoading.then(() => redraw((n) => n + 1))
  }, [])
  return artFiles ?? {}
}

function artKey(kind: string, night: boolean | undefined, place: string | undefined): string {
  if (kind === 'moon') return night ? 'moon-night' : place === 'apollo-15-lrv' ? 'moon-mountains' : 'moon-plain'
  if (kind === 'mars') return night ? 'mars-night' : place === 'spirit-opportunity' ? 'mars-plains' : 'mars-day'
  // Space keeps the drawn starfield: the image model kept adding ground, and open space has none.
  if (kind === 'space') return ''
  return kind === 'earth' ? 'earth-day' : kind
}
const worldOf = (m: Machine): 'moon' | 'mars' => (m.body === 'mars' ? 'mars' : 'moon')

// ------------------------------------------------------------------ backgrounds

function Stars({ n = 40, seed = 7, top = 0, bottom = GY - 20 }: { n?: number; seed?: number; top?: number; bottom?: number }) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  return (
    <g fill="#f8fafc">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={rnd() * 800} cy={top + rnd() * (bottom - top)} r={rnd() * 1.6 + 0.6} className={i % 3 === 0 ? 'cf-twinkle' : undefined} style={{ animationDelay: `${(i % 7) * 0.4}s` }} />
      ))}
    </g>
  )
}

function EarthGlobe({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.08} fill="#60a5fa" opacity={0.25} />
      <circle cx={x} cy={y} r={r} fill="#2563eb" stroke={INK} strokeWidth={2} />
      <path d={`M${x - r * 0.5} ${y - r * 0.5} q${r * 0.4} ${-r * 0.2} ${r * 0.6} ${r * 0.2} q${-r * 0.1} ${r * 0.4} ${-r * 0.5} ${r * 0.3} z`} fill="#22c55e" />
      <path d={`M${x + r * 0.1} ${y + r * 0.2} q${r * 0.5} ${-r * 0.1} ${r * 0.5} ${r * 0.4} q${-r * 0.3} ${r * 0.3} ${-r * 0.5} ${r * 0.1} z`} fill="#22c55e" />
      <ellipse cx={x - r * 0.2} cy={y - r * 0.75} rx={r * 0.4} ry={r * 0.12} fill="#f8fafc" opacity={0.8} />
    </g>
  )
}

function World({ kind, night, place }: { kind: 'moon' | 'mars' | 'earth' | 'space' | 'lab'; night?: boolean; place?: string }) {
  const id = useId().replace(/:/g, '')
  const art = useArt()[artKey(kind, night, place)]
  if (art) {
    return (
      <g>
        <rect width="800" height="450" fill="#000" />
        <image href={art} width="800" height="450" preserveAspectRatio="xMidYMid slice" />
      </g>
    )
  }
  if (kind === 'space') {
    return (
      <g>
        <rect width="800" height="450" fill="#000" />
        <Stars n={70} bottom={450} />
      </g>
    )
  }
  if (kind === 'earth') {
    return (
      <g>
        <rect width="800" height="450" fill="#bae6fd" />
        <g fill="#f8fafc" opacity={0.9} className="cf-float">
          <ellipse cx="420" cy="70" rx="50" ry="16" />
          <ellipse cx="450" cy="60" rx="30" ry="14" />
          <ellipse cx="150" cy="50" rx="40" ry="12" />
        </g>
        <rect y={GY} width="800" height={450 - GY} fill="#86efac" />
        <rect y={GY} width="800" height="6" fill="#4ade80" />
      </g>
    )
  }
  if (kind === 'lab') {
    return (
      <g>
        <rect width="800" height="450" fill="#f5f5f4" />
        <g stroke="#bfdbfe" strokeWidth="2">
          {[100, 200, 300].map((y) => (
            <line key={y} x1="0" y1={y} x2="800" y2={y} />
          ))}
        </g>
        <rect y={GY} width="800" height={450 - GY} fill="#cbd5e1" />
        <rect y={GY} width="800" height="5" fill="#94a3b8" />
      </g>
    )
  }
  if (kind === 'moon') {
    return (
      <g>
        <rect width="800" height="450" fill="#000" />
        <Stars />
        <EarthGlobe x={92} y={74} r={22} />
        <path d={`M0 ${GY - 6} Q200 ${GY - 18} 400 ${GY - 6} T800 ${GY - 8} V450 H0 Z`} fill={night ? '#475569' : '#9ca3af'} />
        <g fill={night ? '#334155' : '#6b7280'} opacity={0.7}>
          <ellipse cx="120" cy={GY + 30} rx="40" ry="9" />
          <ellipse cx="520" cy={GY + 50} rx="56" ry="11" />
          <ellipse cx="700" cy={GY + 22} rx="26" ry="6" />
          <ellipse cx="330" cy={GY + 62} rx="30" ry="7" />
        </g>
      </g>
    )
  }
  return (
    <g>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#0f0a2e' : '#f6c79a'} />
          <stop offset="1" stopColor={night ? '#312e81' : '#e2a171'} />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill={`url(#sky${id})`} />
      {night ? <Stars n={35} /> : <circle cx="96" cy="66" r="13" fill="#fffbeb" opacity={0.9} />}
      <path d={`M0 ${GY - 8} Q160 ${GY - 22} 360 ${GY - 6} T800 ${GY - 10} V450 H0 Z`} fill={night ? '#7c2d12' : '#c2410c'} />
      <g fill={night ? '#431407' : '#9a3412'}>
        <path d={`M60 ${GY + 34} l14 -12 l16 4 l6 10 z`} />
        <path d={`M520 ${GY + 52} l20 -16 l22 6 l8 12 z`} />
        <path d={`M700 ${GY + 24} l10 -8 l12 3 l4 7 z`} />
        <path d={`M300 ${GY + 64} l12 -10 l14 3 l5 9 z`} />
      </g>
    </g>
  )
}

// ------------------------------------------------------------------ the real-photo board

const STICKER: Record<string, string> = {
  photo: 'REAL PHOTO',
  earth: 'REAL PHOTO · ON EARTH',
  model: 'MODEL · ON EARTH',
  diagram: 'NASA DRAWING',
  drawing: "ARTIST'S DRAWING",
  trace: 'DRAWING · NOT REAL DATA',
}

function Board({
  img,
  x = 492,
  y = 40,
  w = 292,
  h = 250,
  stand = true,
  reveal,
  trace,
}: {
  img?: MachineImage
  x?: number
  y?: number
  w?: number
  h?: number
  stand?: boolean
  reveal?: boolean
  trace?: boolean
}) {
  const clip = `board${useId().replace(/:/g, '')}`
  const kind = trace ? 'trace' : (img?.kind ?? 'photo')
  const sticker = STICKER[kind]
  const caption = trace ? 'A drawing of the kind of wiggly line a seismometer records.' : (img?.caption ?? '').split(/(?<=\.)\s/)[0]
  const capH = 44
  return (
    <g className="cf-fade">
      {stand && (
        <g stroke="#78350f" strokeWidth="6" strokeLinecap="round">
          <line x1={x + 46} y1={y + h} x2={x + 36} y2={GY + 12} />
          <line x1={x + w - 46} y1={y + h} x2={x + w - 36} y2={GY + 12} />
        </g>
      )}
      <rect x={x} y={y} width={w} height={h} rx={12} fill="#92400e" stroke={INK} strokeWidth={3} />
      <rect x={x + 9} y={y + 9} width={w - 18} height={h - 18 - capH} rx={6} fill="#0b1220" />
      <clipPath id={clip}>
        <rect x={x + 9} y={y + 9} width={w - 18} height={h - 18 - capH} rx={6} />
      </clipPath>
      {trace ? (
        <g clipPath={`url(#${clip})`}>
          <path
            d={`M${x + 18} ${y + (h - capH) / 2} ${Array.from({ length: 34 }, (_, i) => {
              const px = x + 18 + i * ((w - 36) / 34)
              const amp = i < 6 ? 2 : Math.max(3, 48 * Math.exp(-(i - 6) / 9))
              return `L${px} ${y + (h - capH) / 2 + (i % 2 ? amp : -amp)}`
            }).join(' ')}`}
            fill="none"
            stroke="#34d399"
            strokeWidth={2.5}
            pathLength={1}
            className="cf-trace"
          />
        </g>
      ) : (
        img?.localPath && (
          <g clipPath={`url(#${clip})`}>
            <image
              href={img.localPath}
              x={x + 9}
              y={y + 9}
              width={w - 18}
              height={h - 18 - capH}
              preserveAspectRatio="xMidYMid meet"
              className={reveal ? 'cf-scan' : undefined}
            />
          </g>
        )
      )}
      <foreignObject x={x + 10} y={y + h - capH - 6} width={w - 20} height={capH}>
        <div style={{ color: '#fef3c7', fontSize: 12.5, lineHeight: 1.25, fontFamily: 'system-ui, sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {caption}
        </div>
      </foreignObject>
      <g transform={`rotate(-5 ${x + 10} ${y})`}>
        <g className="cf-pop" style={{ animationDelay: '.4s' }}>
          <rect x={x - 8} y={y - 16} width={sticker.length * 9.2 + 22} height={28} rx={5} fill="#fde047" stroke={INK} strokeWidth={2.5} />
          <text x={x + 3} y={y + 3} fontSize={15} fontWeight={800} fill={INK} fontFamily="system-ui, sans-serif">
            {sticker}
          </text>
        </g>
      </g>
    </g>
  )
}

// ------------------------------------------------------------------ placing a machine

type Box = { l: number; r: number; t: number }
const BOX: Record<string, Box> = {
  'surveyor-3': { l: -132, r: 126, t: -262 },
  'apollo-12-alsep': { l: -178, r: 238, t: -152 },
  'apollo-15-lrv': { l: -124, r: 136, t: -196 },
  'viking-landers': { l: -134, r: 162, t: -174 },
  sojourner: { l: -64, r: 64, t: -132 },
  'spirit-opportunity': { l: -152, r: 152, t: -200 },
}

/** Fit a machine between left and right, standing on the ground. */
function fit(id: string, left: number, right: number, grow = 1, top = 40): { x: number; k: number } {
  const def = SPRITES[id]
  const b = BOX[id]
  const k = Math.min(def.scale * grow, (right - left) / (b.r - b.l), (GY - top) / -b.t)
  return { x: (left + right) / 2 - ((b.l + b.r) / 2) * k, k }
}
const at = (x: number, k: number, p: Pt, y = GY): Pt => ({ x: x + p.x * k, y: y + p.y * k })

function MachineArt({ m, sleep, look, powered }: { m: Machine; sleep?: boolean; look?: 'left' | 'right' | 'ahead'; powered?: boolean }) {
  if (m.id === 'apollo-12-alsep') return <Alsep sleep={sleep} look={look} powered={powered} />
  return <>{SPRITES[m.id].draw({ sleep, look })}</>
}

function Cast({ m, x, k, y = GY, sleep, look, cls, twin = true, powered }: { m: Machine; x: number; k: number; y?: number; sleep?: boolean; look?: 'left' | 'right' | 'ahead'; cls?: string; twin?: boolean; powered?: boolean }) {
  const twins = twin && SPRITES[m.id].twins
  return (
    <g>
      {twins && (
        <g transform={`translate(${x - 120 * k} ${y - 30}) scale(${k * 0.55})`} opacity={0.92}>
          <g className={cls}>
            <MachineArt m={m} sleep={sleep} look={look} />
          </g>
        </g>
      )}
      <g transform={`translate(${x} ${y}) scale(${k})`}>
        <g className={cls}>
          <MachineArt m={m} sleep={sleep} look={look} powered={powered} />
        </g>
      </g>
    </g>
  )
}

// ------------------------------------------------------------------ small pieces

function Bubble({ x, y, icon }: { x: number; y: number; icon: NonNullable<SceneSpec['bubble']> }) {
  return (
    <g className="cf-pop" style={{ animationDelay: '.5s' }}>
      <g className="cf-float">
        <circle cx={x - 58} cy={y + 78} r={7} fill="#fff" stroke={INK} strokeWidth={2.5} />
        <circle cx={x - 40} cy={y + 56} r={11} fill="#fff" stroke={INK} strokeWidth={2.5} />
        <ellipse cx={x} cy={y} rx={74} ry={56} fill="#fff" stroke={INK} strokeWidth={3} />
        <g transform={`translate(${x} ${y})`}>
          <BubbleIcon icon={icon} />
        </g>
      </g>
    </g>
  )
}

function Q({ x = 0, y = 0, size = 46 }: { x?: number; y?: number; size?: number }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={900} fill="#ea580c" textAnchor="middle" fontFamily="system-ui, sans-serif">
      ?
    </text>
  )
}

function Microbe({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-16 -4 Q-14 -18 0 -16 Q16 -18 16 -2 Q18 14 0 14 Q-18 16 -16 -4 Z" fill="#4ade80" stroke={INK} strokeWidth={2.5} />
      <circle cx="-5" cy="-3" r="3" fill={INK} />
      <circle cx="6" cy="-3" r="3" fill={INK} />
      <path d="M-4 6 Q1 9 6 6" fill="none" stroke={INK} strokeWidth={2} />
      <g stroke={INK} strokeWidth={2}>
        <line x1="-16" y1="-8" x2="-24" y2="-14" />
        <line x1="16" y1="-6" x2="24" y2="-12" />
        <line x1="0" y1="14" x2="0" y2="22" />
      </g>
    </g>
  )
}

function BubbleIcon({ icon }: { icon: NonNullable<SceneSpec['bubble']> }) {
  switch (icon) {
    case 'rock-or-dust':
      return (
        <g fontFamily="system-ui, sans-serif">
          <path d="M-58 14 l10 -26 l20 -6 l14 18 l-4 14 z" fill="#64748b" stroke={INK} strokeWidth={2.5} />
          <text x="0" y="8" fontSize="16" fontWeight={800} fill={INK} textAnchor="middle">
            or
          </text>
          <path d="M24 16 Q38 -12 56 16 Z" fill="#d6d3d1" stroke={INK} strokeWidth={2.5} />
          <g fill="#a8a29e">
            <circle cx="34" cy="-4" r="2" className="cf-twinkle" />
            <circle cx="48" cy="-8" r="2" className="cf-twinkle" style={{ animationDelay: '.6s' }} />
          </g>
          <Q y={-18} size={30} />
        </g>
      )
    case 'boot':
      return (
        <g>
          <path d="M-34 -22 h26 v26 h22 q8 0 8 10 v6 h-56 z" fill="#f8fafc" stroke={INK} strokeWidth={2.5} />
          <line x1="-40" y1="24" x2="34" y2="24" stroke="#6b7280" strokeWidth={4} />
          <Q x={36} y={4} size={38} />
        </g>
      )
    case 'calendar':
      return (
        <g fontFamily="system-ui, sans-serif">
          <rect x="-34" y="-30" width="68" height="58" rx="6" fill="#fff" stroke={INK} strokeWidth={2.5} />
          <rect x="-34" y="-30" width="68" height="16" rx="6" fill="#ef4444" stroke={INK} strokeWidth={2.5} />
          <text x="0" y="16" fontSize="22" fontWeight={900} fill={INK} textAnchor="middle">
            years
          </text>
        </g>
      )
    case 'distance':
      return (
        <g fontFamily="system-ui, sans-serif">
          <circle cx="-44" cy="-14" r="8" fill="#fff" stroke={INK} strokeWidth={2} />
          <rect x="-50" y="-6" width="12" height="20" rx="4" fill="#fff" stroke={INK} strokeWidth={2} />
          <path d="M-28 4 H40" stroke="#ea580c" strokeWidth={4} strokeDasharray="6 6" className="cf-flow" />
          <path d="M40 -6 L54 4 L40 14 Z" fill="#ea580c" />
          <text x="10" y="-12" fontSize="15" fontWeight={800} fill={INK} textAnchor="middle">
            farther!
          </text>
        </g>
      )
    case 'microbe':
      return (
        <g>
          <Microbe x={-18} s={1.3} />
          <Q x={38} y={14} size={44} />
        </g>
      )
    case 'rover':
      return (
        <g>
          <g transform="translate(-14 22) scale(.42)">
            <Sojourner />
          </g>
          <Q x={40} y={14} size={44} />
        </g>
      )
    case 'water':
      return (
        <g>
          <path d="M-16 -30 Q-36 0 -16 22 Q4 0 -16 -30 Z" fill="#38bdf8" stroke={INK} strokeWidth={2.5} />
          <Q x={28} y={14} size={44} />
        </g>
      )
    case 'check':
      return <path d="M-30 0 L-8 22 L34 -24" fill="none" stroke="#16a34a" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
    default:
      return <Q y={16} size={56} />
  }
}

function Counter({ to, label, decimals = 0, plus }: NonNullable<SceneSpec['counter']>) {
  const n = useCountUp(to, 3600, 400)
  const text = n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (plus && n >= to ? '+' : '')
  return (
    <g className="cf-fade" fontFamily="system-ui, sans-serif">
      <rect x="16" y="40" width={Math.max(150, label.length * 9 + 30)} height="74" rx="12" fill="#1c1917" opacity={0.85} />
      <text x="30" y="84" fontSize="36" fontWeight={900} fill="#fde68a">
        {text}
      </text>
      <text x="30" y="104" fontSize="15" fill="#e2e8f0">
        {label}
      </text>
    </g>
  )
}

function Zzz({ x, y }: Pt) {
  return (
    <g fontFamily="system-ui, sans-serif" fontWeight={900} fill="#e0e7ff">
      {[0, 1.05, 2.1].map((d, i) => (
        <text key={i} x={x} y={y} fontSize={18 + i * 6} className="cf-zzz" style={{ animationDelay: `${d}s` }}>
          Z
        </text>
      ))}
    </g>
  )
}

function Puffs({ x, y, color = '#e7e5e4', n = 3 }: Pt & { color?: string; n?: number }) {
  return (
    <g fill={color}>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={x + (i - 1) * 14} cy={y - (i % 2) * 8} r={12} className="cf-puff" style={{ animationDelay: `${i * 0.45}s` }} />
      ))}
    </g>
  )
}

function Star({ x = 0, y = 0, r = 14, glow }: Pt & { r?: number; glow?: boolean }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`
  }).join(' ')
  return (
    <g>
      {glow && <circle cx={x} cy={y} r={r * 1.7} fill="#fde047" opacity={0.35} className="cf-pulse" />}
      <polygon points={pts} fill="#fde047" stroke={INK} strokeWidth={2} />
    </g>
  )
}

function Tag({ x, y, text, color = '#ea580c', delay = 0 }: Pt & { text: string; color?: string; delay?: number }) {
  return (
    <g className="cf-pop" style={{ animationDelay: `${delay}s` }} fontFamily="system-ui, sans-serif">
      <rect x={x - (text.length * 8.4 + 20) / 2} y={y - 22} width={text.length * 8.4 + 20} height={30} rx={15} fill={color} stroke={INK} strokeWidth={2} />
      <text x={x} y={y - 1} fontSize={15} fontWeight={800} fill="#fff" textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

function Flame({ x, y, s = 1, cls = 'cf-flicker' }: Pt & { s?: number; cls?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={cls}>
        <path d="M-12 0 Q0 52 12 0 Z" fill="#fb923c" />
        <path d="M-6 0 Q0 30 6 0 Z" fill="#fde047" />
      </g>
    </g>
  )
}

/** Moves its children along a path (falls back to the end point for reduced motion). */
function Along({ path, dur, begin = 0, end, children, rotate, ease = '.3 .1 .3 1' }: { path: string; dur: number; begin?: number; end: Pt; children: ReactNode; rotate?: boolean; ease?: string }) {
  if (reduced()) return <g transform={`translate(${end.x} ${end.y})`}>{children}</g>
  // Hidden until it starts moving, so it doesn't sit in the corner first.
  return (
    <g visibility={begin > 0 ? 'hidden' : undefined}>
      {begin > 0 && <set attributeName="visibility" to="visible" begin={`${begin}s`} fill="freeze" />}
      <animateMotion dur={`${dur}s`} begin={`${begin}s`} fill="freeze" path={path} rotate={rotate ? 'auto' : undefined} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines={ease} />
      {children}
    </g>
  )
}

// ------------------------------------------------------------------ scenes

type SceneProps = { m: Machine; line: StoryLine; spec: SceneSpec; img?: MachineImage }

function StageScene({ m, spec, img }: SceneProps) {
  const w = worldOf(m)
  const a = spec.action ?? 'idle'
  const night = spec.night || a === 'sleep' || a === 'off'
  const board = Boolean(img)
  const def = SPRITES[m.id]
  const extra = spec.extra
  const region = extra === 'spheres' ? [20, 300] : board ? [24, 468] : [110, 690]
  const { x, k } = fit(m.id, region[0], region[1])
  const cam = at(x, k, def.camera)
  const tool = at(x, k, def.tool ?? def.camera)
  const top = GY + BOX[m.id].t * k
  const asleep = a === 'sleep' || a === 'off'

  let cls = 'cf-bob'
  if (a === 'wave') cls = 'cf-hop'
  if (a === 'drive') cls = 'cf-drive cf-driving'
  if (a === 'stuck') cls = 'cf-sink cf-driving'
  if (a === 'grind' || a === 'dig') cls = 'cf-shake'
  if (asleep) cls = ''

  const machine =
    extra === 'three-buggies' ? (
      <g>
        {[
          { x: 120, y: GY + 6, k: 0.5, t: 'Apollo 15' },
          { x: 260, y: GY - 12, k: 0.42, t: 'Apollo 16' },
          { x: 390, y: GY + 10, k: 0.5, t: 'Apollo 17' },
        ].map((b, i) => (
          <g key={b.t}>
            <g transform={`translate(${b.x} ${b.y}) scale(${b.k})`}>
              <g className="cf-pop" style={{ animationDelay: `${i * 0.8}s` }}>
                <Lrv />
              </g>
            </g>
            <Tag x={b.x} y={b.y - 120 * b.k - 10} text={b.t} delay={0.3 + i * 0.8} />
          </g>
        ))}
      </g>
    ) : a === 'swerve' ? (
      <Along path={`M-300 0 C-210 0 -190 -40 -120 -40 C-60 -40 -40 0 0 0`} dur={5.5} end={{ x: 0, y: 0 }}>
        <g className="cf-driving">
          <Cast m={m} x={x} k={k} twin={false} />
        </g>
      </Along>
    ) : a === 'dust' ? (
      <g>
        <g className="cf-out-late">
          <Cast m={m} x={x} k={k} />
        </g>
        <g className="cf-in-late">
          <Cast m={m} x={x} k={k} sleep />
        </g>
      </g>
    ) : (
      <Cast m={m} x={x} k={k} cls={cls} sleep={asleep} look={extra === 'visit' ? 'right' : undefined} powered={a !== 'off'} />
    )

  return (
    <g>
      <World place={m.id} kind={w} night={night} />
      {extra === 'flood' && (
        <g>
          <path
            d={`M0 ${GY + 8} Q200 ${GY - 6} 420 ${GY + 10} T800 ${GY + 4} V${GY + 64} Q400 ${GY + 74} 0 ${GY + 60} Z`}
            fill="#38bdf8"
            className="cf-flood"
          />
          <text x="20" y="150" fontSize="22" fontWeight={900} fill="#0c4a6e" fontFamily="system-ui, sans-serif" className="cf-out-late">
            Long, long ago...
          </text>
        </g>
      )}
      {extra === 'visit' && (
        <g>
          <g transform={`translate(${board ? 64 : 120} ${GY - 22}) scale(.4)`} opacity={0.95}>
            <LmDescent />
            <LmAscent />
          </g>
          <g transform={`translate(${x + 150 * k} ${GY + 6}) scale(.62)`}>
            <g className="cf-walkin">
              <Astronaut />
            </g>
          </g>
        </g>
      )}
      {extra === 'trenches' && (
        <g fill="#4b5563">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={tool.x - 6 + i * 22} y={GY + 6 + i * 6} width="16" height="7" rx="3" className="cf-fade" style={{ animationDelay: `${1 + i * 0.8}s` }} />
          ))}
        </g>
      )}
      {machine}
      {a === 'stuck' && (
        <g>
          <path d={`M${x - 190 * k} ${GY + 30} Q${x} ${GY - 42 * k} ${x + 190 * k} ${GY + 30} Z`} fill="#fbbf24" stroke="#b45309" strokeWidth={2} />
          <Puffs x={x - 60 * k} y={GY - 6} color="#fcd34d" />
          <Puffs x={x + 60 * k} y={GY - 6} color="#fcd34d" />
        </g>
      )}
      {extra === 'rocks' && <path d={`M${x - 150} ${GY + 26} l20 -40 l34 -8 l24 22 l6 26 z`} fill="#78350f" stroke={INK} strokeWidth={3} />}
      {(a === 'photo' || a === 'scan') && <circle cx={cam.x} cy={cam.y} r={22} fill="#fff" className="cf-flash" />}
      {a === 'dig' && <Puffs x={tool.x + 6} y={tool.y + 8} color={w === 'mars' ? '#fdba74' : '#e5e7eb'} />}
      {a === 'grind' && (
        <g>
          <path d={`M${tool.x - 4} ${GY + 4} l8 -30 l40 -12 l24 26 l-4 18 z`} fill="#92400e" stroke={INK} strokeWidth={3} />
          <g stroke="#fde047" strokeWidth={3} className="cf-spark">
            <line x1={tool.x + 4} y1={tool.y - 2} x2={tool.x - 14} y2={tool.y - 16} />
            <line x1={tool.x + 8} y1={tool.y - 4} x2={tool.x + 12} y2={tool.y - 24} />
            <line x1={tool.x + 2} y1={tool.y + 2} x2={tool.x - 18} y2={tool.y + 2} />
          </g>
          <Puffs x={tool.x + 10} y={tool.y} color="#fdba74" />
        </g>
      )}
      {a === 'discover' && extra !== 'spheres' && (
        <g transform={`translate(${tool.x + 24} ${GY - 18})`}>
          <g className="cf-sweep">
            <circle r="22" fill="#e0f2fe" fillOpacity={0.5} stroke={INK} strokeWidth={5} />
            <line x1="15" y1="15" x2="36" y2="36" stroke={INK} strokeWidth={8} strokeLinecap="round" />
          </g>
        </g>
      )}
      {extra === 'spheres' && (
        <g transform={`translate(${board ? 400 : 520} ${GY - 120})`}>
          <g className="cf-pop" style={{ animationDelay: '.6s' }}>
          <line x1="58" y1="58" x2="96" y2="96" stroke={INK} strokeWidth={12} strokeLinecap="round" />
          <circle r="80" fill="#b45309" stroke={INK} strokeWidth={6} />
          <g fill="#64748b" stroke={INK} strokeWidth={1.5}>
            {[
              [-40, -30],
              [-6, -46],
              [30, -26],
              [-30, 10],
              [12, 4],
              [44, 18],
              [-12, 42],
              [24, 46],
              [-50, 34],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={9} className="cf-pop" style={{ animationDelay: `${1 + i * 0.15}s` }} />
            ))}
          </g>
          <text y="-92" fontSize="17" fontWeight={900} fill={INK} textAnchor="middle" fontFamily="system-ui, sans-serif">
            tiny spheres!
          </text>
          </g>
        </g>
      )}
      {a === 'dust' && (
        <g>
          <rect width="800" height="450" fill="#b45309" className="cf-haze" />
          <g className="cf-haze">
            {[120, 300, 520, 680].map((cx, i) => (
              <ellipse key={cx} cx={cx} cy={180 + (i % 2) * 60} rx="140" ry="40" fill="#d97706" opacity={0.5} className="cf-float" />
            ))}
          </g>
        </g>
      )}
      {a === 'off' && (
        <g fontFamily="system-ui, sans-serif">
          <path d={`M110 92 Q${(110 + x) / 2} 60 ${x + 16 * k} ${GY - 150 * k}`} fill="none" stroke="#fca5a5" strokeWidth={3} strokeDasharray="7 7" className="cf-flow" />
          <Tag x={(110 + x) / 2 + 30} y={92} text="OFF" color="#dc2626" delay={1.2} />
        </g>
      )}
      {asleep && <Zzz x={x + 30 * k} y={top - 6} />}
      {a === 'wave' &&
        [0, 1, 2, 3].map((i) => (
          <g key={i} className="cf-pop" style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
            <Star x={x + [-120, 110, -80, 140][i] * k} y={top + [30, 10, -14, 60][i]} r={9} />
          </g>
        ))}
      {spec.bubble && <Bubble x={Math.min(Math.max(x + 70, 120), board ? 400 : 640)} y={Math.max(80, top - 40)} icon={spec.bubble} />}
      {spec.counter && <Counter {...spec.counter} />}
      {board && <Board img={img} reveal={a === 'scan'} />}
    </g>
  )
}

function QuillScene({ m, img }: SceneProps) {
  const board = Boolean(img)
  const { x, k } = fit(m.id, 210, board ? 470 : 700, 0.9)
  return (
    <g>
      <World place={m.id} kind={worldOf(m)} />
      <Cast m={m} x={x} k={k} cls="cf-bob" look="left" />
      <g className="cf-rollin">
        <g transform={`translate(110 ${GY + 2}) scale(.95)`}>
          <QuillBot talking />
        </g>
        <g className="cf-pop" style={{ animationDelay: '1.4s' }}>
          <path d="M70 196 L96 226 L104 196" fill="#fff" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <rect x="26" y="124" width="150" height="76" rx="22" fill="#fff" stroke={INK} strokeWidth={3} />
          <rect x="70" y="190" width="40" height="8" fill="#fff" />
          <Q x={101} y={180} size={56} />
        </g>
      </g>
      {board && <Board img={img} />}
    </g>
  )
}

function WorkshopScene({ m }: SceneProps) {
  const b = m.builtBy?.[0]
  const c = m.cost
  const { x, k } = fit(m.id, 330, 590, 0.75, 120)
  return (
    <g fontFamily="system-ui, sans-serif">
      <World kind="earth" />
      <g>
        <path d={`M30 ${GY} V196 L86 160 V196 L142 160 V196 L198 160 V196 L254 160 V196 L310 160 V${GY} Z`} fill="#e2e8f0" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        {[60, 130, 200, 270].map((wx) => (
          <rect key={wx} x={wx - 18} y="226" width="36" height="34" rx="4" fill="#7dd3fc" stroke={INK} strokeWidth={2.5} />
        ))}
        <rect x="140" y="296" width="60" height="76" rx="4" fill="#64748b" stroke={INK} strokeWidth={3} />
        <rect x="26" y="96" width="290" height="58" rx="10" fill="#1d4ed8" stroke={INK} strokeWidth={3} className="cf-pop" />
        <foreignObject x="34" y="100" width="274" height="50">
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.15, textAlign: 'center', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b?.org}</div>
        </foreignObject>
      </g>
      <rect x={x - 120 * k} y={GY - 8} width={240 * k} height={14} rx={4} fill="#94a3b8" stroke={INK} strokeWidth={2.5} />
      <Cast m={m} x={x} k={k} y={GY - 8} twin={false} cls="cf-bob" />
      {[0, 1, 2].map((i) => (
        <g key={i} className="cf-twinkle" style={{ animationDelay: `${i * 0.6}s` }}>
          <Star x={x + [-100, 90, 10][i] * k} y={GY - [140, 90, 230][i] * k} r={10} />
        </g>
      ))}
      <foreignObject x="30" y={GY + 10} width="420" height="64">
        <div style={{ color: '#14532d', fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{b ? `${b.org} ${b.role}.` : ''}</div>
      </foreignObject>
      {c && (
        <g transform="rotate(7 690 150)">
          <g className="cf-pop" style={{ animationDelay: '.8s' }}>
          <line x1="640" y1="40" x2="636" y2="104" stroke={INK} strokeWidth={2} />
          <path d="M610 100 L770 100 L770 270 L610 270 L586 185 Z" fill="#fde68a" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <circle cx="612" cy="185" r="7" fill="#fff" stroke={INK} strokeWidth={2.5} />
          <text x="696" y="134" fontSize="15" fontWeight={800} fill="#92400e" textAnchor="middle">
            IT COST
          </text>
          <foreignObject x="622" y="140" width="146" height="124">
            <div style={{ color: INK, textAlign: 'center' }}>
              <div style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.05 }}>{formatUsd(c.usd)}</div>
              <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.2 }}>for {c.covers}</div>
            </div>
          </foreignObject>
          </g>
        </g>
      )}
    </g>
  )
}

function LaunchScene({ m, line }: SceneProps) {
  const v = line.visual as DataVisual
  const to = v.to ?? worldOf(m)
  const days = Math.round(useCountUp(v.days ?? 3, 6200, 300))
  const path = 'M210 318 C 320 200 520 176 650 142'
  return (
    <g fontFamily="system-ui, sans-serif">
      <World kind="space" />
      <EarthGlobe x={120} y={520} r={210} />
      {to === 'moon' ? (
        <g>
          <circle cx="690" cy="118" r="50" fill="#cbd5e1" stroke={INK} strokeWidth={3} />
          <circle cx="672" cy="104" r="10" fill="#94a3b8" />
          <circle cx="706" cy="134" r="7" fill="#94a3b8" />
          <circle cx="700" cy="96" r="5" fill="#94a3b8" />
        </g>
      ) : (
        <g>
          <circle cx="690" cy="118" r="44" fill="#c2410c" stroke={INK} strokeWidth={3} />
          <path d="M660 100 q20 -10 40 4 q-10 14 -36 8 z" fill="#7c2d12" />
          <ellipse cx="690" cy="78" rx="14" ry="5" fill="#fff" opacity={0.85} />
        </g>
      )}
      <text x="690" y="194" fontSize="18" fontWeight={800} fill="#e2e8f0" textAnchor="middle">
        {to === 'moon' ? 'Moon' : 'Mars'}
      </text>
      <text x="120" y="296" fontSize="18" fontWeight={800} fill="#e2e8f0" textAnchor="middle">
        Earth
      </text>
      <path d={path} fill="none" stroke="#fdba74" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" opacity={0.7} />
      {/* Same easing as the day counter, so the rocket and the days move together. */}
      <Along path={path} dur={6.2} begin={0.3} end={{ x: 650, y: 142 }} rotate ease=".33 1 .68 1">
        <g transform="rotate(90) scale(.42)">
          <Flame x={0} y={14} s={1.6} />
          <Rocket tall={/saturn/i.test(v.rocket ?? '')} />
        </g>
      </Along>
      <g transform="translate(400 60)">
        <rect x="-90" y="-34" width="180" height="62" rx="14" fill="#1c1917" stroke="#fb923c" strokeWidth={2} opacity={0.92} />
        <text y="8" fontSize="34" fontWeight={900} fill="#fde68a" textAnchor="middle">
          Day {days}
        </text>
      </g>
      {(v.launched || v.arrived) && (
        <text x="400" y="114" fontSize="14" fill="#cbd5e1" textAnchor="middle">
          {v.launched} → {v.arrived}
        </text>
      )}
      {v.rocket && (
        <text x="236" y="346" fontSize="15" fontWeight={700} fill="#e2e8f0">
          {v.rocket} rocket
        </text>
      )}
    </g>
  )
}

function LandingScene({ m, line, spec, img }: SceneProps) {
  const v = line.visual?.type === 'data' ? (line.visual as DataVisual) : undefined
  const board = Boolean(img)
  const w = worldOf(m)
  const style = spec.style
  if (style === 'hops') {
    const { x, k } = fit(m.id, 40, board ? 460 : 700)
    return (
      <g fontFamily="system-ui, sans-serif">
        <World place={m.id} kind={w} />
        <g className="cf-hops">
          <g className="cf-hops-flame">
            {[-60, 0, 60].map((dx) => (
              <Flame key={dx} x={x + dx * k} y={GY - 40 * k} s={0.9} />
            ))}
          </g>
          <Cast m={m} x={x} k={k} />
        </g>
        {[1, 2, 3].map((n, i) => (
          <g key={n} className="cf-pop" style={{ animationDelay: `${[1.8, 3, 3.9][i]}s` }}>
            <circle cx={x - 90 + i * 90} cy={GY + 44} r="17" fill="#fde68a" stroke={INK} strokeWidth={2.5} />
            <text x={x - 90 + i * 90} y={GY + 51} fontSize="20" fontWeight={900} fill={INK} textAnchor="middle">
              {n}
            </text>
          </g>
        ))}
        {board && <Board img={img} />}
      </g>
    )
  }
  if (style === 'lm-near') {
    return (
      <g fontFamily="system-ui, sans-serif">
        <World place={m.id} kind={w} />
        <g transform={`translate(400 ${GY + 4}) scale(.46)`}>
          <Surveyor look="left" />
        </g>
        <Tag x={400} y={GY - 140} text="Surveyor 3" color="#0f766e" delay={0.4} />
        <g className="cf-descend">
          <g className="cf-plume-out">
            <Flame x={170} y={GY - 32} s={1.3} />
          </g>
          <g transform={`translate(170 ${GY}) scale(.95)`}>
            <LmDescent />
            <LmAscent />
          </g>
        </g>
        <g className="cf-fade" style={{ animationDelay: '4.4s' }}>
          <Puffs x={170} y={GY - 4} n={4} />
          <path d={`M232 ${GY + 34} H372`} stroke="#fde68a" strokeWidth={3} strokeDasharray="8 6" />
          <text x="302" y={GY + 62} fontSize="20" fontWeight={900} fill="#fde68a" textAnchor="middle">
            180 m
          </text>
        </g>
        {board && <Board img={img} />}
      </g>
    )
  }
  if (style === 'unfold') {
    return (
      <g fontFamily="system-ui, sans-serif">
        <World place={m.id} kind={w} />
        <g transform={`translate(150 ${GY}) scale(.9)`}>
          <LmDescent />
          <LmAscent />
          <g style={{ transformOrigin: '62px -48px' }} className="cf-unfold">
            <rect x="62" y="-148" width="18" height="100" rx="4" fill="#94a3b8" stroke={INK} strokeWidth={3} />
          </g>
        </g>
        <g className="cf-reveal" style={{ animationDelay: '3s' }}>
          <g transform={`translate(330 ${GY}) scale(.72)`}>
            <Lrv />
          </g>
        </g>
        <Tag x={330} y={GY - 160} text="Unfolded!" delay={3.4} />
        {board && <Board img={img} />}
      </g>
    )
  }
  if (style === 'airbags') {
    const cx = board ? 250 : 400
    return (
      <g fontFamily="system-ui, sans-serif">
        <World place={m.id} kind={w} />
        <line x1={cx - 140} y1={GY - 190} x2={cx - 140} y2={GY} stroke="#fde68a" strokeWidth={2.5} strokeDasharray="5 5" />
        <text x={cx - 132} y={GY - 196} fontSize="17" fontWeight={800} fill="#fff7ed">
          about {v?.firstM ?? 12} m
        </text>
        <g className="cf-airbag">
          <Airbags x={cx} y={GY} />
        </g>
        <text x={cx} y={GY + 52} fontSize="16" fontWeight={700} fill="#fff7ed" textAnchor="middle" className="cf-fade" style={{ animationDelay: '4s' }}>
          then at least {v?.more ?? 15} more bounces
        </text>
        {board && <Board img={img} />}
      </g>
    )
  }
  if (style === 'roll') {
    const cx = board ? 260 : 400
    return (
      <g>
        <World place={m.id} kind={w} />
        <g transform={`translate(${cx} ${GY}) scale(.85)`}>
          <path d="M-58 -2 L0 -96 L58 -2 Z" fill="#e2e8f0" stroke={INK} strokeWidth={3} className="cf-reveal" style={{ animationDelay: '4.6s' }} />
        </g>
        <g className="cf-roll">
          <g className="cf-deflate">
            <Airbags x={cx} y={GY} />
          </g>
        </g>
        {board && <Board img={img} />}
      </g>
    )
  }
  // ramp: the petals are open and Sojourner drives down onto Mars
  const lx = board ? 150 : 260
  return (
    <g>
      <World place={m.id} kind={w} />
      <Lander x={lx} />
      <Along path={`M${lx - 10} ${GY - 40} L${lx + 90} ${GY - 40} L${lx + 180} ${GY}`} dur={5} begin={0.6} end={{ x: lx + 180, y: GY }}>
        <g transform="scale(1.05)" className="cf-driving">
          <Sojourner />
        </g>
      </Along>
      {board && <Board img={img} />}
    </g>
  )
}

function Airbags({ x, y }: Pt) {
  const lobes = [
    [0, -62],
    [-34, -46],
    [34, -46],
    [-44, -14],
    [44, -14],
    [-18, -26],
    [18, -26],
    [0, -96],
    [-26, -86],
    [26, -86],
  ]
  return (
    <g transform={`translate(${x} ${y - 4})`}>
      {lobes.map(([lx, ly], i) => (
        <circle key={i} cx={lx} cy={ly} r={28} fill="#f8fafc" stroke={INK} strokeWidth={2.5} />
      ))}
    </g>
  )
}

function Lander({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${GY})`}>
      <g fill="#e7e5e4" stroke={INK} strokeWidth={2}>
        <ellipse cx="-110" cy="-6" rx="34" ry="12" />
        <ellipse cx="110" cy="-6" rx="34" ry="12" />
      </g>
      <path d="M-120 -16 L-40 -36 L40 -36 L120 -16 L110 -8 L-110 -8 Z" fill="#1e3a8a" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M-40 -36 L40 -36 L30 -48 L-30 -48 Z" fill="#cbd5e1" stroke={INK} strokeWidth={3} />
      <line x1="0" y1="-48" x2="0" y2="-108" stroke={INK} strokeWidth={4} />
      <rect x="-16" y="-124" width="32" height="18" rx="5" fill="#f8fafc" stroke={INK} strokeWidth={3} />
      <path d="M40 -38 L120 -2" stroke="#94a3b8" strokeWidth={6} />
    </g>
  )
}

function PartsScene({ m, spec, img }: SceneProps) {
  const board = Boolean(img)
  const part = spec.part ?? ''
  const info = m.partsInfo?.find((p) => p.id === part)
  const def = SPRITES[m.id]
  const { x, k } = fit(m.id, 24, board ? 486 : 520, 1.25, 30)
  const p = def.parts[part] ? at(x, k, def.parts[part]) : { x, y: GY - 60 }
  const cardY = board ? 222 : 140
  return (
    <g fontFamily="system-ui, sans-serif">
      <World place={m.id} kind={worldOf(m)} />
      <Cast m={m} x={x} k={k} twin={false} cls="cf-bob" />
      {Object.entries(def.parts).map(([id, pt]) => {
        const q = at(x, k, pt)
        return id === part ? null : <circle key={id} cx={q.x} cy={q.y} r={5} fill="#fff" stroke={INK} strokeWidth={2} opacity={0.8} />
      })}
      {part === 'biology-lab' && (
        <g transform={`translate(${p.x} ${p.y})`}>
          <path d="M-8 -16 h16 v10 l12 22 h-40 l12 -22 z" fill="#86efac" stroke={INK} strokeWidth={2.5} className="cf-pop" />
        </g>
      )}
      <circle cx={p.x} cy={p.y} r={16} fill="none" stroke="#fde047" strokeWidth={4} className="cf-ring" />
      <circle cx={p.x} cy={p.y} r={7} fill="#fde047" stroke={INK} strokeWidth={2} />
      <path d={`M${p.x} ${p.y} L${Math.max(p.x + 20, 506)} ${cardY + 46}`} stroke="#fde047" strokeWidth={3} strokeDasharray="6 5" className="cf-fade" />
      <g className="cf-pop" style={{ animationDelay: '.3s' }}>
        <rect x="506" y={cardY} width="278" height="104" rx="14" fill="#1c1917" stroke="#fde047" strokeWidth={3} opacity={0.94} />
        <foreignObject x="518" y={cardY + 8} width="256" height="92">
          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{info?.name ?? part}</div>
            <div style={{ fontSize: 15, color: '#e7e5e4', marginTop: 6, lineHeight: 1.25 }}>{info?.does}</div>
          </div>
        </foreignObject>
      </g>
      {board && <Board img={img} x={506} y={26} w={278} h={180} stand={false} />}
    </g>
  )
}

function LiftoffScene({ m, img }: SceneProps) {
  const board = Boolean(img)
  const lx = board ? 170 : 260
  const { x, k } = fit(m.id, board ? 300 : 430, board ? 470 : 700, 0.5)
  return (
    <g fontFamily="system-ui, sans-serif">
      <World place={m.id} kind="moon" />
      <Cast m={m} x={x} k={k} look="left" />
      <g transform={`translate(${lx} ${GY}) scale(1.05)`}>
        <LmDescent />
        <g className="cf-liftoff">
          <g className="cf-liftflame">
            <Flame x={0} y={-98} s={1.2} />
          </g>
          <LmAscent />
        </g>
      </g>
      <g className="cf-fade" style={{ animationDelay: '3.8s' }}>
        <path d={`M${lx + 70} ${GY - 150} Q${lx + 90} ${GY - 110} ${lx + 52} ${GY - 92}`} fill="none" stroke="#fde68a" strokeWidth={3} />
        <path d={`M${lx + 52} ${GY - 92} l12 -2 l-6 10 z`} fill="#fde68a" />
        <Tag x={lx + 70} y={GY - 160} text="Launch pad: still here" color="#b45309" delay={3.8} />
      </g>
      {board && <Board img={img} />}
    </g>
  )
}

function QuakeScene({ m, spec }: SceneProps) {
  const stage = spec.stage ?? 'waves'
  if (stage === 'inside') {
    const cx = 270
    const cy = 232
    return (
      <g fontFamily="system-ui, sans-serif">
        <World kind="space" />
        <circle cx={cx} cy={cy} r="190" fill="#d1d5db" stroke={INK} strokeWidth={3} />
        <circle cx={cx} cy={cy} r="172" fill="#fdba74" />
        <circle cx={cx} cy={cy} r="48" fill="#ef4444" stroke={INK} strokeWidth={2} />
        <clipPath id="cf-moon-inside">
          <circle cx={cx} cy={cy} r="190" />
        </clipPath>
        <g clipPath="url(#cf-moon-inside)" fill="none" stroke="#1d4ed8" strokeWidth={4}>
          {[0, 0.9, 1.8].map((d) => (
            <circle key={d} cx={cx - 140} cy={cy - 128} r="200" className="cf-ripple" style={{ animationDelay: `${d}s`, transformOrigin: `${cx - 140}px ${cy - 128}px`, transformBox: 'view-box' }} />
          ))}
        </g>
        <path d={`M${cx + 150} ${cy - 112} q10 -16 20 0 z`} fill="#e5e7eb" stroke={INK} strokeWidth={2} />
        {[
          { t: 'crust', y: cy - 182, lx: 560 },
          { t: 'mantle', y: cy - 80, lx: 560 },
          { t: 'core', y: cy, lx: 560 },
        ].map((l, i) => (
          <g key={l.t} className="cf-fade" style={{ animationDelay: `${0.8 + i * 0.6}s` }}>
            <line x1={i === 2 ? cx + 40 : cx + 100} y1={l.y + (i === 0 ? 12 : 0)} x2={l.lx - 10} y2={l.y} stroke="#e2e8f0" strokeWidth={2} />
            <text x={l.lx} y={l.y + 6} fontSize="22" fontWeight={800} fill="#f8fafc">
              {l.t}
            </text>
          </g>
        ))}
      </g>
    )
  }
  const crash = stage === 'crash'
  const impact = crash ? 140 : 90
  const { x, k } = fit(m.id, crash ? 380 : 220, crash ? 780 : 470, 0.75)
  return (
    <g fontFamily="system-ui, sans-serif">
      <World place={m.id} kind="moon" />
      <ellipse cx={impact} cy={GY + 8} rx="40" ry="9" fill="#4b5563" className={crash ? 'cf-reveal' : undefined} style={crash ? { animationDelay: '2.6s' } : undefined} />
      {crash ? (
        <g>
          <g transform={`translate(${impact} ${GY})`}>
            <g className="cf-crash">
              <g transform="scale(.55)">
                <LmAscent />
              </g>
            </g>
          </g>
          <circle cx={impact} cy={GY - 10} r="60" fill="#e5e7eb" className="cf-burst" />
          <g className="cf-fade" style={{ animationDelay: '3.2s' }}>
            <path d={`M${impact + 50} ${GY + 44} H${x - 120 * k}`} stroke="#fde68a" strokeWidth={3} strokeDasharray="8 6" />
            <text x={(impact + x) / 2} y={GY + 70} fontSize="18" fontWeight={900} fill="#fde68a" textAnchor="middle">
              about 60 km away (not to scale)
            </text>
          </g>
          <Cast m={m} x={x} k={k} look="left" cls="cf-bob" />
        </g>
      ) : (
        <g>
          <g fill="none" stroke="#fde68a" strokeWidth={4}>
            {[0, 0.85, 1.7].map((d) => (
              <circle key={d} cx={impact} cy={GY} r="260" className="cf-ripple" style={{ animationDelay: `${d}s`, transformOrigin: `${impact}px ${GY}px`, transformBox: 'view-box' }} />
            ))}
          </g>
          <Cast m={m} x={x} k={k} look="left" cls="cf-shake" />
          <Board trace />
        </g>
      )}
    </g>
  )
}

function HandoffScene({ m, spec, img }: SceneProps) {
  const board = Boolean(img)
  const to = spec.to ?? 'astronaut'
  const { x, k } = fit(m.id, 16, 250, 0.75)
  const nx = board ? 384 : 560
  const top = GY + BOX[m.id].t * k
  const label = { astronaut: 'Artemis astronaut', 'moon-rover': 'New Artemis rover', twins: 'Spirit & Opportunity', perseverance: 'Perseverance' }[to]
  const newcomer =
    to === 'astronaut' ? (
      <g transform={`translate(${nx} ${GY + 4}) scale(.95)`}>
        <g className="cf-walkin">
          <Astronaut />
        </g>
      </g>
    ) : to === 'moon-rover' ? (
      <g transform={`translate(${nx} ${GY}) scale(-.62 .62)`}>
        <g className="cf-drive-in cf-driving" style={{ animationName: 'cf-drive' }}>
          <Lrv look="right" />
        </g>
      </g>
    ) : to === 'twins' ? (
      <g className="cf-drive-in cf-driving">
        <g transform={`translate(${nx - 46} ${GY - 18}) scale(.42)`}>
          <Mer look="left" />
        </g>
        <g transform={`translate(${nx + 40} ${GY + 6}) scale(.5)`}>
          <Mer look="left" />
        </g>
      </g>
    ) : (
      <g className="cf-drive-in cf-driving">
        <g transform={`translate(${nx} ${GY + 4}) scale(.62)`}>
          <NewRover look="left" />
        </g>
      </g>
    )
  const tagY = to === 'astronaut' ? GY - 168 : GY - 150
  return (
    <g fontFamily="system-ui, sans-serif">
      <World place={m.id} kind={worldOf(m)} />
      <Cast m={m} x={x} k={k} look="right" cls="cf-bob" />
      {newcomer}
      <Tag x={nx} y={tagY} text={label} delay={3.6} />
      <Along path={`M${x + 20} ${top - 10} Q${(x + nx) / 2} ${top - 120} ${nx} ${tagY + 26}`} dur={2.6} begin={3} end={{ x: nx, y: tagY + 26 }}>
        <Star x={0} y={0} r={16} glow />
      </Along>
      {board && <Board img={img} />}
    </g>
  )
}

function BioshieldScene({ m, img }: SceneProps) {
  const board = Boolean(img)
  const cx = board ? 240 : 400
  const { x, k } = fit(m.id, cx - 130, cx + 130, 0.8, 120)
  return (
    <g fontFamily="system-ui, sans-serif">
      <World kind="lab" />
      <Cast m={m} x={x} k={k} twin={false} />
      <path
        d={`M${cx - 170} ${GY} C${cx - 190} ${GY - 230} ${cx + 190} ${GY - 230} ${cx + 170} ${GY} Z`}
        fill="#bfdbfe"
        fillOpacity={0.35}
        stroke="#1d4ed8"
        strokeWidth={5}
        className="cf-fade"
        style={{ animationDelay: '.6s' }}
      />
      {[
        { x: Math.max(40, cx - 210), y: GY - 140, d: 0 },
        { x: cx + 196, y: GY - 110, d: 0.7 },
        { x: cx - 200, y: GY - 40, d: 1.3 },
      ].map((g, i) => (
        <g key={i} transform={`translate(${g.x} ${g.y}) scale(${i === 1 ? -1 : 1} 1)`}>
          <g className="cf-bounce-off" style={{ animationDelay: `${g.d}s` }}>
            <Microbe s={1.3} />
          </g>
          <g stroke="#dc2626" strokeWidth={5} strokeLinecap="round" className="cf-pop" style={{ animationDelay: `${1.6 + g.d}s` }}>
            <line x1="-18" y1="-18" x2="18" y2="18" />
            <line x1="18" y1="-18" x2="-18" y2="18" />
          </g>
        </g>
      ))}
      <Tag x={cx} y={70} text="No Earth germs allowed!" color="#1d4ed8" delay={2} />
      {board && <Board img={img} />}
    </g>
  )
}

// ------------------------------------------------------------------ choosing a scene

/** The cartoon scene for a line: its own `scene`, or one worked out from its beat and visual. */
export function sceneFor(line: StoryLine): SceneSpec | null {
  if (line.scene) return line.scene
  if (line.speaker === 'quill') return { kind: 'quill' }
  const v = line.visual
  if (!v) return null
  if (v.type === 'data') {
    switch (v.anim) {
      case 'cost':
        return { kind: 'workshop' }
      case 'journey':
        return { kind: 'launch' }
      case 'parts':
        return { kind: 'parts', part: v.part }
      case 'touchdowns':
        return { kind: 'landing', style: 'hops' }
      case 'bounce':
        return { kind: 'landing', style: 'airbags' }
      case 'seismogram':
        return { kind: 'quake', stage: 'waves' }
      case 'stuck':
        return { kind: 'stage', action: 'stuck' }
      case 'dust':
        return { kind: 'stage', action: 'dust' }
      default:
        return null // map, signal, laser, power, odometer: explained with their own diagrams
    }
  }
  if (v.type === 'parts' || (v.type === 'photo' && v.part)) return { kind: 'parts', part: v.part }
  if (v.type === 'photo') {
    const action: SceneSpec['action'] = line.beat === 'hello' ? 'wave' : line.beat === 'found' ? 'discover' : line.beat === 'why' ? 'think' : 'idle'
    return { kind: 'stage', action, bubble: line.beat === 'why' ? 'question' : undefined }
  }
  return null
}

/** The real picture shown on the board for this line, if any. */
export function boardImage(m: Machine, line: StoryLine, spec: SceneSpec): MachineImage | undefined {
  if (['workshop', 'launch', 'quake'].includes(spec.kind)) return undefined
  const v = line.visual
  const src = spec.board ?? (v && 'image' in v ? v.image : undefined)
  return src ? m.images.find((i) => i.localPath === src) : undefined
}

export default function CartoonScene({ machine, line, spec }: { machine: Machine; line: StoryLine; spec: SceneSpec }) {
  const img = boardImage(machine, line, spec)
  const painted = Object.keys(useArt()).length > 0
  const props: SceneProps = { m: machine, line, spec, img }
  const body = (() => {
    switch (spec.kind) {
      case 'quill':
        return <QuillScene {...props} />
      case 'workshop':
        return <WorkshopScene {...props} />
      case 'launch':
        return <LaunchScene {...props} />
      case 'landing':
        return <LandingScene {...props} />
      case 'parts':
        return <PartsScene {...props} />
      case 'liftoff':
        return <LiftoffScene {...props} />
      case 'quake':
        return <QuakeScene {...props} />
      case 'handoff':
        return <HandoffScene {...props} />
      case 'bioshield':
        return <BioshieldScene {...props} />
      default:
        return <StageScene {...props} />
    }
  })()
  return (
    <svg viewBox="0 0 800 450" className="h-full w-full" role="img" aria-label={`Cartoon: ${shortName(machine)}${line.onScreen ? `, ${line.onScreen}` : ''}`}>
      <style>{CARTOON_CSS}</style>
      {body}
      <g fontFamily="system-ui, sans-serif">
        <rect x={painted ? 596 : 652} y="428" width={painted ? 200 : 144} height="18" rx="9" fill="#000" opacity={0.6} />
        <text x={painted ? 696 : 724} y="441" fontSize="11" fill="#f8fafc" textAnchor="middle">
          {painted ? 'AI illustration · AI-assisted animation' : 'AI-assisted animation'}
        </text>
      </g>
    </svg>
  )
}

/** Badge text for the top-left corner of the film. */
export function cartoonLabel(machine: Machine, line: StoryLine, spec: SceneSpec): string {
  const img = boardImage(machine, line, spec)
  if (!img) return 'Cartoon'
  const what = { photo: 'real NASA photo', earth: 'real photo', model: 'model photo', diagram: 'NASA drawing', drawing: "artist's drawing" }[img.kind ?? 'photo']
  return `Cartoon · ${what} on the board`
}
