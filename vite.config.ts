import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'

/** Read KEY=value lines from an env file (works on every Node version). */
function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  let text = ''
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return out
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!m) continue
    out[m[1]] = /^(['"]).*\1$/.test(m[2]) ? m[2].slice(1, -1) : m[2]
  }
  return out
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/** Runs the Vercel functions in api/ inside the dev server, so `npm run dev` works without the Vercel CLI. */
function apiDev(): Plugin {
  return {
    name: 'pass-it-on-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = /^\/api\/(ask|speak)$/.exec(req.url?.split('?')[0] ?? '')
        if (!route) return next()
        try {
          const mod = (await server.ssrLoadModule(`/api/${route[1]}.ts`)) as Record<string, unknown>
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.end()
            return
          }
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          headers.set('x-forwarded-for', req.socket.remoteAddress ?? 'local')
          const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)
          const request = new Request(new URL(req.url ?? '/', 'http://localhost'), { method: req.method, headers, body })
          const response = (await handler(request)) as Response
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

/**
 * Developer helper, only inside `npm run dev` and only for requests from this computer:
 * /__dev/run/<name> runs one of the project's own scripts and returns what it printed,
 * so the set-up scripts can be checked from a browser. Never part of the built website.
 * The scripts read keys from .env.local themselves and never print them.
 */
const DEV_SCRIPTS: Record<string, string[]> = {
  art: ['scripts/gen-art.mjs'],
  'art-dry': ['scripts/gen-art.mjs', '--dry-run'],
  voice: ['scripts/gen-voice.mjs'],
  'voice-dry': ['scripts/gen-voice.mjs', '--dry-run'],
  setup: ['scripts/setup.mjs'],
  models: ['scripts/setup.mjs', '--list-models'],
  'use-model': ['scripts/setup.mjs', '--mantle-only'],
}
function devRunner(): Plugin {
  return {
    name: 'pass-it-on-dev-runner',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /^\/__dev\/run\/([a-z-]+)$/.exec(req.url?.split('?')[0] ?? '')
        if (!m) return next()
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
        const script = DEV_SCRIPTS[m[1]]
        if (!local || !script) {
          res.statusCode = 403
          res.end('Not allowed')
          return
        }
        const q = new URL(req.url ?? '/', 'http://localhost').searchParams
        const extra: string[] = []
        if (m[1] === 'art' && q.get('force') === '1') extra.push('--force')
        const only = q.get('only')
        if (m[1] === 'art' && only && /^[a-z-]+$/.test(only)) extra.push('--only', only)
        const model = q.get('model')
        if (m[1] === 'use-model') {
          if (!model || !/^[A-Za-z0-9._:/-]+$/.test(model)) {
            res.statusCode = 400
            res.end('Give ?model=<model id>')
            return
          }
          extra.push('--model', model)
        }
        execFile(process.execPath, [...script, ...extra], { cwd: process.cwd(), timeout: 600_000, maxBuffer: 4_000_000 }, (err, stdout, stderr) => {
          res.setHeader('content-type', 'text/plain; charset=utf-8')
          res.end(`${stdout}${stderr}${err && !stdout && !stderr ? String(err.message) : ''}`)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make .env.local values (including server-only keys) visible to api/ functions during dev.
  // Only VITE_ variables ever reach the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v
  // When .env.local changes, the dev server reloads this config in the same process: let the new values win.
  Object.assign(process.env, readEnvFile('.env.local'))
  return {
    plugins: [react(), tailwindcss(), apiDev(), devRunner()],
  }
})
