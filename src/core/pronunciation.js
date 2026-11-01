// Scores what the browser heard against what the child was asked to say. The recogniser gives several
// alternatives; the best one counts. This only tells whether the words were said, not which sound was off.

const SENTENCE_PASS = 0.8
const FUZZY_MIN_LENGTH = 5

export const normalizeText = (text) => String(text ?? '')
  .toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[^a-z0-9'\s-]/g, ' ')
  .replace(/-/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const words = (text) => normalizeText(text).split(' ').filter(Boolean)

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = keep
    }
  }
  return row[b.length]
}

const sameWord = (target, heard) => target === heard
  || (target.length >= FUZZY_MIN_LENGTH && editDistance(target, heard) <= 1)

// A word or short phrase matches when it equals the target ignoring case, punctuation, spaces and hyphens,
// or (for 5+ letters) is one letter off.
export function scoreWord(target, heard) {
  const squash = (text) => normalizeText(text).replace(/[\s-]/g, '')
  const goal = squash(target)
  const list = heard.filter((h) => normalizeText(h) !== '')
  const ok = list.some((h) => sameWord(goal, squash(h)))
  return { ok, heard: list[0] ?? '' }
}

// Longest common subsequence of target words found in the heard words, in order.
function matchedFlags(targetWords, heardWords) {
  const n = targetWords.length
  const m = heardWords.length
  const table = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = sameWord(targetWords[i], heardWords[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  const flags = new Array(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (sameWord(targetWords[i], heardWords[j])) {
      flags[i] = true
      i += 1
      j += 1
    } else if (table[i + 1][j] >= table[i][j + 1]) i += 1
    else j += 1
  }
  return flags
}

// A sentence passes when at least 80 % of its words are heard in order. `missing` lists the words not heard.
export function scoreSentence(target, heard) {
  const targetWords = words(target)
  let best = { ratio: 0, missing: targetWords, heard: '' }
  for (const text of heard) {
    const heardWords = words(text)
    if (heardWords.length === 0) continue
    const flags = matchedFlags(targetWords, heardWords)
    const ratio = targetWords.length === 0 ? 0 : flags.filter(Boolean).length / targetWords.length
    if (ratio > best.ratio || best.heard === '') {
      best = { ratio, missing: targetWords.filter((_, i) => !flags[i]), heard: text }
    }
  }
  return { ok: best.ratio >= SENTENCE_PASS, ratio: best.ratio, missing: best.missing, heard: best.heard }
}
