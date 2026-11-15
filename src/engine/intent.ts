// Quick, free checks for what the kid meant. Anything else is treated as a question.
export type Intent = 'confused' | 'continue' | 'back' | 'repeat' | 'pause' | 'question'

export function classify(raw: string): Intent {
  const s = raw.toLowerCase().replace(/[.!?]+$/g, '').trim()
  if (!s) return 'continue'
  if (/^(what|huh|eh|hmm)$/.test(s)) return 'confused'
  if (/\b(i don'?t (get|understand)|huh|what does (that|it) mean|too hard|confus|simpler|explain (it|that)( again)?)\b/.test(s)) return 'confused'
  // Commands only count when they are short, so "Why didn't you come back to Earth?" is a question.
  const n = s.split(/\s+/).length
  if (n <= 4 && /\b(go back|previous|back)\b/.test(s)) return 'back'
  if (/^(carry on|keep going|go on|continue|next|ok(ay)?|yes|yeah|yep|sure|got it|play|go)\b/.test(s)) return 'continue'
  if (n <= 5 && /\b(repeat|say (that|it) again|one more time|again)\b/.test(s)) return 'repeat'
  if (/^(stop|wait|hold on|pause|shh)\b/.test(s)) return 'pause'
  return 'question'
}
