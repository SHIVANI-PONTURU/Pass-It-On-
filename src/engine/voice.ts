// Speech-to-text with the browser's SpeechRecognition (Chrome and Edge).
export type ListenState = 'off' | 'listening' | 'unsupported' | 'blocked'
export type VoiceEvent = { type: 'interim' | 'final'; text: string }

// "Hey Quill" plus the ways Chrome tends to hear it, and "Houston" as a backup wake word.
// Quill's name is never spoken by the app itself, so these can't be set off by the narration.
const NAME = '(?:quill|quil|quills|quell|quel|quail|quilt|kwil|kwill|kweel|qwil|krill)'
const SOUNDS_LIKE = '(?:will|kill|bill|phil|cool|quinn)'
const WAKE = new RegExp(
  [
    `\\b(?:hey|hi|hay|hello|ok|okay|a|hate)[\\s,.-]*${NAME}\\b`, // hey quill, hay quail, a quill
    `\\b(?:hey|hi|hay|hello|okay)[\\s,.-]+${SOUNDS_LIKE}\\b`, // hey will, hey kill
    `\\b(?:heyquill|hayquill|acquil|acquill|aquil|aquill|equil|equill)\\b`, // run together
    `\\b${NAME}\\b`, // just "Quill"
    '\\bhouston\\b',
    '\\bexcuse me\\b', // "Excuse me, ..."
    '\\bi (?:have|got) a question\\b',
  ].join('|'),
  'i',
)

// "Hey <any name>" at the very start of what was said also counts (Chrome mishears "Quill" in many ways).
const HEY_START = /^(?:hey|hi|hay|hello|ok|okay)[\s,]+[a-z']+\b[\s,.!?]*/i

/**
 * If the text contains the wake word, return what was said after it ('' if nothing). Otherwise null.
 * `strict` (used while the film or an answer is playing) skips the loose "Hey <any name>" match,
 * because the films' own lines can start with "Hello, rookie!" or "Hi there!".
 */
export function findWake(text: string, strict = false): string | null {
  const m = WAKE.exec(text)
  if (m) return text.slice(m.index + m[0].length).replace(/^[\s,.!?]+/, '')
  if (strict) return null
  const h = HEY_START.exec(text.trim())
  if (h) return text.trim().slice(h[0].length)
  return null
}

const words = (t: string) => t.toLowerCase().match(/[a-z0-9']+/g) ?? []

/**
 * True when what the microphone heard is mostly the words being played right now
 * (the film or an answer coming out of the speakers), not the child.
 */
export function isEcho(text: string, speaking: string): boolean {
  const heard = words(text)
  if (heard.length < 2 || !speaking) return false
  const said = new Set(words(speaking))
  return heard.filter((w) => said.has(w)).length / heard.length >= 0.6
}

const QUESTION_START =
  /^(what|what's|whats|why|how|where|who|whose|when|which|can|could|do|does|did|is|are|was|were|will|would|should|has|have|tell me|explain|i want to know|i wonder|what if)\b/i

/** Sounds like a question to the machine, even without the wake word (at least 3 words). */
export function isLikelyQuestion(text: string): boolean {
  const t = text.trim()
  if (words(t).length < 3) return false
  return /\?$/.test(t) || QUESTION_START.test(t)
}

// Short phrases that may interrupt the story without the wake word.
const BARGE_IN = /\b(wait|hold on|stop|pause|huh|i don'?t get it|i don'?t understand|what does (?:that|it) mean)\b/i

/**
 * True when the child says a stop word on its own.
 * `speaking` is the line playing right now: if the word is in it, the microphone is probably
 * just hearing the speakers (e.g. "we rolled to a stop"), so it doesn't count.
 */
export function isBargeIn(text: string, speaking = ''): boolean {
  const m = BARGE_IN.exec(text)
  if (!m) return false
  if (text.trim().split(/\s+/).length > 8) return false
  return !speaking.toLowerCase().includes(m[1].toLowerCase())
}

type SR = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

export class Listener {
  private rec: SR | null = null
  private enabled = false
  private readonly onEvent: (e: VoiceEvent) => void
  private readonly onState: (s: ListenState) => void

  constructor(onEvent: (e: VoiceEvent) => void, onState: (s: ListenState) => void) {
    this.onEvent = onEvent
    this.onState = onState
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r[0].transcript.trim()
        if (text) this.onEvent({ type: r.isFinal ? 'final' : 'interim', text })
      }
    }
    rec.onend = () => {
      // Chrome stops listening after a while; keep it going while enabled.
      if (this.enabled) {
        try {
          rec.start()
        } catch {
          /* already started */
        }
      } else {
        this.onState('off')
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.enabled = false
        this.onState('blocked')
      }
    }
    this.rec = rec
  }

  get supported(): boolean {
    return this.rec !== null
  }

  get running(): boolean {
    return this.enabled
  }

  start() {
    if (!this.rec) {
      this.onState('unsupported')
      return
    }
    this.enabled = true
    try {
      this.rec.start()
    } catch {
      /* already started */
    }
    this.onState('listening')
  }

  stop() {
    this.enabled = false
    try {
      this.rec?.stop()
    } catch {
      /* not running */
    }
    this.onState('off')
  }
}
