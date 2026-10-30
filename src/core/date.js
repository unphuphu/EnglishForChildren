const pad = (n) => String(n).padStart(2, '0')
const toUTC = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDays(iso, n) {
  const date = new Date(toUTC(iso) + n * 86400000)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function daysBetween(a, b) {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000)
}
