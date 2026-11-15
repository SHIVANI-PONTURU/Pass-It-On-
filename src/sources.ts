/** Short, readable name for a source link. */
export function sourceLabel(url: string): string {
  if (url.includes('nssdc')) return 'NSSDCA'
  if (url.includes('science.nasa.gov')) return 'NASA Science'
  if (url.includes('ilrs.gsfc')) return 'NASA laser ranging'
  if (url.includes('gsfc.nasa.gov')) return 'NASA Goddard'
  if (url.includes('jpl.nasa.gov')) return 'NASA JPL'
  if (url.includes('ntrs.nasa.gov')) return 'NASA report'
  if (url.includes('appel.nasa.gov')) return 'NASA APPEL'
  if (url.includes('spaceplace.nasa.gov')) return 'NASA Space Place'
  if (url.includes('/history/') || url.includes('/static/history/')) return 'NASA History'
  if (url.includes('nasa.gov')) return 'NASA'
  if (url.includes('planetary.org')) return 'The Planetary Society'
  if (url.includes('lockheedmartin')) return 'Lockheed Martin'
  if (url.includes('wikipedia')) return 'Wikipedia'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** "$469 million", "$1.06 billion". */
export function formatUsd(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2).replace(/\.?0+$/, '')} billion`
  return `$${Math.round(usd / 1e6).toLocaleString('en-US')} million`
}
