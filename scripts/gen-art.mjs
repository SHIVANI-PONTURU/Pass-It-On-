#!/usr/bin/env node
// Paints storybook backgrounds for the cartoon films with Gemini image generation ("Nano Banana").
// Only the scenery is AI-made: the machines stay our own accurate drawings, and the real NASA photo
// stays on its board. The app labels every scene that uses one of these as "AI illustration".
//
//   npm run art              make any backgrounds that are missing (about 9 pictures)
//   npm run art -- --force   make them all again
//   npm run art -- --only mars-day
//   npm run art -- --dry-run  show the prompts, no API calls
//
// Reads GEMINI_API_KEY (and optional GEMINI_IMAGE_MODEL) from .env.local. Writes public/art/<name>.png
// and public/art/manifest.json (model, prompt and date for each picture, for the AI disclosure).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

try {
  process.loadEnvFile('.env.local')
} catch {
  /* fine for --dry-run */
}

const OUT = join(process.cwd(), 'public', 'art')
const MANIFEST = join(OUT, 'manifest.json')
const API = 'https://generativelanguage.googleapis.com/v1beta'
const KEY = process.env.GEMINI_API_KEY
const args = process.argv.slice(2)
const dry = args.includes('--dry-run')
const force = args.includes('--force')
const onlyAt = args.indexOf('--only')
const only = onlyAt >= 0 ? args[onlyAt + 1] : undefined

// Space scenes keep the app's drawn starfield (open space has no ground), so there is no "space" picture here.
const STYLE =
  "Warm, painterly children's picture-book illustration with soft gouache textures and gentle light. Wide 16:9 landscape. " +
  'The horizon sits a little above the middle of the picture; the whole lower half is a wide, flat, open, empty stretch of ground, ' +
  'so cartoon characters can stand on it. Leave the upper-right area calm and plain. ' +
  'No text, letters or numbers. No logos, flags or badges. No people or astronauts. No spacecraft, rockets, rovers, landers or machines of any kind.'

const ART = {
  'moon-plain': 'The grey, dusty surface of the Moon: a gently rolling plain with small round craters and a few pebbles. Black sky full of tiny stars. The blue-and-white Earth hangs small in the sky at the upper left.',
  'moon-mountains': 'The grey surface of the Moon at the foot of tall, rounded grey mountains on the far horizon, with a long winding valley in the distance. Black starry sky. The blue-and-white Earth small at the upper left.',
  'moon-night': "The Moon's surface during the long, cold lunar night: dark grey ground faintly lit by soft blue earthlight, deep black sky packed with stars, the blue Earth small at the upper left.",
  'mars-day': 'The surface of Mars: a rocky reddish-orange plain with scattered brown rocks and soft dunes, a butterscotch-pink dusty sky, and a small pale Sun at the upper left.',
  'mars-plains': 'Flat, dark, sandy plains on Mars stretching to a low crater rim on the horizon, small ripples in the sand, butterscotch-pink sky, small pale Sun at the upper left.',
  'mars-night': 'Mars at sunset: the sky fades from dusty pink to deep blue, with a small soft blue glow around the setting Sun low on the horizon (sunsets on Mars look blue), the first stars appearing, reddish ground in shadow.',
  'earth-day': 'A sunny day on Earth: bright blue sky with soft white clouds above a flat green grassy field and gentle hills far away.',
  lab: 'A bright, very clean laboratory room: smooth pale blue walls and a plain light grey floor, soft even light, completely empty.',
}

function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'))
  } catch {
    return { generatedBy: 'Google Gemini image generation (AI illustrations)', images: {} }
  }
}

async function pickModel() {
  if (process.env.GEMINI_IMAGE_MODEL) return process.env.GEMINI_IMAGE_MODEL
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } })
  if (!r.ok) throw new Error(`Gemini didn't accept the key (${r.status}): ${(await r.text()).slice(0, 160)}`)
  const names = ((await r.json()).models ?? []).map((m) => m.name.replace('models/', ''))
  const prefer = [/gemini-3\.\d+-flash-image/, /gemini-2\.5-flash-image$/, /flash-image/, /pro-image/, /image/]
  for (const re of prefer) {
    const hit = names.filter((n) => re.test(n) && !/edit|tts|embed/i.test(n)).sort().reverse()[0]
    if (hit) return hit
  }
  throw new Error(`No image model found for this key. Models seen: ${names.slice(0, 12).join(', ')}`)
}

async function paint(model, prompt, withRatio = true) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'], ...(withRatio ? { imageConfig: { aspectRatio: '16:9' } } : {}) },
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    })
    if (r.status === 400 && withRatio) return paint(model, prompt, false) // older models: no aspect ratio option
    if ((r.status === 429 || r.status >= 500) && attempt < 3) {
      await new Promise((res) => setTimeout(res, attempt * 4000))
      continue
    }
    const json = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(json).slice(0, 200)}`)
    const parts = json.candidates?.[0]?.content?.parts ?? []
    const img = parts.map((p) => p.inlineData ?? p.inline_data).find(Boolean)
    if (!img?.data) throw new Error(`no picture came back (${json.candidates?.[0]?.finishReason ?? 'unknown reason'})`)
    return { data: Buffer.from(img.data, 'base64'), mime: img.mimeType ?? img.mime_type ?? 'image/png' }
  }
  throw new Error('gave up after 3 tries')
}

const todo = Object.entries(ART).filter(([k]) => !only || k === only)
if (only && !todo.length) throw new Error(`No background called "${only}". Choose from: ${Object.keys(ART).join(', ')}`)
const manifest = loadManifest()
mkdirSync(OUT, { recursive: true })

if (dry) {
  for (const [k, p] of todo) console.log(`${k}:\n  ${p}\n`)
  console.log(`Style for all:\n  ${STYLE}`)
  process.exit(0)
}
if (!KEY) {
  console.log('No GEMINI_API_KEY in .env.local. Paste it after GEMINI_API_KEY= and run npm run art again.')
  process.exit(1)
}

const model = await pickModel()
console.log(`Painting backgrounds with ${model}\n`)
let made = 0
for (const [key, scene] of todo) {
  const old = manifest.images[key]
  if (!force && old && existsSync(join(OUT, old.file))) {
    console.log(`  - ${key}: already made (use --force to redo)`)
    continue
  }
  const prompt = `${scene} ${STYLE}`
  try {
    const { data, mime } = await paint(model, prompt)
    const file = `${key}.${mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'}`
    writeFileSync(join(OUT, file), data)
    manifest.images[key] = { file, model, prompt, created: new Date().toISOString() }
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
    made++
    console.log(`  ✓ ${key} (${Math.round(data.length / 1024)} KB)`)
  } catch (e) {
    console.log(`  ! ${key}: ${e.message}`)
  }
}
console.log(`\n${made} new background${made === 1 ? '' : 's'} in public/art. Refresh the app to see them.`)
console.log('Look at each one: if anything looks wrong, delete it from public/art/manifest.json and run npm run art again.')
