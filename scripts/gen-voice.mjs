#!/usr/bin/env node
// Pre-generates every scripted line with ElevenLabs, with word timings for live captions.
// Output: public/audio/<hash>.mp3 + public/audio/manifest.json (the app looks lines up there).
//
//   npm run voice:dry                    count lines and characters, check voices, no API calls
//   npm run voice                        generate anything new or changed (safe to re-run)
//   npm run voice -- --only sojourner    one machine (plus nothing else)
//   npm run voice -- --force             regenerate everything
//
// Reads keys from .env.local: ELEVENLABS_API_KEY and voice IDs (see .env.example).
// No packages needed: Node 20.12+ (built-in fetch and process.loadEnvFile).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

try {
  process.loadEnvFile('.env.local')
} catch {
  /* no .env.local: fine for --dry-run */
}

const ROOT = process.cwd()
const DATA = join(ROOT, 'src', 'data', 'machines.json')
const OUT_DIR = join(ROOT, 'public', 'audio')
const MANIFEST = join(OUT_DIR, 'manifest.json')
const MODEL = process.env.ELEVENLABS_NARRATION_MODEL || 'eleven_multilingual_v2'
const FORMAT = 'mp3_44100_128'
const KEY = process.env.ELEVENLABS_API_KEY

// Lines Quill says that live in the app code, not in machines.json.
// Keep these in sync with App.tsx (CLOSING) and StopScreen.tsx (afterAnswer).
const EXTRA_QUILL_LINES = [
  'Shall I carry on?',
  "Every machine passed its lesson to me. Now I'm passing them to you. The next frontier is yours.",
]

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const onlyAt = args.indexOf('--only')
const only = onlyAt >= 0 ? args[onlyAt + 1] : undefined

/** Same rules as api/speak.ts. */
function voiceFor(speaker, machine) {
  const env = process.env
  if (speaker === 'quill') return env.ELEVENLABS_VOICE_QUILL
  if (machine) {
    const own = env[`ELEVENLABS_VOICE_${machine.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`]
    if (own) return own
    if (machine.body === 'moon' && env.ELEVENLABS_VOICE_MOON) return env.ELEVENLABS_VOICE_MOON
    if (machine.body === 'mars' && env.ELEVENLABS_VOICE_MARS) return env.ELEVENLABS_VOICE_MARS
  }
  return env.ELEVENLABS_VOICE_MACHINE || env.ELEVENLABS_VOICE_MOON || env.ELEVENLABS_VOICE_MARS
}

function collectLines() {
  const data = JSON.parse(readFileSync(DATA, 'utf8'))
  const items = new Map()
  const add = (speaker, machine, text) => {
    const t = (text ?? '').trim()
    if (!t || /^verify\b/i.test(t)) return
    const key = `${speaker}|${t}`
    if (!items.has(key)) items.set(key, { key, speaker, machine, text: t })
  }
  for (const m of data.machines) {
    if (only && m.id !== only) continue
    const short = m.name.split(' (')[0]
    add('quill', m, m.quillIntro)
    for (const line of m.story) {
      add(line.speaker ?? 'machine', m, line.text)
      add(line.speaker ?? 'machine', m, line.simple)
    }
    for (const chip of m.chips) if (!chip.verify) add('machine', m, chip.a)
    // StopScreen's finish(): `${name} passed you a lesson: ${lesson}`
    add('quill', m, `${short} passed you a lesson: ${m.lesson.text}`)
  }
  if (!only) for (const t of EXTRA_QUILL_LINES) add('quill', undefined, t)
  if (only && items.size === 0) throw new Error(`No machine with id "${only}"`)
  return [...items.values()]
}

/** Group ElevenLabs' character timings into words: { w: word, c: char offset, s: start sec, e: end sec }. */
function toWords(alignment) {
  const chars = alignment?.characters ?? []
  const starts = alignment?.character_start_times_seconds ?? []
  const ends = alignment?.character_end_times_seconds ?? []
  const words = []
  let cur = null
  for (let i = 0; i < chars.length; i++) {
    if (/\s/.test(chars[i])) {
      if (cur) words.push(cur)
      cur = null
      continue
    }
    if (!cur) cur = { w: '', c: i, s: starts[i], e: ends[i] }
    cur.w += chars[i]
    cur.e = ends[i]
  }
  if (cur) words.push(cur)
  return words.map((w) => ({ ...w, s: Math.round(w.s * 1000) / 1000, e: Math.round(w.e * 1000) / 1000 }))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function tts(voiceId, text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${FORMAT}`
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: MODEL }),
    })
    if (res.ok) return res.json()
    if (res.status === 429 || res.status >= 500) {
      await sleep(attempt * 2500)
      continue
    }
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  throw new Error('ElevenLabs: still failing after 4 tries')
}

function loadManifest() {
  if (!existsSync(MANIFEST)) return { lines: {} }
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'))
  } catch {
    return { lines: {} }
  }
}

function saveManifest(manifest) {
  manifest.generatedBy = 'ElevenLabs text to speech (AI-generated voices)'
  manifest.model = MODEL
  manifest.updated = new Date().toISOString()
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
}

async function main() {
  const items = collectLines()
  const manifest = loadManifest()
  manifest.lines ??= {}

  const plan = items.map((it) => {
    const voice = voiceFor(it.speaker, it.machine)
    const hash = voice ? createHash('sha1').update(`${voice}|${MODEL}|${it.text}`).digest('hex').slice(0, 16) : null
    const have = hash && manifest.lines[it.key]?.hash === hash && existsSync(join(OUT_DIR, `${hash}.mp3`))
    return { ...it, voice, hash, todo: !have || force }
  })

  const missingVoice = plan.filter((p) => !p.voice)
  const todo = plan.filter((p) => p.voice && p.todo)
  const chars = todo.reduce((n, p) => n + p.text.length, 0)

  console.log(`Model: ${MODEL}`)
  console.log(`Lines: ${plan.length} total, ${todo.length} to generate (${chars.toLocaleString('en-GB')} characters)`)
  const byWho = {}
  for (const p of plan) {
    const k = p.speaker === 'quill' ? 'Quill' : p.machine.id
    byWho[k] = (byWho[k] ?? 0) + 1
  }
  for (const [k, n] of Object.entries(byWho)) console.log(`  ${k.padEnd(20)} ${n} lines`)
  if (missingVoice.length) {
    const who = [...new Set(missingVoice.map((p) => (p.speaker === 'quill' ? 'ELEVENLABS_VOICE_QUILL' : `a voice for ${p.machine.id}`)))]
    console.warn(`\nNo voice ID for ${missingVoice.length} lines: set ${who.join(', ')} in .env.local`)
  }
  if (dryRun) return
  if (!KEY) throw new Error('Set ELEVENLABS_API_KEY in .env.local')

  mkdirSync(OUT_DIR, { recursive: true })
  let done = 0
  for (const p of todo) {
    const result = await tts(p.voice, p.text)
    writeFileSync(join(OUT_DIR, `${p.hash}.mp3`), Buffer.from(result.audio_base64, 'base64'))
    manifest.lines[p.key] = {
      file: `/audio/${p.hash}.mp3`,
      hash: p.hash,
      speaker: p.speaker,
      machine: p.machine?.id,
      words: toWords(result.alignment),
    }
    saveManifest(manifest)
    done += 1
    console.log(`  [${done}/${todo.length}] ${p.speaker === 'quill' ? 'Quill' : p.machine.id}: ${p.text.slice(0, 60)}${p.text.length > 60 ? '…' : ''}`)
  }

  // Forget lines that no longer exist in the script (their mp3 files can be deleted by hand).
  if (!only) {
    const live = new Set(plan.map((p) => p.key))
    for (const k of Object.keys(manifest.lines)) if (!live.has(k)) delete manifest.lines[k]
  }
  saveManifest(manifest)
  console.log(`\nDone. ${done} new clips in public/audio. Commit public/audio so the live site has them.`)
}

main().catch((err) => {
  console.error(`\n${err.message}`)
  process.exit(1)
})
