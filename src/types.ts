export type Speaker = 'machine' | 'quill'

/** Chapters of a mission film, in order. */
export type Beat = 'hello' | 'why' | 'built' | 'journey' | 'parts' | 'how' | 'found' | 'stayed'

export type MapPin = { label: string; lat: number; lonEast: number }
export type OdometerRow = { label: string; km: number }

/** What the film shows while a line is spoken. */
export type Visual =
  | { type: 'photo'; image: string; part?: string; reveal?: 'scan' }
  | { type: 'parts'; image?: string; part: string }
  | {
      type: 'data'
      anim: 'cost' | 'journey' | 'parts' | 'power' | 'seismogram' | 'laser' | 'map' | 'bounce' | 'signal' | 'dust' | 'odometer' | 'stuck' | 'touchdowns'
      part?: string
      to?: 'moon' | 'mars'
      days?: number
      rocket?: string
      launched?: string
      arrived?: string
      label?: string
      body?: 'moon' | 'mars'
      pins?: MapPin[]
      firstM?: number
      more?: number
      minMinutes?: number
      maxMinutes?: number
      rows?: OdometerRow[]
    }
  | { type: 'ai'; src: string; kind: 'illustration' | 'clip'; fallback?: string }

/** A cartoon scene for one line of a mission film (see src/components/cartoon). */
export type SceneSpec = {
  kind: 'stage' | 'quill' | 'workshop' | 'launch' | 'landing' | 'parts' | 'liftoff' | 'quake' | 'handoff' | 'bioshield'
  /** stage: what the machine is doing */
  action?: 'idle' | 'wave' | 'think' | 'drive' | 'swerve' | 'dig' | 'photo' | 'scan' | 'discover' | 'sleep' | 'off' | 'grind' | 'stuck' | 'dust'
  /** stage: a thought bubble */
  bubble?: 'rock-or-dust' | 'boot' | 'calendar' | 'distance' | 'microbe' | 'rover' | 'water' | 'check' | 'question'
  /** stage: something else in the picture */
  extra?: 'flood' | 'spheres' | 'three-buggies' | 'visit' | 'trenches' | 'rocks'
  /** a number that counts up, e.g. 6,326 pictures */
  counter?: { to: number; label: string; decimals?: number; plus?: boolean }
  /** landing: how it arrived */
  style?: 'hops' | 'lm-near' | 'unfold' | 'airbags' | 'roll' | 'ramp'
  /** quake: which part of the moonquake story */
  stage?: 'crash' | 'waves' | 'inside'
  /** handoff: who carries the lesson on */
  to?: 'astronaut' | 'moon-rover' | 'twins' | 'perseverance'
  /** a real picture for the board, if not the line's own picture */
  board?: string
  /** parts: which part to point at */
  part?: string
  night?: boolean
}

export type StoryLine = {
  text: string
  simple: string
  anim: string
  beat?: Beat
  speaker?: Speaker
  visual?: Visual
  /** Big words shown on screen during the line, e.g. "296 kg". */
  onScreen?: string
  source?: string
  /** Cartoon scene; worked out from beat and visual if missing. */
  scene?: SceneSpec
}
export type Chip = { q: string; a: string; verify?: boolean }
export type MachineImage = {
  url: string
  localPath?: string
  caption: string
  credit: string
  sourcePage: string
  use: string
  note?: string
  anim?: string
  /** What the picture is: a photo on the Moon or Mars (default), a photo on Earth, a model, a diagram or a drawing. */
  kind?: 'photo' | 'earth' | 'model' | 'diagram' | 'drawing'
}
export type CardRow = { label: string; value: string }
export type PartInfo = { id: string; name: string; does: string }
export type Builder = { org: string; role: string; source: string }
export type Cost = { usd: number; covers: string; source: string }
export type Machine = {
  id: string
  name: string
  nickname?: string
  nssdcaId: string | string[]
  body: string
  type: string
  status: string
  story: StoryLine[]
  chips: Chip[]
  lesson: { text: string; nextMission: string }
  backOnEarth: string
  sources: string[]
  images: MachineImage[]
  card: CardRow[]
  quillIntro: string
  builtBy?: Builder[]
  cost?: Cost
  partsInfo?: PartInfo[]
}
export type Chapter = { id: string; title: string; focusArea: string; stops: string[]; note?: string }
export type AppData = { meta: Record<string, unknown>; chapters: Chapter[]; machines: Machine[] }
