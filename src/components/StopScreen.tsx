import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import gsap from 'gsap'
import type { Machine } from '../types'
import { imageSrc, shortName, viewerImages } from '../data'
import Quill from './Quill'
import FilmVisual from './FilmVisual'
import { useFilmVideo } from './FilmVideo'
import { sourceLabel } from '../sources'
import type { QuillState } from './Quill'
import { setSpeakerMachine, speak, stopSpeaking } from '../engine/narrator'
import { classify } from '../engine/intent'
import { answerQuestion } from '../engine/answer'
import { findWake, isBargeIn, isEcho, isLikelyQuestion } from '../engine/voice'
import type { ListenState, VoiceEvent } from '../engine/voice'

type Phase = 'intro' | 'narrating' | 'paused' | 'listening' | 'thinking' | 'answering' | 'done'
type Bubble = { who: 'machine' | 'quill'; text: string }

type Props = {
  machine: Machine
  chapterTitle: string
  handlerRef: { current: ((e: VoiceEvent) => void) | null }
  listenState: ListenState
  hasLesson: boolean
  onTalk: () => void
  onLesson: (id: string) => void
  onBack: () => void
}


const KIND_LABEL: Record<string, string> = { photo: 'Real photo', earth: 'Real photo, taken on Earth', model: 'Model, photographed on Earth', diagram: 'Diagram', drawing: "Artist's drawing" }

export default function StopScreen({ machine, chapterTitle, handlerRef, listenState, hasLesson, onTalk, onLesson, onBack }: Props) {
  const story = machine.story
  const images = viewerImages(machine)
  const name = shortName(machine)

  const [phase, setPhaseState] = useState<Phase>('intro')
  const phaseRef = useRef<Phase>('intro')
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const [lineIdx, setLineState] = useState(0)
  const lineRef = useRef(0)
  const setLine = (i: number) => {
    lineRef.current = i
    setLineState(i)
  }

  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [answerSource, setAnswerSource] = useState<string | null>(null)
  // How many characters of the bubble have been spoken so far (null = no word timings, show it all).
  const [spoken, setSpoken] = useState<number | null>(null)
  const [simpleText, setSimpleText] = useState<string | null>(null)
  const [kidSaid, setKidSaid] = useState('')
  const [heard, setHeard] = useState('')
  const [imageIdx, setImageIdx] = useState(0)
  // True when the child picked a photo from the strip; the film takes over again on the next line.
  const [pinnedPhoto, setPinnedPhoto] = useState(false)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState('')
  const [gotLesson, setGotLesson] = useState(hasLesson)

  const resumeRef = useRef(0)
  const runRef = useRef(0)
  const awaitingRef = useRef(false)
  const awaitTimer = useRef<number | undefined>(undefined)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // The mission film as a video (public/videos). When there is one, it is the main film on this page;
  // otherwise the cartoon is drawn live, line by line.
  const { loaded: videoLoaded, video } = useFilmVideo(machine.id)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const videoModeRef = useRef(false)
  videoModeRef.current = Boolean(video)
  const shownLineRef = useRef(-2)

  const showImageFor = (anim: string) => {
    const k = images.findIndex((i) => i.anim === anim)
    if (k >= 0) setImageIdx(k)
  }

  /** Show a line in the speech bubble (with the source link for an answer). */
  const showBubble = (b: Bubble, source: string | null = null) => {
    setBubble(b)
    setAnswerSource(source)
  }

  /** Speak a bubble line, lighting up the words as they are said (live captions). */
  // What's playing right now, so the microphone can ignore stop words coming from the speakers.
  const speakingRef = useRef('')
  const say = (text: string, who: 'quill' | 'machine') => {
    setSpoken(null)
    speakingRef.current = text
    return speak(text, who, { onProgress: (n) => setSpoken(n) })
  }

  /** Stop speech and cancel any running story loop. */
  const interrupt = () => {
    runRef.current++
    stopSpeaking()
    videoRef.current?.pause()
  }

  /** Video mode: jump to the start of story line k and play. */
  const playVideoFrom = (k: number) => {
    interrupt()
    awaitingRef.current = false
    setSimpleText(null)
    setKidSaid('')
    setPinnedPhoto(false)
    const v = videoRef.current
    if (!v) return
    v.currentTime = k <= 0 ? 0 : (video?.timeline?.[k] ?? v.currentTime)
    void v.play().catch(() => setPhase('paused'))
  }

  const finish = async (run: number) => {
    setPhase('done')
    setGotLesson(true)
    onLesson(machine.id)
    const t = `${name} passed you a lesson: ${machine.lesson.text}`
    showBubble({ who: 'quill', text: t })
    if (videoModeRef.current) return // the video's last card already says it
    await say(t, 'quill')
    if (run !== runRef.current) return
  }

  const playFrom = async (start: number) => {
    if (videoModeRef.current) {
      playVideoFrom(start)
      return
    }
    interrupt()
    const run = runRef.current
    awaitingRef.current = false
    setSimpleText(null)
    setKidSaid('')
    setPhase('narrating')
    for (let k = start; k < story.length; k++) {
      setLine(k)
      resumeRef.current = k
      const line = story[k]
      const text = line.text
      const who = line.speaker ?? 'machine'
      showImageFor(line.anim)
      setPinnedPhoto(false)
      showBubble({ who, text })
      const finished = await say(text, who)
      if (!finished || run !== runRef.current) return
      resumeRef.current = k + 1
    }
    if (run === runRef.current) await finish(run)
  }

  const afterAnswer = async (run: number) => {
    if (run !== runRef.current) return
    setPhase('paused')
    const more = videoModeRef.current ? !videoRef.current?.ended : resumeRef.current < story.length
    if (more) await speak('Shall I carry on?', 'quill')
  }

  const resume = () => {
    if (videoModeRef.current) {
      const v = videoRef.current
      stopSpeaking()
      awaitingRef.current = false
      setSimpleText(null)
      setPinnedPhoto(false)
      if (v && !v.ended) void v.play().catch(() => setPhase('paused'))
      else if (phaseRef.current !== 'done') void finish(++runRef.current)
      return
    }
    if (resumeRef.current >= story.length) {
      if (phaseRef.current !== 'done') void finish(++runRef.current)
      return
    }
    void playFrom(resumeRef.current)
  }

  const pause = () => {
    interrupt()
    awaitingRef.current = false
    setPhase('paused')
  }

  /** Video mode: keep the bubble, progress dots and "current line" in step with the video. */
  const onVideoTime = (t: number) => {
    const tl = video?.timeline
    let k = -1
    if (tl?.length) for (let i = 0; i < tl.length; i++) if (tl[i] <= t + 0.05) k = i
    if (k === shownLineRef.current) return
    shownLineRef.current = k
    setSpoken(null)
    if (k < 0) {
      speakingRef.current = machine.quillIntro
      showBubble({ who: 'quill', text: machine.quillIntro })
      return
    }
    const line = story[k]
    setLine(k)
    // The line before is included too: the microphone can lag behind the film.
    speakingRef.current = `${k > 0 ? story[k - 1].text : machine.quillIntro} ${line.text}`
    showBubble({ who: line.speaker ?? 'machine', text: line.text })
  }

  const explainSimpler = async () => {
    interrupt()
    const run = runRef.current
    const i = Math.min(lineRef.current, story.length - 1)
    const s = story[i].simple
    const who = story[i].speaker ?? 'machine'
    setSimpleText(s)
    setPhase('answering')
    showBubble({ who, text: s })
    const ok = await say(s, who)
    if (!ok || run !== runRef.current) return
    resumeRef.current = i + 1
    await afterAnswer(run)
  }

  const ask = async (q: string) => {
    interrupt()
    const run = runRef.current
    setPhase('thinking')
    const a = await answerQuestion(machine, q, story[lineRef.current]?.text ?? '')
    if (run !== runRef.current) return
    setPhase('answering')
    showBubble({ who: 'machine', text: a.text }, a.sourceUrl ?? null)
    const ok = await say(a.text, 'machine')
    if (!ok || run !== runRef.current) return
    await afterAnswer(run)
  }

  const handleInput = (raw: string) => {
    const text = raw.trim()
    if (!text) return
    awaitingRef.current = false
    window.clearTimeout(awaitTimer.current)
    setKidSaid(text)
    switch (classify(text)) {
      case 'confused':
        void explainSimpler()
        break
      case 'continue':
        resume()
        break
      case 'back':
        void playFrom(Math.max(0, lineRef.current - 1))
        break
      case 'repeat':
        void playFrom(lineRef.current)
        break
      case 'pause':
        pause()
        break
      default:
        void ask(text)
    }
  }

  /** True while the film video is playing (sound is coming out of the speakers). */
  const filmPlaying = () => {
    const v = videoRef.current
    return videoModeRef.current && !!v && !v.paused && !v.ended
  }

  const listenForQuestion = () => {
    const resumeFilm = filmPlaying()
    interrupt()
    awaitingRef.current = true
    setPhase('listening')
    window.clearTimeout(awaitTimer.current)
    awaitTimer.current = window.setTimeout(() => {
      if (awaitingRef.current) {
        awaitingRef.current = false
        // Nothing was asked (or it was a false alarm): carry on with the film instead of leaving it paused.
        if (resumeFilm) resume()
        else setPhase('paused')
      }
    }, 8000)
  }

  // Voice events from the microphone (set up in App).
  useEffect(() => {
    handlerRef.current = (e: VoiceEvent) => {
      const p = phaseRef.current
      // Is sound coming out of the speakers right now (the film, Quill's intro, or an answer)?
      const playing = filmPlaying() || p === 'answering' || p === 'intro' || (p === 'narrating' && !videoModeRef.current)
      // Words coming out of the speakers (the film, or an answer) are not the child talking.
      const echo = isEcho(e.text, speakingRef.current)
      if (!echo) setHeard(e.text)
      // While something is playing, only the real wake word counts: the films' own lines can sound
      // like "Hello, …" or like a question, and Chrome sometimes mishears them.
      const rest = echo ? null : findWake(e.text, playing)
      if (e.type === 'interim') {
        // Interrupt as soon as "Hey Quill" is heard.
        if (!awaitingRef.current && rest !== null && p !== 'listening') listenForQuestion()
        return
      }
      if (awaitingRef.current) {
        if (echo) return
        const q = (rest ?? e.text).trim()
        if (q) handleInput(q)
        return
      }
      if (rest !== null) {
        if (rest.trim()) handleInput(rest)
        else listenForQuestion()
        return
      }
      if (echo || p === 'thinking') return
      if (p === 'answering' && classify(e.text) === 'continue') {
        // "Carry on" while the machine is still answering
        handleInput(e.text)
      } else if (playing && isBargeIn(e.text, speakingRef.current)) {
        // "Wait", "stop", "I don't get it" while the film or an answer is playing
        handleInput(e.text)
      } else if (!playing && isLikelyQuestion(e.text)) {
        // A question asked straight out, without "Hey Quill", while nothing is playing: answer it anyway.
        handleInput(e.text)
      } else if ((p === 'paused' || p === 'done') && classify(e.text) !== 'question') {
        handleInput(e.text)
      }
    }
    // Developer test hook (npm run dev only): window.__voice('hey quill why is mars red')
    if (import.meta.env.DEV) {
      ;(window as unknown as { __voice?: (t: string, final?: boolean) => void }).__voice = (t, final = true) =>
        handlerRef.current?.({ type: final ? 'final' : 'interim', text: t })
    }
    return () => {
      handlerRef.current = null
    }
  })

  // Quill introduces the machine, then the machine tells its story.
  useEffect(() => {
    if (!videoLoaded) return
    let cancelled = false
    const run = ++runRef.current
    setSpeakerMachine(machine.id)
    setPhase('intro')
    showBubble({ who: 'quill', text: machine.quillIntro })
    if (video) {
      shownLineRef.current = -2
      void videoRef.current?.play().catch(() => setPhase('paused'))
      return () => {
        cancelled = true
        runRef.current++
        stopSpeaking()
        window.clearTimeout(awaitTimer.current)
      }
    }
    void (async () => {
      const ok = await say(machine.quillIntro, 'quill')
      if (cancelled || !ok || run !== runRef.current) return
      void playFrom(0)
    })()
    return () => {
      cancelled = true
      runRef.current++
      stopSpeaking()
      window.clearTimeout(awaitTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.id, videoLoaded])

  // Fade in each new photo, then drift slowly (skipped if the user prefers less motion).
  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { opacity: 1, scale: 1 })
      return
    }
    const tl = gsap.timeline()
    tl.fromTo(el, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' })
    tl.to(el, { scale: 1.06, duration: 14, ease: 'none' })
    return () => {
      tl.kill()
    }
  }, [imageIdx, machine.id])

  const onTalkClick = () => {
    if (listenState === 'unsupported' || listenState === 'blocked') {
      inputRef.current?.focus()
      return
    }
    onTalk()
    listenForQuestion()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!typed.trim()) {
      setTypedError('Type a question first')
      return
    }
    handleInput(typed)
    setTyped('')
  }

  const quillState: QuillState =
    phase === 'listening'
      ? 'listening'
      : phase === 'thinking'
        ? 'thinking'
        : bubble?.who === 'quill' && (phase === 'intro' || phase === 'done' || phase === 'narrating' || phase === 'answering')
          ? 'speaking'
          : 'idle'
  const machineTalking = !video && bubble?.who === 'machine' && (phase === 'narrating' || phase === 'answering')
  const img = images[imageIdx] ?? images[0]
  const filmLine = story[lineIdx]
  const showFilm = !!filmLine?.visual && !pinnedPhoto
  const filmImagePath = filmLine?.visual && 'image' in filmLine.visual ? filmLine.visual.image : undefined
  const filmImage = filmImagePath ? machine.images.find((i) => i.localPath === filmImagePath) : undefined
  const currentAnim = story[lineIdx]?.anim
  // The NASA page the line being told comes from (story lines only; answers carry their own).
  const lineSource = !answerSource && bubble?.who === 'machine' && phase !== 'answering' ? filmLine?.source : undefined

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800">
          ← Map
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-orange-400">{chapterTitle}</p>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">{machine.name}</h1>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Real NASA photo */}
        <section>
          <div className={`relative ${video ? 'aspect-video' : 'aspect-[4/3]'} overflow-hidden rounded-2xl border border-neutral-800 bg-black`}>
            {video && (
              <video
                ref={videoRef}
                src={video.file}
                controls
                playsInline
                preload="auto"
                aria-label={`${name}: mission film`}
                className="absolute inset-0 h-full w-full bg-black"
                onTimeUpdate={(e) => onVideoTime(e.currentTarget.currentTime)}
                onSeeked={(e) => onVideoTime(e.currentTarget.currentTime)}
                onPlay={() => {
                  stopSpeaking()
                  awaitingRef.current = false
                  setPinnedPhoto(false)
                  setPhase('narrating')
                }}
                onPause={() => {
                  if (phaseRef.current === 'narrating' || phaseRef.current === 'intro') setPhase('paused')
                }}
                onEnded={() => void finish(++runRef.current)}
              />
            )}
            {video ? (
              pinnedPhoto &&
              img && (
                <div className="absolute inset-0 z-10 bg-black">
                  <img key={img.localPath ?? img.url} src={imageSrc(img)} alt={img.caption} className="h-full w-full object-contain" />
                  <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-amber-300">
                    {KIND_LABEL[img.kind ?? 'photo']} · {img.credit}
                  </span>
                  <button onClick={resume} className="absolute bottom-3 right-3 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500">
                    ▶ Back to the film
                  </button>
                </div>
              )
            ) : showFilm && filmLine ? (
              <FilmVisual key={`${machine.id}-${JSON.stringify(filmLine.visual)}`} machine={machine} line={filmLine} />
            ) : (
              img && (
                <>
                  <img ref={imgRef} key={img.localPath ?? img.url} src={imageSrc(img)} alt={img.caption} className="h-full w-full object-contain" />
                  <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-amber-300">
                    {KIND_LABEL[img.kind ?? 'photo']} · {img.credit}
                  </span>
                </>
              )
            )}
            {machineTalking && (
              <span className="absolute bottom-3 right-3 z-20 flex h-6 items-end gap-0.5 rounded-md bg-black/70 px-2 py-1" aria-label={`${name} is talking`}>
                {[0, 1, 2, 3].map((b) => (
                  <span key={b} className="wave-bar block w-1 bg-emerald-400" style={{ height: '100%', animationDelay: `${b * 0.12}s` }} />
                ))}
              </span>
            )}
          </div>
          {showFilm ? (
            filmImage && <p className="mt-2 text-sm text-neutral-300">{filmImage.caption}</p>
          ) : (
            img && <p className="mt-2 text-sm text-neutral-300">{img.caption}</p>
          )}
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((im, k) => (
                <button
                  key={im.url}
                  onClick={() => {
                    if (video) pause()
                    setImageIdx(k)
                    setPinnedPhoto(true)
                  }}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-black ${k === imageIdx ? 'border-orange-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  aria-label={`Show photo ${k + 1}: ${im.caption}`}
                >
                  <img src={imageSrc(im)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {import.meta.env.DEV && currentAnim && <p className="mt-2 text-xs text-neutral-500">Animation cue: {currentAnim}</p>}
        </section>

        {/* Quill, the story and the controls */}
        <section className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Quill state={quillState} size={96} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-neutral-700 bg-neutral-900/80 p-4">
              <p className="mb-1 text-xs font-medium text-neutral-400">{bubble?.who === 'quill' ? 'Quill' : name}</p>
              <p className="text-lg leading-relaxed text-white">
                {bubble && spoken !== null && spoken < bubble.text.length ? (
                  <>
                    <span>{bubble.text.slice(0, spoken)}</span>
                    <span className="text-neutral-400">{bubble.text.slice(spoken)}</span>
                  </>
                ) : (
                  (bubble?.text ?? '')
                )}
              </p>
              {answerSource && (
                <a href={answerSource} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-orange-400 hover:underline">
                  Source: {sourceLabel(answerSource)}
                </a>
              )}
              {lineSource && (
                <a href={lineSource} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-orange-400 hover:underline">
                  Fact from: {sourceLabel(lineSource)} ↗
                </a>
              )}
            </div>
          </div>

          {simpleText && (
            <div className="rounded-xl bg-emerald-950/60 p-3 text-emerald-200">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">In simpler words</p>
              <p className="mt-1">{simpleText}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5" aria-label={`Part ${lineIdx + 1} of ${story.length}`}>
            {story.map((_, k) => (
              <span key={k} className={`h-1.5 flex-1 rounded-full ${k < lineIdx || phase === 'done' ? 'bg-orange-500' : k === lineIdx ? 'bg-orange-300' : 'bg-neutral-700'}`} />
            ))}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-sm">
            {phase === 'listening' ? (
              <p className="text-orange-300">🎙️ Listening… ask your question</p>
            ) : phase === 'thinking' ? (
              <p className="text-amber-300">Thinking…</p>
            ) : listenState === 'listening' ? (
              <p className="text-neutral-300">
                Say <strong className="text-white">“Hey Quill”</strong> to ask anything.
              </p>
            ) : listenState === 'blocked' ? (
              <p className="text-amber-300">The microphone is blocked. Allow it in Chrome's address bar, or type below.</p>
            ) : listenState === 'unsupported' ? (
              <p className="text-amber-300">Voice isn't supported in this browser. Use Chrome or Edge, or type below.</p>
            ) : (
              <p className="text-neutral-400">Microphone is off. Tap “Talk to Quill” to ask by voice.</p>
            )}
            {kidSaid && <p className="mt-1 text-neutral-400">You: “{kidSaid}”</p>}
            {heard && <p className="mt-1 text-xs text-neutral-500">🎙️ I heard: “{heard}”</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {phase === 'narrating' || phase === 'intro' || phase === 'answering' ? (
              <button onClick={pause} className="rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-white hover:bg-neutral-600">⏸ Pause</button>
            ) : phase === 'done' ? (
              <button onClick={() => void playFrom(0)} className="rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-white hover:bg-neutral-600">↺ Hear it again</button>
            ) : (
              <button onClick={resume} className="rounded-xl bg-orange-600 px-4 py-2.5 font-medium text-white hover:bg-orange-500">▶ Carry on</button>
            )}
            <button onClick={onTalkClick} className="rounded-xl bg-white px-4 py-2.5 font-medium text-black hover:bg-neutral-200">🎙️ Talk to Quill</button>
            <button onClick={() => void playFrom(Math.max(0, lineRef.current - 1))} className="rounded-xl border border-neutral-700 px-3 py-2.5 text-neutral-300 hover:bg-neutral-800">⟲ Back</button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value)
                  setTypedError('')
                }}
                placeholder={`Ask ${name} anything…`}
                className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-white placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none"
              />
              <button type="submit" className="rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-white hover:bg-neutral-600">Ask</button>
            </div>
            {typedError && <p className="text-sm text-rose-400">{typedError}</p>}
          </form>
        </section>
      </div>

      {/* Fact card and lesson */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">Fact card</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {machine.card.map((r) => (
              <div key={r.label} className="contents">
                <dt className="text-neutral-400">{r.label}</dt>
                <dd className="text-white">{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-neutral-500">
            Sources:{' '}
            {machine.sources.map((s, k) => (
              <a key={s} href={s} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">
                {k > 0 ? ', ' : ''}
                {sourceLabel(s)}
              </a>
            ))}
          </p>
        </section>

        <section className={`rounded-2xl border p-5 ${gotLesson ? 'border-amber-500/60 bg-amber-950/30' : 'border-neutral-800 bg-neutral-900/40'}`}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">Lesson passed on</h2>
          {gotLesson ? (
            <>
              <p className="text-lg text-white">{machine.lesson.text}</p>
              <p className="mt-2 text-sm text-amber-200">Where it leads: {machine.lesson.nextMission}</p>
              <p className="mt-2 text-sm text-neutral-300">Back on Earth: {machine.backOnEarth}</p>
            </>
          ) : (
            <p className="text-neutral-400">Listen to {name}'s story to collect its lesson for Quill's kit.</p>
          )}
        </section>
      </div>
    </div>
  )
}
