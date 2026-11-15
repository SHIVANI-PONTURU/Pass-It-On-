// Speech out, best voice first:
// 1. Pre-generated ElevenLabs clips (public/audio, made by `npm run voice`), with word timings for captions.
// 2. Live ElevenLabs speech from /api/speak (when VITE_LIVE_VOICE=true), for answers that weren't pre-made.
// 3. The browser's built-in voices (free, always there).
// Every layer can be interrupted; speak() resolves false when that happens.
export type Speaker = 'quill' | 'machine'
export type SpeakOptions = {
  /** Called as words are spoken with how many characters of the text have been said so far. */
  onProgress?: (chars: number) => void
}

type Word = { w: string; c: number; s: number; e: number }
type Clip = { file: string; words?: Word[] }

const LIVE_VOICE = import.meta.env.VITE_LIVE_VOICE === 'true'

// ---------- pre-generated clips ----------
let clips: Record<string, Clip> = {}
let clipsLoading: Promise<void> | null = null

/** Load public/audio/manifest.json once. Missing manifest = no clips, which is fine. */
export function loadVoiceClips(): Promise<void> {
  clipsLoading ??= fetch('/audio/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<{ lines?: Record<string, Clip> }>) : { lines: {} }))
    .then((m) => {
      clips = m.lines ?? {}
    })
    .catch(() => {
      clips = {}
    })
  return clipsLoading
}

let currentMachine: string | undefined
/** Tell the narrator which machine is talking, so live answers use that machine's voice. */
export function setSpeakerMachine(id: string | undefined) {
  currentMachine = id
}

// ---------- browser voices ----------
const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
let voices: SpeechSynthesisVoice[] = []

function loadVoices() {
  if (synth) voices = synth.getVoices()
}
if (synth) {
  loadVoices()
  synth.addEventListener('voiceschanged', loadVoices)
}

const PREFERRED: Record<Speaker, string[]> = {
  quill: ['Google UK English Female', 'Microsoft Aria', 'Microsoft Jenny', 'Samantha', 'Google US English'],
  machine: ['Google US English', 'Microsoft Guy', 'Microsoft David', 'Daniel', 'Google UK English Male'],
}

function pickVoice(who: Speaker): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  for (const name of PREFERRED[who]) {
    const v = english.find((x) => x.name.includes(name))
    if (v) return v
  }
  return who === 'quill' ? english[0] : english[1] ?? english[0]
}

export const speechSupported = synth !== null

// ---------- shared state ----------
let token = 0
let audio: HTMLAudioElement | null = null
let settleAudio: ((r: 'stopped') => void) | null = null
let liveCtrl: AbortController | null = null
let liveUrl: string | null = null
let lastCancel = 0

/** Stop whatever is being spoken. Any pending speak() resolves with false. */
export function stopSpeaking() {
  token++
  if (synth && (synth.speaking || synth.pending)) lastCancel = performance.now()
  synth?.cancel()
  audio?.pause()
  settleAudio?.('stopped')
  liveCtrl?.abort()
  liveCtrl = null
}

/** Call once from a tap/click so browsers allow audio later. */
export function warmUpSpeech() {
  void loadVoiceClips()
  if (!audio && typeof Audio !== 'undefined') audio = new Audio()
  if (!synth) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  synth.speak(u)
}

type PlayResult = 'ended' | 'stopped' | 'failed'

function playUrl(url: string, words: Word[] | undefined, opts?: SpeakOptions): Promise<PlayResult> {
  return new Promise((resolve) => {
    const a = audio ?? (audio = new Audio())
    let raf = 0
    let said = -1
    const done = (r: PlayResult) => {
      cancelAnimationFrame(raf)
      a.onended = null
      a.onerror = null
      if (settleAudio === done) settleAudio = null
      resolve(r)
    }
    settleAudio = done
    a.onended = () => done('ended')
    a.onerror = () => done('failed')
    const tick = () => {
      if (words?.length && opts?.onProgress) {
        let k = -1
        for (let i = 0; i < words.length && words[i].s <= a.currentTime; i++) k = i
        const chars = k >= 0 ? words[k].c + words[k].w.length : 0
        if (chars !== said) {
          said = chars
          opts.onProgress(chars)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    a.src = url
    a.play()
      .then(() => {
        raf = requestAnimationFrame(tick)
      })
      .catch(() => done('failed'))
  })
}

async function fetchLiveVoice(text: string, who: Speaker, mine: number): Promise<string | null> {
  const ctrl = new AbortController()
  liveCtrl = ctrl
  const timer = window.setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, speaker: who, machineId: currentMachine }),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const blob = await res.blob()
    if (mine !== token || blob.size === 0) return null
    if (liveUrl) URL.revokeObjectURL(liveUrl)
    liveUrl = URL.createObjectURL(blob)
    return liveUrl
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
    if (liveCtrl === ctrl) liveCtrl = null
  }
}

/** Rough reading time, so captions can carry on if no voice can be heard. */
function readingMs(text: string): number {
  return Math.max(1500, text.split(/\s+/).length * 380)
}

/** No working voice: move the captions along at reading pace so the film keeps going. */
function silentRead(text: string, mine: number, opts?: SpeakOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const words = [...text.matchAll(/\S+/g)]
    const step = readingMs(text) / Math.max(1, words.length)
    let i = 0
    const tick = () => {
      if (mine !== token) return resolve(false)
      if (i >= words.length) {
        opts?.onProgress?.(text.length)
        return resolve(true)
      }
      const w = words[i++]
      opts?.onProgress?.((w.index ?? 0) + w[0].length)
      window.setTimeout(tick, step)
    }
    tick()
  })
}

// Chrome's online "Google" voices sometimes never start. After the first failure, use voices on this computer.
let onlineVoicesFailed = false

function localVoice(who: Speaker, not?: SpeechSynthesisVoice): SpeechSynthesisVoice | undefined {
  const local = voices.filter((v) => v.lang.toLowerCase().startsWith('en') && v.localService && v !== not)
  const names = who === 'quill' ? /aria|jenny|zira|hazel|susan|libby|sonia|samantha/i : /guy|david|mark|george|ryan|daniel|james/i
  return local.find((v) => names.test(v.name)) ?? (who === 'quill' ? local[0] : local[1] ?? local[0])
}

type BrowserResult = 'ended' | 'stopped' | 'failed'

function browserOnce(text: string, who: Speaker, mine: number, voice: SpeechSynthesisVoice | undefined, opts?: SpeakOptions): Promise<BrowserResult> {
  return new Promise((resolve) => {
    if (!synth) {
      resolve('failed')
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else {
      u.lang = 'en-US'
    }
    u.rate = who === 'quill' ? 1.02 : 0.95
    u.pitch = who === 'quill' ? 1.35 : 0.85
    let started = false
    let settled = false
    let startedAt = 0
    let watchdog = 0
    let keepAlive = 0
    const finish = (r: BrowserResult) => {
      if (settled) return
      settled = true
      window.clearTimeout(watchdog)
      window.clearInterval(keepAlive)
      resolve(r)
    }
    u.onstart = () => {
      started = true
    }
    u.onboundary = (e) => {
      started = true
      if (e.name !== 'word') return
      const end = text.slice(e.charIndex).search(/\s/)
      opts?.onProgress?.(end < 0 ? text.length : e.charIndex + end)
    }
    u.onend = () => {
      if (mine !== token) return finish('stopped')
      // Some voices "end" instantly without saying anything.
      if (!started && performance.now() - startedAt < 250 && text.length > 12) return finish('failed')
      opts?.onProgress?.(text.length)
      finish('ended')
    }
    u.onerror = (e) => {
      if (mine !== token) return finish('stopped')
      console.warn('[voice] browser speech failed:', e.error, voice?.name ?? 'default voice')
      finish('failed')
    }
    // Chrome can drop an utterance queued right after cancel(), so wait a moment.
    const wait = performance.now() - lastCancel < 300 ? 120 : 0
    window.setTimeout(() => {
      if (mine !== token) return finish('stopped')
      startedAt = performance.now()
      synth.speak(u)
      watchdog = window.setTimeout(() => {
        if (started || settled || mine !== token) return
        console.warn('[voice] browser speech did not start:', voice?.name ?? 'default voice')
        lastCancel = performance.now()
        synth.cancel()
        finish('failed')
      }, 4000)
      // Chrome cuts long utterances in online voices after ~15 s unless nudged.
      if (voice && !voice.localService) {
        keepAlive = window.setInterval(() => {
          if (synth.speaking && !synth.paused) {
            synth.pause()
            synth.resume()
          }
        }, 10000)
      }
    }, wait)
  })
}

async function speakWithBrowser(text: string, who: Speaker, mine: number, opts?: SpeakOptions): Promise<boolean> {
  if (!synth) return silentRead(text, mine, opts)
  let voice = pickVoice(who)
  if (onlineVoicesFailed && voice && !voice.localService) voice = localVoice(who)
  let r = await browserOnce(text, who, mine, voice, opts)
  if (r === 'failed' && mine === token) {
    if (voice && !voice.localService) onlineVoicesFailed = true
    const backup = localVoice(who, voice)
    if (backup) r = await browserOnce(text, who, mine, backup, opts)
  }
  if (r === 'ended') return mine === token
  if (r === 'stopped' || mine !== token) return false
  // No voice worked: keep the film going with captions only.
  return silentRead(text, mine, opts)
}

/**
 * Speak one piece of text. Resolves true if it finished normally,
 * false if it was interrupted by stopSpeaking() or another speak().
 */
export async function speak(text: string, who: Speaker, opts?: SpeakOptions): Promise<boolean> {
  stopSpeaking()
  const mine = token
  await loadVoiceClips()
  if (mine !== token) return false

  const clip = clips[`${who}|${text.trim()}`]
  if (clip) {
    const r = await playUrl(clip.file, clip.words, opts)
    if (r === 'ended') {
      opts?.onProgress?.(text.length)
      return mine === token
    }
    if (r === 'stopped' || mine !== token) return false
  }

  if (LIVE_VOICE) {
    const url = await fetchLiveVoice(text, who, mine)
    if (mine !== token) return false
    if (url) {
      const r = await playUrl(url, undefined, opts)
      if (r === 'ended') {
        opts?.onProgress?.(text.length)
        return mine === token
      }
      if (r === 'stopped' || mine !== token) return false
    }
  }

  return speakWithBrowser(text, who, mine, opts)
}
