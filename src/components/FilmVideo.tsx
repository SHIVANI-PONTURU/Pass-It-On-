// The mission films as ordinary videos (public/videos/*.mp4), for watching straight through,
// sharing in class or showing on a big screen. The talk-along film on the story screen is the
// same story, but kids can interrupt it; the video can't answer questions.
import { useEffect, useRef, useState } from 'react'

/** timeline: when each story line starts in the video, in seconds (same order as machine.story). */
export type FilmVideoEntry = { file: string; seconds?: number; voiced?: boolean; timeline?: number[] }

let loading: Promise<Record<string, FilmVideoEntry>> | null = null
function loadVideos(): Promise<Record<string, FilmVideoEntry>> {
  loading ??= fetch('/videos/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<{ films?: Record<string, FilmVideoEntry> }>) : { films: {} }))
    .then((m) => m.films ?? {})
    .catch(() => ({}))
  return loading
}

/** The video for one machine. `loaded` is false until we know whether there is one. */
export function useFilmVideo(id: string): { loaded: boolean; video?: FilmVideoEntry } {
  const [state, setState] = useState<{ loaded: boolean; video?: FilmVideoEntry }>({ loaded: false })
  useEffect(() => {
    let live = true
    setState({ loaded: false })
    void loadVideos().then((films) => {
      if (live) setState({ loaded: true, video: films[id] })
    })
    return () => {
      live = false
    }
  }, [id])
  return state
}

export default function FilmVideo({ title, video, onClose }: { title: string; video: FilmVideoEntry; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const mins = video.seconds ? `${Math.floor(video.seconds / 60)} min ${Math.round(video.seconds % 60)} s` : ''
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 md:p-8" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${title}: mission film`} className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-semibold text-white md:text-xl">
            🎬 {title}: mission film {mins && <span className="text-sm font-normal text-neutral-400">· {mins}</span>}
          </h2>
          <button ref={closeRef} onClick={onClose} className="rounded-lg border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800">
            Close ✕
          </button>
        </div>
        <video src={video.file} controls autoPlay playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black" />
        <p className="mt-2 text-xs text-neutral-400">
          Cartoon animation made with AI help, voices made with ElevenLabs (AI). Real NASA photos are shown on the board and labelled. Want to ask
          questions? Close the video and say “Hey Quill”.
        </p>
      </div>
    </div>
  )
}
