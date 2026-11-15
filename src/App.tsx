import { useEffect, useRef, useState } from 'react'
import { data, imageSrc, machineById, shortName, viewerImages } from './data'
import Quill from './components/Quill'
import Logo from './components/Logo'
import SpaceBackdrop from './components/SpaceBackdrop'
import { CartoonRocket } from './components/AstronautFigure'
import StopScreen from './components/StopScreen'
import { Listener } from './engine/voice'
import type { ListenState, VoiceEvent } from './engine/voice'
import { speak, speechSupported, stopSpeaking, warmUpSpeech } from './engine/narrator'

type Screen = { name: 'start' } | { name: 'map' } | { name: 'stop'; id: string } | { name: 'finale' }

const CLOSING = "Every machine passed its lesson to me. Now I'm passing them to you. The next frontier is yours."

function KitBar({ kit }: { kit: Set<string> }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Quill's kit: ${kit.size} of ${data.machines.length} lessons`}>
      <span className="text-xs text-neutral-400">Quill's kit</span>
      {data.machines.map((m) => (
        <span
          key={m.id}
          title={kit.has(m.id) ? `${shortName(m)}: ${m.lesson.text}` : shortName(m)}
          className={`h-3 w-3 rounded-full ${kit.has(m.id) ? 'bg-amber-400' : 'bg-neutral-700'}`}
        />
      ))}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' })
  const [kit, setKit] = useState<Set<string>>(new Set())
  const [listenState, setListenState] = useState<ListenState>('off')
  const [handsFree, setHandsFree] = useState(true)
  const handlerRef = useRef<((e: VoiceEvent) => void) | null>(null)
  const listenerRef = useRef<Listener | null>(null)

  const getListener = () => {
    if (!listenerRef.current) {
      listenerRef.current = new Listener((e) => handlerRef.current?.(e), setListenState)
      if (!listenerRef.current.supported) setListenState('unsupported')
    }
    return listenerRef.current
  }

  const startListening = () => {
    const l = getListener()
    if (l.supported && !l.running) l.start()
  }

  useEffect(() => () => listenerRef.current?.stop(), [])

  const begin = () => {
    warmUpSpeech()
    if (handsFree) startListening()
    else getListener()
    setScreen({ name: 'map' })
  }

  const chapterOf = (id: string) => data.chapters.find((c) => c.stops.includes(id))

  if (screen.name === 'start') {
    return (
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-black">
        {/* The Moon on the left, Mars on the right (painted backgrounds, AI illustration) */}
        <div aria-hidden className="absolute inset-0">
          <div
            className="absolute inset-0 bg-[#3f3f46] bg-cover bg-center"
            style={{ backgroundImage: 'url(/art/moon-plain.jpg)', clipPath: 'polygon(0 0, 57% 0, 43% 100%, 0 100%)' }}
          />
          <div
            className="absolute inset-0 bg-[#7c2d12] bg-cover bg-center"
            style={{ backgroundImage: 'url(/art/mars-day.jpg)', clipPath: 'polygon(57% 0, 100% 0, 100% 100%, 43% 100%)' }}
          />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <line x1="57" y1="0" x2="43" y2="100" stroke="#fdba74" strokeWidth="0.5" opacity="0.9" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.55)_40%,rgba(0,0,0,0.1)_85%)]" />
        </div>
        <p className="absolute left-5 top-5 rounded-full bg-black/45 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.25em] text-neutral-100 md:left-8 md:top-8 md:text-base">
          The Moon
        </p>
        <p className="absolute right-5 top-5 rounded-full bg-black/45 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.25em] text-orange-200 md:right-8 md:top-8 md:text-base">
          Mars
        </p>
        <div aria-hidden className="start-rocket absolute bottom-[10%] right-[7%] hidden md:block">
          <svg viewBox="0 0 100 220" className="h-40 w-auto rotate-[18deg] lg:h-52">
            <CartoonRocket flying />
          </svg>
        </div>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
          <Quill state="idle" size={150} arm="point" />
          <div>
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
              <Logo size={88} className="md:h-[120px] md:w-[120px]" />
              <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg md:text-7xl">Pass It On</h1>
            </div>
            <p className="mt-3 text-lg text-neutral-100 drop-shadow md:text-xl">
              The machines NASA left on the Moon and Mars have one last job: passing what they learned on to you.
            </p>
          </div>
          <button onClick={begin} className="rounded-2xl bg-orange-600 px-8 py-4 text-xl font-semibold text-white shadow-lg shadow-black/60 hover:bg-orange-500">
            Tap to start the journey
          </button>
          <p className="text-xl text-neutral-100 drop-shadow">
            Say <strong className="text-orange-300">“Hey Quill”</strong> any time to ask a question.
          </p>
          <label className="flex items-center gap-2 text-sm text-neutral-200">
            <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} />
            Listen for “Hey Quill” (uses the microphone)
          </label>
          {!speechSupported && <p className="max-w-xl text-xs text-neutral-300">This browser cannot read aloud, so the story will appear as text.</p>}
        </div>
        <p className="relative z-10 pb-3 text-center text-[11px] text-neutral-400">Moon and Mars backgrounds: AI illustration</p>
      </main>
    )
  }

  if (screen.name === 'stop') {
    const m = machineById(screen.id)
    if (!m) return null
    return (
      <>
        <SpaceBackdrop astronaut={false} />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 md:px-6">
          <button
            onClick={() => {
              stopSpeaking()
              setScreen({ name: 'map' })
            }}
            className="flex items-center gap-2 rounded-xl pr-2 text-left hover:bg-white/5"
            aria-label="Pass It On: back to the map"
          >
            <Logo size={40} decorative />
            <span className="text-lg font-bold text-white">Pass It On</span>
          </button>
          <KitBar kit={kit} />
        </div>
        <StopScreen
          key={m.id}
          machine={m}
          chapterTitle={chapterOf(m.id)?.title ?? ''}
          handlerRef={handlerRef}
          listenState={listenState}
          hasLesson={kit.has(m.id)}
          onTalk={startListening}
          onLesson={(id) => setKit((k) => new Set(k).add(id))}
          onBack={() => {
            stopSpeaking()
            setScreen({ name: 'map' })
          }}
        />
      </>
    )
  }

  if (screen.name === 'finale') {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <SpaceBackdrop />
        <div className="flex flex-col items-center gap-4 text-center">
          <Quill state="speaking" size={130} />
          <h1 className="text-4xl font-bold text-white">Quill's kit is full!</h1>
          <p className="max-w-2xl text-xl text-orange-200">{CLOSING}</p>
        </div>
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {data.machines.map((m) => (
            <li key={m.id} className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4">
              <p className="text-sm font-semibold text-amber-300">{shortName(m)}</p>
              <p className="text-white">{m.lesson.text}</p>
              <p className="mt-1 text-sm text-neutral-400">{m.lesson.nextMission}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => setScreen({ name: 'map' })} className="rounded-xl border border-neutral-700 px-5 py-3 text-neutral-200 hover:bg-neutral-800">
            Back to the map
          </button>
          <button
            onClick={() => {
              setKit(new Set())
              setScreen({ name: 'start' })
            }}
            className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-500"
          >
            Start again
          </button>
        </div>
      </main>
    )
  }

  // Map of chapters and machines
  const allCollected = kit.size === data.machines.length
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <SpaceBackdrop />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size={72} />
          <div>
            <h1 className="text-3xl font-bold text-white">Pass It On</h1>
            <p className="text-neutral-400">Pick a machine. Each one has a lesson to pass on to Quill.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Quill state={listenState === 'listening' ? 'listening' : 'idle'} size={56} />
          <KitBar kit={kit} />
        </div>
      </header>

      {data.chapters
        .filter((c) => c.stops.length > 0)
        .map((c) => (
          <section key={c.id} className="mb-8">
            <h2 className="text-xl font-semibold text-white">{c.title}</h2>
            <p className="mb-3 text-sm text-orange-400">{c.focusArea}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.stops.map((id) => {
                const m = machineById(id)
                if (!m) return null
                const hero = viewerImages(m)[0]
                const done = kit.has(m.id)
                return (
                  <button
                    key={id}
                    onClick={() => setScreen({ name: 'stop', id })}
                    className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/70 text-left hover:border-orange-500"
                  >
                    <div className="relative aspect-video bg-black">
                      {hero && <img src={imageSrc(hero)} alt="" className="h-full w-full object-cover opacity-90 group-hover:opacity-100" />}
                      {done && <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-black">Lesson collected</span>}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-white">{shortName(m)}</p>
                      <p className="text-sm text-neutral-400">{m.type}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="text-xl font-semibold text-white">{data.chapters.find((c) => c.stops.length === 0)?.title ?? 'The finale'}</h2>
        <p className="mb-3 text-sm text-orange-400">Expanding our understanding of the universe</p>
        {allCollected ? (
          <button
            onClick={() => {
              setScreen({ name: 'finale' })
              void speak(CLOSING, 'quill')
            }}
            className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-black hover:bg-amber-400"
          >
            Launch Quill with every lesson 🚀
          </button>
        ) : (
          <p className="text-neutral-400">Collect all {data.machines.length} lessons to launch Quill. You have {kit.size}.</p>
        )}
      </section>
    </main>
  )
}
