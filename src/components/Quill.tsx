import { AstronautFigure } from './AstronautFigure'
import type { AstronautArm } from './AstronautFigure'

export type QuillState = 'idle' | 'speaking' | 'listening' | 'thinking'

const LABEL: Record<QuillState, string> = {
  idle: 'Quill the astronaut is ready',
  speaking: 'Quill the astronaut is talking',
  listening: 'Quill the astronaut is listening',
  thinking: 'Quill the astronaut is thinking',
}

/** Quill, the rookie astronaut who collects every machine's lesson. */
export default function Quill({ state, size = 120, arm }: { state: QuillState; size?: number; arm?: AstronautArm }) {
  const pose: AstronautArm = arm ?? (state === 'speaking' ? 'wave' : 'down')
  return (
    <svg viewBox="-6 -14 172 214" width={size} height={(size * 214) / 172} role="img" aria-label={LABEL[state]} style={{ overflow: 'visible' }}>
      <AstronautFigure arm={pose} mood={state} float={state === 'idle'} />
    </svg>
  )
}
