#!/usr/bin/env node
// One-time set-up after you paste your keys into .env.local:
//
//   npm run setup              check the keys, pick voices and a model, write them into .env.local
//   npm run setup -- --redo    pick voices and the model again, even if some are already set
//
// What it does:
//   1. ElevenLabs: checks the key and your remaining characters, then gives Quill and each machine
//      its own voice. It uses voices already in your account first; if there aren't enough suitable
//      ones, it adds a few from the ElevenLabs Voice Library to "My Voices".
//   2. Mantle (Amazon Bedrock): checks the key, lists the models, and tests a few with a tiny
//      question until one answers quickly. Tries other regions if the key isn't valid in this one.
//   3. Gemini (optional): checks the key if you have pasted one.
//   4. Switches the app's AI voice and agent on for whatever worked.
//
// Keys are only read from .env.local and sent to their own service. Nothing is printed or logged.
// No packages needed: Node 20.12+ (built-in fetch and process.loadEnvFile).
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const ENV_FILE = join(ROOT, '.env.local')
const EXAMPLE = join(ROOT, '.env.example')
const DATA = join(ROOT, 'src', 'data', 'machines.json')
const EL = (process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io').replace(/\/+$/, '')
const redo = process.argv.includes('--redo')
// npm run setup -- --list-models          list the models your Mantle key can use
// npm run setup -- --model <id>            test that model and use it for the agent
// npm run setup -- --mantle-only           only check Mantle (skip voices and Gemini)
const listModels = process.argv.includes('--list-models')
const modelAt = process.argv.indexOf('--model')
const forcedModel = modelAt >= 0 ? process.argv[modelAt + 1] : undefined
const mantleOnly = process.argv.includes('--mantle-only') || listModels || Boolean(forcedModel)

// Everything printed also goes to setup-log.txt (git-ignored), so it can be shared. Keys are never printed.
const LOG = []
const print = console.log
console.log = (...a) => {
  LOG.push(a.join(' '))
  print(...a)
}
process.on('exit', () => {
  try {
    writeFileSync(join(ROOT, 'setup-log.txt'), `npm run setup · ${new Date().toISOString()}\n${LOG.join('\n')}\n`)
  } catch {
    /* the log is only a convenience */
  }
})
const ok = (s) => console.log(`  ✓ ${s}`)
const warn = (s) => console.log(`  ! ${s}`)
const info = (s) => console.log(`    ${s}`)

if (!existsSync(ENV_FILE)) {
  copyFileSync(EXAMPLE, ENV_FILE)
  console.log('Made .env.local from .env.example. Paste your keys into it, save, and run npm run setup again.')
  process.exit(0)
}
process.loadEnvFile(ENV_FILE)
const env = process.env
const updates = new Map()
const set = (k, v) => {
  updates.set(k, String(v))
  env[k] = String(v)
}

async function http(url, init = {}, ms = 20000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
  let body = null
  const text = await res.text()
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, ok: res.ok, body }
}
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b ?? '')).replace(/\s+/g, ' ').slice(0, 180)

// ---------------------------------------------------------------- ElevenLabs

// What each character should sound like. Words are matched against each voice's labels and description.
const ROLES = {
  quill: { env: 'ELEVENLABS_VOICE_QUILL', who: 'Quill, the rookie robot', age: ['young'], want: ['playful', 'cheerful', 'bright', 'upbeat', 'energetic', 'friendly', 'expressive', 'animation', 'character'] },
  'surveyor-3': { who: 'Surveyor 3 (1967, wise and warm)', gender: 'male', age: ['old', 'middle aged'], want: ['warm', 'wise', 'grandfather', 'storyteller', 'narrat', 'gentle', 'calm'] },
  'apollo-12-alsep': { who: 'Apollo 12 science station (calm scientist)', gender: 'female', age: ['middle aged'], want: ['calm', 'clear', 'informative', 'educational', 'professional', 'narrat', 'warm'] },
  'apollo-15-lrv': { who: 'Moon buggy (fun, adventurous)', gender: 'male', age: ['young', 'middle aged'], want: ['energetic', 'upbeat', 'enthusiastic', 'friendly', 'casual', 'excited', 'conversational'] },
  'viking-landers': { who: 'Viking 1 and 2 (the twin landers)', gender: 'female', age: ['middle aged', 'old'], want: ['warm', 'narrat', 'storyteller', 'calm', 'soothing', 'mature'] },
  sojourner: { who: 'Sojourner (small, brave first rover)', gender: 'female', age: ['young'], want: ['cheerful', 'bright', 'sweet', 'friendly', 'upbeat', 'animation', 'character', 'youthful'] },
  'spirit-opportunity': { who: 'Spirit and Opportunity (the twin rovers)', gender: 'male', age: ['young', 'middle aged'], want: ['friendly', 'warm', 'conversational', 'curious', 'upbeat', 'casual', 'natural'] },
}
const NEVER = /asmr|whisper|sensual|seductive|sexy|erotic|flirt|horror|creepy|scary|villain|demon|monster|evil|drunk|sleep|meditat|hypno|raspy|gravel|crying|robotic|fierce|warrior|aggressive|dominant|trickster|husky|menac/i

// Hand-picked cast from ElevenLabs' standard voices, used when the account has them (first match wins).
const CAST = {
  quill: ['Jessica', 'Laura', 'Bella'], // playful, bright rookie robot
  'surveyor-3': ['Bill', 'George', 'Brian'], // wise and warm, from 1967
  'apollo-12-alsep': ['Alice', 'Matilda', 'Sarah'], // calm, clear scientist
  'apollo-15-lrv': ['Charlie', 'Liam', 'Will'], // fun and adventurous
  'viking-landers': ['Lily', 'Sarah', 'Matilda'], // the twin landers
  sojourner: ['Laura', 'Bella', 'Jessica'], // small, brave first rover
  'spirit-opportunity': ['Chris', 'Will', 'Eric'], // the friendly twin rovers
}
const norm = (s) => String(s ?? '').toLowerCase().replace(/[_-]+/g, ' ')

function describe(v) {
  const l = v.labels ?? {}
  return norm([v.name, v.description, v.descriptive, v.use_case, v.accent, v.age, v.gender, ...Object.values(l)].join(' '))
}
function gender(v) {
  return norm(v.labels?.gender ?? v.gender)
}
function age(v) {
  return norm(v.labels?.age ?? v.age)
}
function english(v) {
  const lang = norm(v.labels?.language ?? v.language)
  return !lang || lang === 'en' || lang.startsWith('english')
}
function score(v, role) {
  const text = describe(v)
  if (NEVER.test(text) || !english(v)) return -100
  let s = 0
  if (role.gender) s += gender(v) === role.gender ? 3 : gender(v) ? -3 : 0
  if (role.age.includes(age(v))) s += 2
  s += Math.min(3, role.want.filter((w) => text.includes(w)).length) * 2
  if (/narrat|story|education|informative|character|animation|conversational/.test(text)) s += 1
  if (v.category === 'premade') s += 1
  if (v.library) s -= 0.5 // prefer what's already in the account
  return s
}

/** Give each role its own voice, most specific roles first. */
function assign(pool, roleIds) {
  const order = ['quill', 'sojourner', 'apollo-15-lrv', 'spirit-opportunity', 'surveyor-3', 'apollo-12-alsep', 'viking-landers']
  const ids = [...order.filter((r) => roleIds.includes(r)), ...roleIds.filter((r) => !order.includes(r))]
  const used = new Set()
  const picks = {}
  for (const r of ids) {
    const ranked = pool.map((v) => ({ v, s: score(v, ROLES[r]) })).filter((x) => x.s > -50).sort((a, b) => b.s - a.s)
    const fresh = ranked.find((x) => !used.has(x.v.voice_id))
    const pick = fresh ?? ranked[0]
    if (!pick) continue
    used.add(pick.v.voice_id)
    picks[r] = { ...pick, shared: !fresh }
  }
  return picks
}

async function accountVoices(key) {
  const out = []
  let token = null
  for (let page = 0; page < 5; page++) {
    const q = new URLSearchParams({ page_size: '100', include_total_count: 'false' })
    if (token) q.set('next_page_token', token)
    const r = await http(`${EL}/v2/voices?${q}`, { headers: { 'xi-api-key': key } })
    if (!r.ok) {
      // Older accounts/keys: fall back to v1.
      const r1 = await http(`${EL}/v1/voices`, { headers: { 'xi-api-key': key } })
      if (!r1.ok) throw new Error(`could not list voices (${r1.status}): ${short(r1.body)}`)
      return r1.body.voices ?? []
    }
    out.push(...(r.body.voices ?? []))
    if (!r.body.has_more || !r.body.next_page_token) break
    token = r.body.next_page_token
  }
  return out
}

async function libraryVoices(key) {
  const out = []
  for (let page = 0; page < 3; page++) {
    const q = new URLSearchParams({ page_size: '100', language: 'en', featured: 'true', page: String(page) })
    const r = await http(`${EL}/v1/shared-voices?${q}`, { headers: { 'xi-api-key': key } })
    if (!r.ok) break
    out.push(...(r.body.voices ?? []))
    if (!r.body.has_more) break
  }
  return out
    .filter((v) => v.public_owner_id && v.voice_id && v.category !== 'famous')
    .filter((v) => !(typeof v.rate === 'number' && v.rate > 1) && !v.fiat_rate)
    .map((v) => ({ ...v, library: true }))
}

async function setupVoices(machines) {
  console.log('\nElevenLabs (voices)')
  const key = env.ELEVENLABS_API_KEY
  if (!key) {
    warn('No key yet. Paste it after ELEVENLABS_API_KEY= in .env.local, save, and run npm run setup again.')
    return false
  }
  const sub = await http(`${EL}/v1/user/subscription`, { headers: { 'xi-api-key': key } })
  const missing = (r) => r.body?.detail?.status === 'missing_permissions'
  if ((sub.status === 401 || sub.status === 403) && !missing(sub)) {
    warn(`ElevenLabs didn't accept this key (${sub.status}: ${short(sub.body)}).`)
    info('Copy it again from elevenlabs.io > Developers > API keys, paste it after ELEVENLABS_API_KEY= and save.')
    return false
  }
  if (missing(sub)) {
    warn(`Key accepted, but it can't read your plan: ${short(sub.body?.detail?.message)}. That's fine.`)
  } else if (sub.ok) {
    const left = (sub.body.character_limit ?? 0) - (sub.body.character_count ?? 0)
    ok(`Key works · plan: ${sub.body.tier ?? 'unknown'} · ${left.toLocaleString('en-GB')} characters left this month`)
  } else {
    warn(`Key accepted, but it can't read your plan (${sub.status}). That's fine if the key has no "User" permission.`)
  }

  const envName = (id) => ROLES[id]?.env ?? `ELEVENLABS_VOICE_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
  const roleIds = ['quill', ...machines.map((m) => m.id)].filter((id) => ROLES[id])
  let account
  try {
    account = await accountVoices(key)
  } catch (e) {
    warn(`${e.message}`)
    info('Fix: elevenlabs.io > Developers > API keys > edit this key > set "Voices" to Read (or Access), save, then run npm run setup again.')
    return false
  }
  // Never your own voice clones or designs: only default and Voice Library voices.
  const mine = (v) => v.is_owner === true || (v.is_owner === undefined && v.category === 'cloned')
  const pool = account.filter((v) => !mine(v) || v.category === 'premade')
  info(`Found ${account.length} voices in your account (${pool.length} usable).`)
  const byId = new Map(account.map((v) => [v.voice_id, v]))

  // Keep voices already chosen, unless --redo.
  const keep = {}
  if (!redo) for (const r of roleIds) if (env[envName(r)] && byId.has(env[envName(r)])) keep[r] = byId.get(env[envName(r)])
  const todo = roleIds.filter((r) => !keep[r])

  // First the hand-picked cast, by voice name, then the best match for anyone left.
  const cast = {}
  const taken = new Set(Object.values(keep).map((k) => k.voice_id))
  for (const r of todo) {
    for (const name of CAST[r] ?? []) {
      const v = pool.find((x) => !taken.has(x.voice_id) && new RegExp(`^${name}\\b`, 'i').test(x.name ?? '') && !NEVER.test(describe(x)))
      if (v) {
        cast[r] = { v, s: 99, shared: false }
        taken.add(v.voice_id)
        break
      }
    }
  }
  const rest = todo.filter((r) => !cast[r])
  let picks = { ...cast, ...assign(pool.filter((v) => !taken.has(v.voice_id)), rest) }
  const weak = rest.filter((r) => !picks[r] || picks[r].shared || picks[r].s < 3)
  if (weak.length) {
    info(`Your account has ${pool.length} voices; looking in the Voice Library for better matches...`)
    const lib = await libraryVoices(key)
    if (lib.length) picks = { ...cast, ...assign([...pool, ...lib].filter((v) => !taken.has(v.voice_id)), rest) }
  }

  for (const r of roleIds) {
    if (keep[r]) {
      ok(`${ROLES[r].who}: ${keep[r].name} (kept)`)
      continue
    }
    const p = picks[r]
    if (!p) {
      warn(`${ROLES[r].who}: no suitable voice found; it will use the Moon/Mars voice.`)
      continue
    }
    let id = p.v.voice_id
    if (p.v.library) {
      const add = await http(`${EL}/v1/voices/add/${encodeURIComponent(p.v.public_owner_id)}/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ new_name: `Pass It On · ${p.v.name}`.slice(0, 60) }),
      })
      if (!add.ok) {
        warn(`${ROLES[r].who}: couldn't add "${p.v.name}" from the Voice Library (${add.status}): ${short(add.body)}`)
        continue
      }
      id = add.body.voice_id ?? id
    }
    set(envName(r), id)
    ok(`${ROLES[r].who}: ${p.v.name}${p.v.library ? ' (added to My Voices from the Voice Library)' : ''}${p.shared ? ' (shared)' : ''}`)
  }
  // Fallbacks for anything without its own voice.
  const moon = env[envName('surveyor-3')] || env.ELEVENLABS_VOICE_MOON
  const mars = env[envName('viking-landers')] || env.ELEVENLABS_VOICE_MARS
  if (moon && (redo || !env.ELEVENLABS_VOICE_MOON)) set('ELEVENLABS_VOICE_MOON', moon)
  if (mars && (redo || !env.ELEVENLABS_VOICE_MARS)) set('ELEVENLABS_VOICE_MARS', mars)
  info('Change any voice by pasting another voice ID into .env.local (ElevenLabs > My Voices > ⋯ > Copy voice ID).')
  return Boolean(env.ELEVENLABS_VOICE_QUILL && (moon || mars))
}

// ---------------------------------------------------------------- Mantle

const SKIP_MODEL = /embed|guard|whisper|tts|speech|rerank|image|stable|titan.?image|canvas|reel|sonic|moderat/i
const PREFER = [/gpt-oss-120b/i, /qwen3.*(235b|instruct)/i, /gpt-oss/i, /qwen/i, /kimi/i, /glm/i, /deepseek/i, /llama|mistral|nova|gemma/i]
const rank = (id) => {
  const i = PREFER.findIndex((re) => re.test(id))
  return i < 0 ? PREFER.length : i
}

async function tryModel(base, key, model, api, effort) {
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` }
  const system = 'You are a friendly space robot talking to a 10-year-old. Answer in one short sentence.'
  const question = 'What is the Moon made of?'
  const t0 = Date.now()
  const body =
    api === 'responses'
      ? { model, instructions: system, input: question, max_output_tokens: 600, ...(effort ? { reasoning: { effort } } : {}) }
      : { model, messages: [{ role: 'system', content: system }, { role: 'user', content: question }], max_tokens: 600, ...(effort ? { reasoning_effort: effort } : {}) }
  const r = await http(`${base}/${api === 'responses' ? 'responses' : 'chat/completions'}`, { method: 'POST', headers, body: JSON.stringify(body) }, 15000)
  const ms = Date.now() - t0
  if (!r.ok) return { ok: false, status: r.status, why: short(r.body) }
  let text = ''
  if (api === 'responses') {
    text = r.body.output_text ?? (r.body.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text).join(' ')
  } else {
    text = r.body.choices?.[0]?.message?.content ?? ''
  }
  text = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  return { ok: Boolean(text), ms, text, status: r.status, why: text ? '' : 'empty answer' }
}

async function setupMantle() {
  console.log('\nMantle (the agent kids can talk to)')
  const key = env.MANTLE_API_KEY
  if (!key) {
    warn('No key yet. Paste it after MANTLE_API_KEY= in .env.local. Until then, kids get answers from the fact file.')
    return false
  }
  const current = (env.MANTLE_BASE_URL || 'https://bedrock-mantle.us-east-1.api.aws/v1').replace(/\/+$/, '')
  const regions = ['us-east-1', 'us-west-2', 'us-east-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-northeast-1', 'ap-south-1']
  const bases = [current, ...regions.map((r) => `https://bedrock-mantle.${r}.api.aws/v1`).filter((b) => b !== current)]

  let base = null
  let models = []
  let lastErr = ''
  for (const b of bases) {
    try {
      const r = await http(`${b}/models`, { headers: { authorization: `Bearer ${key}` } }, 6000)
      if (r.ok) {
        base = b
        models = (r.body?.data ?? []).map((m) => m.id).filter(Boolean)
        break
      }
      lastErr ||= `${r.status}: ${short(r.body)}` // keep the answer from your own region
      if (r.status !== 401 && r.status !== 403) break // a real answer from the right place
    } catch (e) {
      if (b === current) lastErr = `can't reach ${b} (${e.message})`
    }
  }
  if (!base) {
    warn(`The key didn't work with Mantle (${lastErr}).`)
    info('Mantle needs an Amazon Bedrock API key (AWS console > Bedrock > API keys). Check it was copied in full.')
    return false
  }
  if (base !== current) set('MANTLE_BASE_URL', base)
  ok(`Key works · ${base.replace('https://', '').replace('/v1', '')} · ${models.length} models`)
  if (listModels) {
    for (const id of [...models].sort()) info(id)
    return false
  }
  if (forcedModel && !models.includes(forcedModel)) warn(`${forcedModel} is not in this key's model list; trying it anyway.`)

  const usable = models.filter((id) => !SKIP_MODEL.test(id)).sort((a, b) => rank(a) - rank(b))
  const candidates = forcedModel ? [forcedModel] : [...new Set([...(!redo && env.MANTLE_MODEL ? [env.MANTLE_MODEL] : []), ...usable])].slice(0, 6)
  for (const model of candidates) {
    for (const api of ['chat', 'responses']) {
      let effort = /gpt-oss/i.test(model) ? 'low' : undefined
      let t = await tryModel(base, key, model, api, effort)
      if (!t.ok && effort && t.status === 400) {
        effort = undefined
        t = await tryModel(base, key, model, api, undefined)
      }
      if (t.ok) {
        set('MANTLE_MODEL', model)
        set('MANTLE_API', api)
        set('MANTLE_REASONING_EFFORT', effort ?? '')
        if (/gpt-oss|qwen3|deepseek|kimi|glm/i.test(model)) set('MANTLE_MAX_TOKENS', 900)
        ok(`Using ${model} (${api === 'chat' ? 'Chat Completions' : 'Responses'} API) · answered in ${(t.ms / 1000).toFixed(1)} s`)
        info(`Test answer: "${t.text.slice(0, 120)}"`)
        if (t.ms > 6000) warn('That was slow; the app waits 7 s before falling back to its fact file. Try npm run setup -- --redo later.')
        return true
      }
      lastErr = `${t.status}: ${t.why}`
      if (t.status === 404 || t.status === 400) continue
      break
    }
    info(`${model} didn't answer (${lastErr || 'not supported'}); trying the next one...`)
  }
  warn(`No model answered. Last error: ${lastErr}. In the AWS console, open Bedrock > Model access and enable an open-weight model (e.g. gpt-oss-120b).`)
  return false
}

// ---------------------------------------------------------------- Gemini (optional)

async function checkGemini() {
  console.log('\nGemini (AI pictures and clips, optional)')
  const key = env.GEMINI_API_KEY
  if (!key) {
    info('No key. That is fine: the films use real NASA photos and our own animations.')
    return
  }
  const r = await http('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } })
  if (!r.ok) return warn(`Gemini didn't accept the key (${r.status}).`)
  const names = (r.body.models ?? []).map((m) => m.name.replace('models/', ''))
  ok(`Key works · ${names.filter((n) => /image/.test(n)).length} image models · ${names.filter((n) => /omni|veo/.test(n)).length} video models`)
}

// ---------------------------------------------------------------- write .env.local

function writeEnv() {
  if (!updates.size) return
  const raw = readFileSync(ENV_FILE, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const lines = raw.split(/\r?\n/)
  for (const [k, v] of updates) {
    const i = lines.findIndex((l) => new RegExp(`^\\s*${k}\\s*=`).test(l))
    const c = i < 0 ? lines.findIndex((l) => new RegExp(`^\\s*#\\s*${k}\\s*=`).test(l)) : -1
    if (i >= 0) lines[i] = `${k}=${v}`
    else if (c >= 0) lines[c] = `${k}=${v}`
    else {
      if (lines.at(-1) === '') lines.pop()
      lines.push(`${k}=${v}`, '')
    }
  }
  writeFileSync(ENV_FILE, lines.join(eol))
}

// ---------------------------------------------------------------- main

const machines = JSON.parse(readFileSync(DATA, 'utf8')).machines
console.log('Pass It On set-up')
let voices = false
let agent = false
if (!mantleOnly) {
  try {
    voices = await setupVoices(machines)
  } catch (e) {
    warn(`ElevenLabs check failed: ${e.message}`)
  }
}
try {
  agent = await setupMantle()
} catch (e) {
  warn(`Mantle check failed: ${e.message}`)
}
if (!mantleOnly) {
  try {
    await checkGemini()
  } catch (e) {
    warn(`Gemini check failed: ${e.message}`)
  }
}
if (voices) set('VITE_LIVE_VOICE', 'true')
if (agent) set('VITE_USE_AGENT', 'true')
writeEnv()

console.log(updates.size ? '\nSaved to .env.local.' : '\nNothing new to save yet.')
if (voices) {
  try {
    const out = execFileSync(process.execPath, [join(ROOT, 'scripts', 'gen-voice.mjs'), '--dry-run'], { encoding: 'utf8' })
    const line = out.split('\n').find((l) => l.startsWith('Lines:'))
    if (line) info(`Voices to record: ${line.replace('Lines: ', '')}`)
  } catch {
    /* the dry run is only a summary */
  }
}
console.log('\nNext:')
if (voices) console.log('  npm run voice     records every film line in these voices (run once; re-runs only redo changed lines)')
console.log('  npm run dev       open the app (restart it after changing .env.local)')
