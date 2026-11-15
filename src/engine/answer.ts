import type { Machine } from '../types'

export type Answer = { text: string; sourceUrl?: string; from: 'agent' | 'local' }

const STOP = new Set(['what', 'your', 'you', 'are', 'the', 'was', 'were', 'did', 'does', 'how', 'why', 'this', 'that', 'with', 'have', 'from', 'about', 'there', 'they', 'when', 'where', 'who', 'can', 'tell'])

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
}

function overlap(a: string, b: string): number {
  const bw = new Set(words(b))
  return words(a).filter((w) => bw.has(w)).length
}

/** Answer from the machine's own NASA facts. Returns null if nothing fits. */
export function localAnswer(m: Machine, question: string): string | null {
  const q = question.toLowerCase()
  const chips = m.chips.filter((c) => !c.verify)

  const exact = chips.find((c) => c.q.toLowerCase() === q.trim())
  if (exact) return exact.a

  const chip = (re: RegExp) => chips.find((c) => re.test(c.q.toLowerCase()))?.a
  const rows = (re: RegExp) => m.card.filter((r) => re.test(r.label.toLowerCase()))

  if (/left behind|leave you|bring you (home|back)|come (home|back)|why .*(still )?there/.test(q)) {
    const a = chip(/left behind/)
    if (a) return a
  }
  if (/still (work|alive|on|awake)|are you (working|alive|on|awake|dead|asleep|sleeping)/.test(q)) {
    const a = chip(/still working/)
    if (a) return a
  }
  if (/what (are|is) (you|this|that)|who are you|tell me about (you|yourself|this)/.test(q)) {
    return m.story[0].text
  }
  if (/\bwhere\b/.test(q)) {
    const r = rows(/where|home|landed/)
    if (r.length) return r.map((x) => `${x.label}: ${x.value}.`).join(' ')
  }
  if (/\bwhen\b/.test(q)) {
    const r = rows(/landed|launched|last|stopped|switched/)
    if (r.length) return r.map((x) => `${x.label}: ${x.value}.`).join(' ')
  }
  if (/heavy|weigh|big|size|how large/.test(q)) {
    const r = rows(/weight|size/)
    if (r.length) return r.map((x) => `${x.label}: ${x.value}.`).join(' ')
  }
  if (/lesson|teach|learn|pass/.test(q)) {
    return `Here's the lesson I'm passing on: ${m.lesson.text} ${m.lesson.nextMission}`
  }

  // Closest question chip, then closest story line.
  let best: { score: number; text: string } = { score: 0, text: '' }
  for (const c of chips) {
    const s = overlap(question, c.q + ' ' + c.a)
    if (s > best.score) best = { score: s, text: c.a }
  }
  for (const line of m.story) {
    const s = overlap(question, line.text)
    if (s > best.score) best = { score: s, text: line.text }
  }
  return best.score >= 1 ? best.text : null
}

// Only used when the AI agent can't be reached (no internet, or the agent is switched off).
export function fallbackAnswer(m: Machine): string {
  void m
  return "That's a great question! My radio link is a bit crackly right now, so I can't think of the answer. Can you ask me again in a moment?"
}

/**
 * Answer a question. With VITE_USE_AGENT=true this asks /api/ask (an LLM that may only use
 * this machine's NASA facts); if that is off, slow or fails, it answers from the facts locally.
 */
export async function answerQuestion(m: Machine, question: string, currentLine: string, simple = false): Promise<Answer> {
  const local = localAnswer(m, question)
  if (import.meta.env.VITE_USE_AGENT === 'true') {
    try {
      const ctrl = new AbortController()
      const timer = window.setTimeout(() => ctrl.abort(), 9000)
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ machineId: m.id, question, currentLine, simple }),
        signal: ctrl.signal,
      })
      window.clearTimeout(timer)
      if (res.ok) {
        const json = (await res.json()) as { answer?: string | null; sourceUrl?: string }
        if (json.answer) return { text: json.answer, sourceUrl: json.sourceUrl, from: 'agent' }
      }
    } catch {
      /* fall back to the local answer */
    }
  }
  return { text: local ?? fallbackAnswer(m), from: 'local' }
}
