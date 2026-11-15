// The picture half of a mission film: what kids see while a line is spoken.
// Real NASA photos (with a slow pan), labelled parts, and small animations drawn from the
// numbers in machines.json. Every picture carries a label saying what it is.
import CartoonScene, { cartoonLabel, sceneFor } from './cartoon/scenes'
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Beat, Machine, MachineImage, StoryLine, Visual } from '../types'
import { formatUsd, sourceLabel } from '../sources'

const BEAT_TITLE: Record<Beat, string> = {
  hello: 'Who I am',
  why: 'Why NASA sent me',
  built: 'Who built me',
  journey: 'How I got there',
  parts: 'My parts',
  how: 'How my mission worked',
  found: 'What I found',
  stayed: 'Why I stayed',
}
const BEAT_ORDER: Beat[] = ['hello', 'why', 'built', 'journey', 'parts', 'how', 'found', 'stayed']

const KIND_LABEL: Record<NonNullable<MachineImage['kind']>, string> = {
  photo: 'Real photo',
  earth: 'Real photo, taken on Earth',
  model: 'Model, photographed on Earth',
  diagram: 'Diagram',
  drawing: "Artist's drawing",
}

const DATA_LABEL: Record<string, string> = {
  cost: 'Facts from the sources below',
  journey: 'Animation · dates from NASA',
  parts: 'Parts list',
  power: 'Diagram',
  seismogram: 'Animation · not the real recording',
  laser: 'Animation',
  map: 'Map · NASA landing coordinates',
  bounce: 'Animation · numbers from NASA',
  signal: 'Animation · NASA numbers',
  dust: 'Animation',
  stuck: 'Animation',
  touchdowns: 'Animation · story from NASA',
  odometer: 'Chart · NASA distances',
}

// Keyframes for the film. Motion is switched off for people who ask for less motion.
const FILM_CSS = `
@keyframes film-pan { from { transform: scale(1.02) translate(0,0) } to { transform: scale(1.1) translate(-1.5%,-1%) } }
@keyframes film-scan { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes film-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes film-draw { from { stroke-dashoffset: var(--len, 1000) } to { stroke-dashoffset: 0 } }
@keyframes film-flow { to { stroke-dashoffset: -24 } }
@keyframes film-grow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes film-dim { from { opacity: 0 } to { opacity: .75 } }
@keyframes film-sun { from { opacity: 1 } to { opacity: .15 } }
@keyframes film-pulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes film-bounce {
  0% { transform: translateY(0) } 12% { transform: translateY(-150px) } 24% { transform: translateY(0) }
  34% { transform: translateY(-90px) } 44% { transform: translateY(0) } 52% { transform: translateY(-50px) }
  60% { transform: translateY(0) } 66% { transform: translateY(-25px) } 72% { transform: translateY(0) }
  76% { transform: translateY(-10px) } 80%,100% { transform: translateY(0) }
}
.film-pan { animation: film-pan 16s ease-out forwards }
.film-scan { animation: film-scan 7s linear forwards }
.film-fade { animation: film-fade .6s ease-out both }
.film-draw { stroke-dasharray: var(--len, 1000); animation: film-draw var(--dur, 3s) ease-out forwards }
.film-flow { stroke-dasharray: 8 8; animation: film-flow .8s linear infinite }
.film-grow { transform-origin: left; animation: film-grow 2.4s ease-out both }
.film-dim { animation: film-dim 6s ease-in forwards }
.film-sun { animation: film-sun 6s ease-in forwards }
.film-pulse { animation: film-pulse 1.6s ease-in-out infinite }
.film-bounce { animation: film-bounce 5s cubic-bezier(.3,.6,.4,1) forwards }
@keyframes film-hop {
  0% { transform: translateY(-170px) } 22% { transform: translateY(0) } 34% { transform: translateY(-70px) }
  46% { transform: translateY(0) } 56% { transform: translateY(-30px) } 66%,100% { transform: translateY(0) }
}
@keyframes film-flame { 0%,60% { opacity: 1 } 70%,100% { opacity: 0 } }
.film-hop { animation: film-hop 6s ease-in-out forwards }
.film-flame { animation: film-flame 6s linear forwards }
@media (prefers-reduced-motion: reduce) {
  .film-pan, .film-scan, .film-fade, .film-draw, .film-flow, .film-grow, .film-dim, .film-sun, .film-pulse, .film-bounce, .film-hop, .film-flame { animation: none !important }
  .film-flame { opacity: 0 }
  .film-draw { stroke-dasharray: none }
  .film-dim { opacity: .75 }
  .film-sun { opacity: .15 }
}
`

/** CSS custom properties (e.g. --len) for inline styles. */
const vars = (v: Record<string, string | number>) => v as unknown as CSSProperties

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Counts from 0 up to `to` over `ms`, for day counters and odometers. */
function useCountUp(to: number, ms = 3500): number {
  const [n, setN] = useState(() => (reducedMotion() ? to : 0))
  useEffect(() => {
    if (reducedMotion()) {
      setN(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      setN(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return n
}

function findImage(m: Machine, path: string | undefined): MachineImage | undefined {
  if (!path) return undefined
  return m.images.find((i) => i.localPath === path)
}

function Badge({ text }: { text: string }) {
  return (
    <span className="absolute left-2 top-2 z-10 max-w-[58%] truncate rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-medium text-amber-300 @md:text-xs">
      {text}
    </span>
  )
}

function PhotoView({ m, image, reveal }: { m: Machine; image: string; reveal?: 'scan' }) {
  const info = findImage(m, image)
  return (
    <>
      <div className={`absolute inset-0 ${reveal === 'scan' ? 'film-scan' : ''}`}>
        <img src={image} alt={info?.caption ?? ''} className="film-pan h-full w-full object-contain" />
      </div>
      <Badge text={`${KIND_LABEL[info?.kind ?? 'photo']} · ${info?.credit ?? 'NASA'}`} />
    </>
  )
}

function PartsView({ m, image, part }: { m: Machine; image?: string; part: string }) {
  const parts = m.partsInfo ?? []
  const current = parts.find((p) => p.id === part)
  return (
    <>
      {image && <PhotoView m={m} image={image} />}
      <div
        className={`absolute z-10 flex flex-col justify-center gap-2 ${
          image ? 'bottom-0 right-0 top-9 w-[44%] bg-black/60 p-2' : 'inset-x-4 bottom-2 top-9'
        }`}
      >
        {!image && current && (
          <div className="film-fade mb-1 text-center">
            <p className="text-xl font-semibold text-white @md:text-3xl">{current.name}</p>
            <p className="mt-1 text-sm text-orange-200 @md:text-lg">{current.does}</p>
          </div>
        )}
        <ul className={`flex gap-1 ${image ? 'flex-col' : 'flex-wrap justify-center'}`}>
          {parts.map((p, i) => (
            <li
              key={p.id}
              className={`film-fade rounded-md px-2 py-0.5 text-[11px] @md:py-1 @md:text-sm ${
                p.id === part ? 'bg-orange-500 font-semibold text-white ring-2 ring-orange-200' : 'bg-black/60 text-neutral-300'
              }`}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {p.name}
              {p.id === part && image && <span className="block text-xs font-normal text-orange-50">{p.does}</span>}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function CostView({ m }: { m: Machine }) {
  const b = m.builtBy?.[0]
  const c = m.cost
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 px-4 text-center @md:gap-5">
      {b && (
        <div className="film-fade">
          <p className="hidden text-xs uppercase tracking-widest text-orange-400 @sm:block">Who built me</p>
          <p className="mt-1 text-base font-semibold leading-tight text-white @md:text-3xl">{b.org}</p>
          <p className="mt-1 text-xs text-neutral-300 @md:text-sm">{b.role}</p>
        </div>
      )}
      {c && (
        <div className="film-fade" style={{ animationDelay: '.6s' }}>
          <p className="text-xs uppercase tracking-widest text-amber-400">What it cost</p>
          <p className="mt-1 text-3xl font-bold text-amber-200 @md:text-5xl">{formatUsd(c.usd)}</p>
          <p className="mt-1 text-xs text-neutral-300 @md:text-sm">for {c.covers}</p>
        </div>
      )}
      <p className="hidden text-[10px] text-neutral-500 @sm:block @md:text-xs">
        Sources: {[b?.source, c?.source].filter((s, i, a): s is string => !!s && a.indexOf(s) === i).map(sourceLabel).join(', ')}
      </p>
    </div>
  )
}

function JourneyView({ v }: { v: Extract<Visual, { type: 'data' }> }) {
  const days = useCountUp(v.days ?? 0)
  const target = v.to === 'mars' ? 'Mars' : 'the Moon'
  const path = 'M70 200 C 150 40, 290 40, 340 150'
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label={`Journey from Earth to ${target}: ${v.days} days`}>
        <circle cx="62" cy="210" r="34" fill="#2563eb" />
        <circle cx="52" cy="198" r="10" fill="#22c55e" opacity=".7" />
        <text x="62" y="268" textAnchor="middle" fill="#cbd5e1" fontSize="13">Earth</text>
        <circle cx="345" cy="160" r={v.to === 'mars' ? 26 : 20} fill={v.to === 'mars' ? '#c2410c' : '#9ca3af'} />
        <text x="345" y="210" textAnchor="middle" fill="#cbd5e1" fontSize="13">{v.to === 'mars' ? 'Mars' : 'Moon'}</text>
        <path d={path} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 6" />
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2.5" className="film-draw" style={vars({ '--len': 420, '--dur': '3.5s' })} />
        <circle r="5" fill="#fde68a">
          <animateMotion dur="3.5s" path={path} fill="freeze" />
        </circle>
        <text x="200" y="250" textAnchor="middle" fill="#fde68a" fontSize="30" fontWeight="700">
          Day {Math.round(days)}
        </text>
        <text x="200" y="276" textAnchor="middle" fill="#94a3b8" fontSize="12">
          {v.label ? `${v.label}: ` : ''}
          {v.launched} → {v.arrived}
        </text>
        {v.rocket && (
          <text x="200" y="30" textAnchor="middle" fill="#94a3b8" fontSize="12">
            Launched on {/^[AEIOU]/i.test(v.rocket) ? 'an' : 'a'} {v.rocket} rocket
          </text>
        )}
      </svg>
    </div>
  )
}

function PowerView() {
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Heat from plutonium-238 is turned into about 70 watts of electricity">
        <rect x="20" y="110" width="110" height="80" rx="10" fill="#7c2d12" />
        <text x="75" y="145" textAnchor="middle" fill="#fed7aa" fontSize="13" fontWeight="600">Plutonium-238</text>
        <text x="75" y="165" textAnchor="middle" fill="#fed7aa" fontSize="12">gives off heat</text>
        <path d="M130 150 H 165" stroke="#fb923c" strokeWidth="4" className="film-flow" />
        <rect x="165" y="110" width="100" height="80" rx="10" fill="#334155" />
        <text x="215" y="145" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="600">Generator</text>
        <text x="215" y="165" textAnchor="middle" fill="#cbd5e1" fontSize="12">heat → electricity</text>
        <path d="M265 150 H 300" stroke="#facc15" strokeWidth="4" className="film-flow" />
        <circle cx="335" cy="140" r="26" fill="#facc15" className="film-pulse" />
        <rect x="325" y="166" width="20" height="14" rx="3" fill="#94a3b8" />
        <text x="335" y="210" textAnchor="middle" fill="#fde68a" fontSize="16" fontWeight="700">about 70 W</text>
        <text x="200" y="260" textAnchor="middle" fill="#94a3b8" fontSize="13">Works day and night. No sunlight needed.</text>
      </svg>
    </div>
  )
}

function SeismogramView() {
  // A drawn wiggle to show the idea; not the real recording.
  const pts: string[] = []
  for (let x = 0; x <= 360; x += 3) {
    const t = x - 110
    const amp = x < 110 ? 2 : 70 * Math.exp(-t / 90)
    pts.push(`${20 + x},${150 + Math.sin(x * 0.55) * amp * (x < 110 ? 1 : Math.cos(x * 0.13))}`)
  }
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="A seismometer trace: quiet, then a big wobble from the impact that slowly fades">
        <line x1="20" y1="150" x2="380" y2="150" stroke="#1e293b" />
        <polyline points={pts.join(' ')} fill="none" stroke="#34d399" strokeWidth="2" className="film-draw" style={vars({ '--len': 3000, '--dur': '5s' })} />
        <line x1="130" y1="60" x2="130" y2="240" stroke="#f59e0b" strokeDasharray="4 4" />
        <text x="134" y="56" fill="#fbbf24" fontSize="12">impact</text>
        <text x="200" y="275" textAnchor="middle" fill="#94a3b8" fontSize="13">The Moon kept wobbling long after the crash</text>
      </svg>
    </div>
  )
}

function LaserView() {
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="A laser beam travels from Earth to the mirror panel on the Moon and bounces back">
        <circle cx="50" cy="150" r="34" fill="#2563eb" />
        <text x="50" y="205" textAnchor="middle" fill="#cbd5e1" fontSize="13">Earth</text>
        <circle cx="350" cy="150" r="22" fill="#9ca3af" />
        <rect x="320" y="140" width="10" height="20" fill="#e5e7eb" />
        <text x="350" y="195" textAnchor="middle" fill="#cbd5e1" fontSize="13">Moon</text>
        <line x1="84" y1="144" x2="320" y2="144" stroke="#ef4444" strokeWidth="2" className="film-draw" style={vars({ '--len': 240, '--dur': '1.5s' })} />
        <line x1="320" y1="156" x2="84" y2="156" stroke="#f87171" strokeWidth="2" className="film-draw" style={vars({ '--len': 240, '--dur': '1.5s', animationDelay: '1.5s' })} />
        <text x="200" y="110" textAnchor="middle" fill="#fca5a5" fontSize="13">laser goes out…</text>
        <text x="200" y="185" textAnchor="middle" fill="#fca5a5" fontSize="13">…and bounces back</text>
        <text x="200" y="250" textAnchor="middle" fill="#94a3b8" fontSize="13">Timing the round trip measures the distance</text>
      </svg>
    </div>
  )
}

function MapView({ v }: { v: Extract<Visual, { type: 'data' }> }) {
  const W = 360
  const H = 180
  const x = (lon: number) => 20 + (lon / 360) * W
  const y = (lat: number) => 50 + ((90 - lat) / 180) * H
  const mars = v.body !== 'moon'
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label={`Flat map of ${mars ? 'Mars' : 'the Moon'} showing where each lander is`}>
        <text x="200" y="34" textAnchor="middle" fill="#cbd5e1" fontSize="13">Flat map of {mars ? 'Mars' : 'the Moon'}</text>
        <rect x="20" y="50" width={W} height={H} rx="6" fill={mars ? '#7c2d12' : '#374151'} />
        {[1, 2, 3].map((k) => (
          <line key={`h${k}`} x1="20" x2={20 + W} y1={50 + (H / 4) * k} y2={50 + (H / 4) * k} stroke="#ffffff22" />
        ))}
        {[1, 2, 3, 4, 5].map((k) => (
          <line key={`v${k}`} y1="50" y2={50 + H} x1={20 + (W / 6) * k} x2={20 + (W / 6) * k} stroke="#ffffff22" />
        ))}
        <text x="16" y={50 + H / 2 + 4} textAnchor="end" fill="#64748b" fontSize="10">0°</text>
        {(v.pins ?? []).map((p, i) => (
          <g key={p.label} className="film-fade" style={{ animationDelay: `${0.4 + i * 0.6}s` }}>
            <circle cx={x(p.lonEast)} cy={y(p.lat)} r="7" fill="#fde68a" stroke="#0f172a" strokeWidth="2" />
            <text x={x(p.lonEast)} y={y(p.lat) - 12} textAnchor="middle" fill="#fef3c7" fontSize="13" fontWeight="600">
              {p.label}
            </text>
          </g>
        ))}
        <text x="200" y="262" textAnchor="middle" fill="#94a3b8" fontSize="12">North is up · equator in the middle</text>
      </svg>
    </div>
  )
}

function BounceView({ v }: { v: Extract<Visual, { type: 'data' }> }) {
  return (
    <div className="absolute inset-0 bg-orange-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label={`The lander, wrapped in airbags, bounces about ${v.firstM} meters high and then ${v.more} more times`}>
        <line x1="20" y1="250" x2="380" y2="250" stroke="#9a3412" strokeWidth="3" />
        <line x1="70" y1="100" x2="70" y2="250" stroke="#fbbf24" strokeDasharray="4 4" />
        <text x="76" y="108" fill="#fde68a" fontSize="13">about {v.firstM} m</text>
        <g className="film-bounce">
          <circle cx="200" cy="228" r="22" fill="#e5e7eb" />
          <circle cx="188" cy="220" r="9" fill="#ffffff" />
          <circle cx="212" cy="234" r="9" fill="#d1d5db" />
        </g>
        <text x="200" y="285" textAnchor="middle" fill="#fdba74" fontSize="13">then at least {v.more} more bounces</text>
      </svg>
    </div>
  )
}

function SignalView({ v }: { v: Extract<Visual, { type: 'data' }> }) {
  const mins = useCountUp(v.maxMinutes ?? 15, 6000)
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label={`A radio message takes ${v.minMinutes} to ${v.maxMinutes} minutes to cross between Earth and Mars`}>
        <circle cx="50" cy="150" r="30" fill="#2563eb" />
        <text x="50" y="200" textAnchor="middle" fill="#cbd5e1" fontSize="13">Earth</text>
        <circle cx="352" cy="150" r="24" fill="#c2410c" />
        <text x="352" y="200" textAnchor="middle" fill="#cbd5e1" fontSize="13">Mars</text>
        <path d="M84 150 H 324" stroke="#38bdf8" strokeWidth="3" className="film-flow" />
        <text x="200" y="80" textAnchor="middle" fill="#fde68a" fontSize="34" fontWeight="700">
          {Math.floor(mins)} min
        </text>
        <text x="200" y="250" textAnchor="middle" fill="#94a3b8" fontSize="13">
          {v.minMinutes} to {v.maxMinutes} minutes each way, at the speed of light
        </text>
      </svg>
    </div>
  )
}

function DustView({ m }: { m: Machine }) {
  const hero = m.images.find((i) => i.use === 'background') ?? m.images[0]
  return (
    <>
      {hero?.localPath && <img src={hero.localPath} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="film-dim absolute inset-0 bg-amber-900" />
      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" role="img" aria-label="A dust storm dims the Sun until the solar panels can't make enough power">
        <circle cx="320" cy="70" r="30" fill="#fde047" className="film-sun" />
        <text x="200" y="270" textAnchor="middle" fill="#fef3c7" fontSize="15" fontWeight="600">
          Dust blocks the sunlight
        </text>
      </svg>
      <Badge text="Animation over a real photo" />
    </>
  )
}

function TouchdownsView() {
  // Three touchdowns, as NASA describes. The heights are drawn for the story, not measured.
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="The lander's engines keep firing, so it touches the ground three times before it settles">
        <path d="M20 236 H 380" stroke="#64748b" strokeWidth="3" />
        <path d="M20 236 H 380 V 300 H 20 Z" fill="#334155" />
        <g className="film-hop">
          <path d="M180 214 L 220 214 L 228 176 L 172 176 Z" fill="#cbd5e1" />
          <rect x="186" y="160" width="28" height="16" rx="2" fill="#94a3b8" />
          <path d="M176 214 L 160 234 M224 214 L 240 234" stroke="#e2e8f0" strokeWidth="4" />
          <circle cx="160" cy="234" r="4" fill="#e2e8f0" />
          <circle cx="240" cy="234" r="4" fill="#e2e8f0" />
          <path className="film-flame" d="M192 216 L 200 236 L 208 216 Z" fill="#fb923c" />
        </g>
        {[1, 2, 3].map((n, i) => (
          <text key={n} x={120 + i * 80} y="272" textAnchor="middle" fill="#fde68a" fontSize="20" fontWeight="700" className="film-fade" style={{ animationDelay: `${[1.3, 2.8, 4][i]}s` }}>
            {n}
          </text>
        ))}
        <text x="200" y="40" textAnchor="middle" fill="#cbd5e1" fontSize="13">engines still firing</text>
        <text x="200" y="294" textAnchor="middle" fill="#94a3b8" fontSize="11">touchdowns</text>
      </svg>
    </div>
  )
}

function StuckView() {
  return (
    <div className="absolute inset-0 bg-orange-950">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="A rover's wheels break through a thin crust and sink into soft sand">
        <circle cx="330" cy="60" r="22" fill="#fde047" opacity=".55" />
        <g className="film-fade" style={{ animationDuration: '3s' }}>
          <rect x="130" y="128" width="140" height="34" rx="6" fill="#cbd5e1" />
          <rect x="120" y="120" width="160" height="10" rx="3" fill="#1e3a8a" />
          <line x1="200" y1="120" x2="200" y2="80" stroke="#cbd5e1" strokeWidth="5" />
          <rect x="188" y="70" width="24" height="12" rx="3" fill="#e2e8f0" />
          {[150, 200, 250].map((x) => (
            <circle key={x} cx={x} cy="182" r="16" fill="#475569" stroke="#94a3b8" strokeWidth="3" />
          ))}
        </g>
        <path d="M20 180 H 380 V 300 H 20 Z" fill="#c2410c" opacity=".92" />
        <path d="M20 180 H 380" stroke="#fdba74" strokeWidth="3" strokeDasharray="10 6" />
        <text x="200" y="232" textAnchor="middle" fill="#fed7aa" fontSize="14" fontWeight="600">thin crust over soft sand</text>
        <text x="200" y="256" textAnchor="middle" fill="#fed7aa" fontSize="12">the wheels sank in and couldn't get out</text>
      </svg>
    </div>
  )
}

function OdometerView({ v }: { v: Extract<Visual, { type: 'data' }> }) {
  const rows = v.rows ?? []
  const max = Math.max(...rows.map((r) => r.km), 1)
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 bg-neutral-950 px-5 text-xs @md:gap-4 @md:text-sm">
      <p className="text-center text-sm text-neutral-400">Distance driven on Mars</p>
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between">
            <span className={i === rows.length - 1 ? 'font-semibold text-orange-300' : 'text-neutral-200'}>{r.label}</span>
            <span className="tabular-nums text-white">{r.km.toFixed(2)} km</span>
          </div>
          <div className="h-4 rounded bg-neutral-800">
            <div
              className={`film-grow h-4 rounded ${i === rows.length - 1 ? 'bg-orange-400' : 'bg-neutral-400'}`}
              style={{ width: `${(r.km / max) * 100}%`, animationDelay: `${i * 0.7}s` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DataView({ m, v }: { m: Machine; v: Extract<Visual, { type: 'data' }> }) {
  const label = DATA_LABEL[v.anim]
  let body: ReactNode = null
  switch (v.anim) {
    case 'cost':
      body = <CostView m={m} />
      break
    case 'journey':
      body = <JourneyView v={v} />
      break
    case 'parts':
      body = <PartsView m={m} part={v.part ?? ''} />
      break
    case 'power':
      body = <PowerView />
      break
    case 'seismogram':
      body = <SeismogramView />
      break
    case 'laser':
      body = <LaserView />
      break
    case 'map':
      body = <MapView v={v} />
      break
    case 'bounce':
      body = <BounceView v={v} />
      break
    case 'signal':
      body = <SignalView v={v} />
      break
    case 'dust':
      return <DustView m={m} />
    case 'odometer':
      body = <OdometerView v={v} />
      break
    case 'stuck':
      body = <StuckView />
      break
    case 'touchdowns':
      body = <TouchdownsView />
      break
  }
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 top-8 bg-neutral-950">{body}</div>
      {label && <Badge text={label} />}
    </>
  )
}

function AiView({ m, v }: { m: Machine; v: Extract<Visual, { type: 'ai' }> }) {
  const [failed, setFailed] = useState(false)
  if (failed && v.fallback) return <PhotoView m={m} image={v.fallback} />
  return (
    <>
      {v.kind === 'clip' ? (
        <video src={v.src} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <img src={v.src} alt="" className="film-pan absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
      <Badge text={v.kind === 'clip' ? 'AI animation · not real footage' : 'AI illustration'} />
    </>
  )
}

/** Shows the picture for one film line. Re-mounts (and replays its animation) when the line changes. */
export default function FilmVisual({ machine, line }: { machine: Machine; line: StoryLine }) {
  const v = line.visual
  const beat = line.beat
  const chapter = beat ? BEAT_ORDER.indexOf(beat) + 1 : 0
  const spec = sceneFor(line)
  return (
    <div className="@container absolute inset-0 overflow-hidden bg-black">
      <style>{FILM_CSS}</style>
      <div className={`absolute inset-x-0 top-0 ${line.onScreen ? 'bottom-11 @md:bottom-14' : 'bottom-0'}`}>
        {spec ? (
          <>
            {/* A new scene for every line, so its animation starts from the beginning. */}
            <CartoonScene key={line.text} machine={machine} line={line} spec={spec} />
            <Badge text={cartoonLabel(machine, line, spec)} />
          </>
        ) : (
          <>
            {v?.type === 'photo' && <PhotoView m={machine} image={v.image} reveal={v.reveal} />}
            {v?.type === 'parts' && <PartsView m={machine} image={v.image} part={v.part} />}
            {v?.type === 'data' && <DataView m={machine} v={v} />}
            {v?.type === 'ai' && <AiView m={machine} v={v} />}
          </>
        )}
      </div>
      {beat && (
        <span className="absolute right-2 top-2 z-10 max-w-[40%] truncate rounded-full bg-orange-950/85 px-2 py-0.5 text-[10px] font-medium text-orange-200 @md:text-xs">
          {chapter} · {BEAT_TITLE[beat]}
        </span>
      )}
      {line.onScreen && (
        <div
          key={line.onScreen}
          className="film-fade absolute inset-x-0 bottom-0 z-10 flex h-11 items-center justify-center bg-black px-3 text-center text-sm font-semibold leading-tight text-white @sm:text-base @md:h-14 @md:text-2xl"
        >
          {line.onScreen}
        </div>
      )}
    </div>
  )
}
