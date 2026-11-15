import { useId } from 'react'

// Quill, the rookie astronaut. One drawing used by the app (Quill.tsx) and by the cartoon films (sprites.tsx).
// Drawn in a 160 x 200 box; the boots touch the bottom edge (y = 198), centred on x = 80.
// Animations use SVG <animate>, so they work the same on a web page and in a recorded film.

export type AstronautArm = 'point' | 'wave' | 'down'
export type AstronautMood = 'idle' | 'speaking' | 'listening' | 'thinking'

const INK = '#292524'
const WHITE = '#ffffff'
const SHADE = '#e7e5e4'
const RUST = '#c2410c'
const RUST_LIGHT = '#fdba74'
const RED = '#ef4444'
const GREEN = '#22c55e'
const AMBER = '#f59e0b'

/** One arm: an upper-arm sleeve with a red band, a blue cuff and a glove. Drawn hanging down from (0,0). */
function Arm({ point }: { point?: boolean }) {
  return (
    <g>
      <rect x={-9} y={-4} width={18} height={40} rx={9} fill={WHITE} stroke={INK} strokeWidth={3} />
      <rect x={-8} y={8} width={16} height={6} fill={RED} />
      <rect x={-9} y={30} width={18} height={7} rx={2} fill={RUST} stroke={INK} strokeWidth={2} />
      {point ? (
        // A glove with the first finger pointing along the arm
        <g>
          <rect x={-10} y={36} width={20} height={17} rx={8} fill={WHITE} stroke={INK} strokeWidth={3} />
          <rect x={-3.5} y={48} width={8} height={17} rx={4} fill={WHITE} stroke={INK} strokeWidth={3} />
        </g>
      ) : (
        <circle cx={0} cy={45} r={11} fill={WHITE} stroke={INK} strokeWidth={3} />
      )}
    </g>
  )
}

export function AstronautFigure({ arm = 'down', mood = 'idle', float = false }: { arm?: AstronautArm; mood?: AstronautMood; float?: boolean }) {
  const id = useId().replace(/:/g, '')
  const visor = `astro-visor-${id}`
  const talking = mood === 'speaking'
  const listening = mood === 'listening'
  const thinking = mood === 'thinking'
  const screen = thinking ? AMBER : listening ? RUST_LIGHT : RUST
  // Right-arm angle (around the shoulder at 110,112): up and pointing, waving, or hanging down.
  const rightAngle = arm === 'point' ? 224 : arm === 'wave' ? 236 : -14
  return (
    <g>
      <defs>
        <radialGradient id={visor} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#57534e" />
          <stop offset="55%" stopColor="#1c1917" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
      </defs>
      <g>
        {float && <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="3.2s" repeatCount="indefinite" />}
        {/* backpack */}
        <rect x={42} y={98} width={76} height={54} rx={14} fill={SHADE} stroke={INK} strokeWidth={3} />
        {/* legs and boots */}
        <rect x={57} y={138} width={21} height={44} rx={9} fill={WHITE} stroke={INK} strokeWidth={3} />
        <rect x={82} y={138} width={21} height={44} rx={9} fill={WHITE} stroke={INK} strokeWidth={3} />
        <rect x={52} y={174} width={28} height={22} rx={9} fill={WHITE} stroke={INK} strokeWidth={3} />
        <rect x={80} y={174} width={28} height={22} rx={9} fill={WHITE} stroke={INK} strokeWidth={3} />
        <rect x={52} y={188} width={28} height={10} rx={4} fill={RUST} stroke={INK} strokeWidth={2.5} />
        <rect x={80} y={188} width={28} height={10} rx={4} fill={RUST} stroke={INK} strokeWidth={2.5} />
        {/* body */}
        <rect x={48} y={100} width={64} height={52} rx={22} fill={WHITE} stroke={INK} strokeWidth={3} />
        <path d="M58 104 L54 128 M102 104 L106 128" stroke={RUST} strokeWidth={5} strokeLinecap="round" />
        {/* chest panel: a screen and two buttons */}
        <rect x={63} y={113} width={34} height={24} rx={6} fill="#fafaf9" stroke={INK} strokeWidth={2} />
        <rect x={67} y={117} width={14} height={16} rx={3} fill={screen}>
          {(talking || thinking) && <animate attributeName="opacity" values="1;0.35;1" dur={talking ? '0.5s' : '1s'} repeatCount="indefinite" />}
        </rect>
        <circle cx={89} cy={121} r={3.6} fill={RED} />
        <circle cx={89} cy={130} r={3.6} fill={GREEN}>
          {listening && <animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite" />}
        </circle>
        {/* left arm, hanging down */}
        <g transform="translate(48 110) rotate(14)">
          <Arm />
        </g>
        {/* helmet */}
        <ellipse cx={80} cy={103} rx={30} ry={8} fill={SHADE} stroke={INK} strokeWidth={3} />
        <circle cx={80} cy={58} r={48} fill={WHITE} stroke={INK} strokeWidth={3} />
        <circle cx={33} cy={62} r={10} fill={RUST} stroke={INK} strokeWidth={2.5} />
        <circle cx={127} cy={62} r={10} fill={RUST} stroke={INK} strokeWidth={2.5} />
        <circle cx={33} cy={62} r={4.5} fill={listening ? '#ffedd5' : RUST_LIGHT}>
          {listening && <animate attributeName="r" values="4.5;7;4.5" dur="1s" repeatCount="indefinite" />}
        </circle>
        <circle cx={127} cy={62} r={4.5} fill={listening ? '#ffedd5' : RUST_LIGHT}>
          {listening && <animate attributeName="r" values="4.5;7;4.5" dur="1s" repeatCount="indefinite" />}
        </circle>
        {/* visor with a shine and a little star reflection */}
        <ellipse cx={80} cy={60} rx={36} ry={31} fill={`url(#${visor})`} stroke={INK} strokeWidth={3} />
        <path d="M56 46 Q66 34 84 34" fill="none" stroke={WHITE} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
        <path d="M94 37 L99 39" stroke={WHITE} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
        <path d="M64 72 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 z" fill={WHITE} opacity={0.9}>
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.4s" repeatCount="indefinite" />
        </path>
        {/* right arm: pointing up, waving or down */}
        <g transform={`translate(110 112) rotate(${rightAngle})`}>
          {(arm === 'wave' || (arm === 'point' && talking)) && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              additive="sum"
              values={arm === 'wave' ? '0;-18;0;-18;0' : '0;-8;0'}
              dur={arm === 'wave' ? '1.6s' : '1.2s'}
              repeatCount="indefinite"
            />
          )}
          <Arm point={arm === 'point'} />
        </g>
        {/* talking: sound waves; listening: rings; thinking: dots */}
        {talking && (
          <g fill="none" stroke={RUST_LIGHT} strokeWidth={3} strokeLinecap="round">
            <path d="M140 46 Q148 58 140 70">
              <animate attributeName="opacity" values="0;1;0" dur="0.9s" repeatCount="indefinite" />
            </path>
            <path d="M148 40 Q160 58 148 76">
              <animate attributeName="opacity" values="0;1;0" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
            </path>
          </g>
        )}
        {listening && (
          <circle cx={80} cy={58} r={52} fill="none" stroke={RUST_LIGHT} strokeWidth={2}>
            <animate attributeName="r" values="50;62" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.4s" repeatCount="indefinite" />
          </circle>
        )}
        {thinking && (
          <g fill={AMBER}>
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={64 + i * 16} cy={2} r={4.5}>
                <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}
      </g>
    </g>
  )
}

/** A cartoon rocket, nose up, drawn in a 100 x 200 box (flame below y = 170 when flying). */
export function CartoonRocket({ flying = false }: { flying?: boolean }) {
  return (
    <g>
      {flying && (
        <g>
          <path d="M38 168 Q50 214 62 168 Z" fill="#fbbf24">
            <animate attributeName="d" values="M38 168 Q50 214 62 168 Z;M36 168 Q50 200 64 168 Z;M38 168 Q50 214 62 168 Z" dur="0.35s" repeatCount="indefinite" />
          </path>
          <path d="M43 168 Q50 196 57 168 Z" fill="#fff7ed" />
        </g>
      )}
      <path d="M22 120 L6 160 L26 150 Z" fill={RED} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M78 120 L94 160 L74 150 Z" fill={RED} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M50 8 C76 32 82 80 76 150 L24 150 C18 80 24 32 50 8 Z" fill={WHITE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M50 8 C62 19 70 32 73 44 L27 44 C30 32 38 19 50 8 Z" fill={RED} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={50} cy={84} r={15} fill={RED} stroke={INK} strokeWidth={3} />
      <circle cx={50} cy={84} r={9} fill="#d6d3d1" stroke={INK} strokeWidth={2} />
      <path d="M45 79 Q48 76 52 77" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <rect x={30} y={150} width={40} height={14} rx={4} fill="#a8a29e" stroke={INK} strokeWidth={3} />
      <path d="M50 118 L50 150" stroke={RED} strokeWidth={5} />
    </g>
  )
}
