// One-click deploy to Vercel (run by deploy.bat on Windows, or `node scripts/deploy.mjs`).
// 1. checks the site builds, 2. signs you in to Vercel if needed, 3. uploads the site to production.
// Keys are read from .env.local on this computer and handed straight to the Vercel CLI;
// they are never printed, written to another file or uploaded as files (.vercelignore keeps .env* off).
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

// Settings the live site doesn't need (Gemini only makes pictures on this computer).
const SKIP = new Set(['GEMINI_API_KEY'])

const say = (msg) => console.log(`\n=== ${msg}`)
const fail = (msg) => {
  console.log(`\n!!! ${msg}\n`)
  process.exit(1)
}

// Run the Vercel CLI through npx without a shell, so keys with special characters arrive intact.
const npxCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')
function vercel(args, opts = {}) {
  const full = ['--yes', 'vercel@latest', ...args]
  if (existsSync(npxCli)) return spawnSync(process.execPath, [npxCli, ...full], { stdio: 'inherit', ...opts })
  const quoted = full.map((a) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
  return spawnSync(['npx', ...quoted].join(' '), { stdio: 'inherit', shell: true, ...opts })
}

function readEnv(file) {
  if (!existsSync(file)) return []
  const out = []
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!value || SKIP.has(key)) continue
    out.push([key, value])
  }
  return out
}

say('Step 1 of 3: checking the site builds (about 30 seconds)')
const build = spawnSync('npm run build', { stdio: 'inherit', shell: true })
if (build.status !== 0) fail('The build failed. See the red text above for the reason.')

say('Step 2 of 3: signing in to Vercel')
const who = vercel(['whoami'], { stdio: ['ignore', 'ignore', 'ignore'] })
if (who.status !== 0) {
  console.log('A Vercel sign-in page will open in your browser. Sign in there, then come back to this window.')
  const login = vercel(['login'])
  if (login.status !== 0) fail('Sign-in did not finish. Run deploy.bat again to retry.')
} else {
  console.log('Already signed in.')
}

const env = readEnv('.env.local')
if (!env.some(([k]) => k === 'MANTLE_API_KEY')) console.log('Note: no Mantle key found in .env.local, so Quill will use offline answers.')
if (!env.some(([k]) => k === 'ELEVENLABS_API_KEY')) console.log('Note: no ElevenLabs key found in .env.local, so live answers will use the browser voice.')
const envArgs = []
for (const [key, value] of env) {
  envArgs.push('--env', `${key}=${value}`)
  // VITE_ switches are baked into the page when it is built.
  if (key.startsWith('VITE_')) envArgs.push('--build-env', `${key}=${value}`)
}
console.log(`Sending ${env.length} settings from .env.local (values are not shown).`)

say('Step 3 of 3: uploading Pass It On to Vercel (a few minutes)')
const deploy = vercel(['deploy', '--prod', '--yes', ...envArgs])
if (deploy.status !== 0) fail('The upload failed. See the text above for the reason.')

console.log('\n*** Pass It On is live! ***')
console.log('Done. The live address is shown after "Aliased".\n')
