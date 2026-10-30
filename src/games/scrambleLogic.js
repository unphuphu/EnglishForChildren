import { shuffle } from './shuffle.js'

const isSeparator = (c) => c === ' ' || c === '-'
export const lettersOf = (word) => [...word].filter((c) => !isSeparator(c))

export function scramble(word, rng = Math.random) {
  const letters = lettersOf(word)
  if (letters.length <= 1 || new Set(letters.map((c) => c.toLowerCase())).size === 1) return letters
  const original = letters.join('')
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = shuffle(letters, rng)
    if (candidate.join('') !== original) return candidate
  }
  return [...letters.slice(1), letters[0]]
}

export function assemble(word, chosen) {
  let used = 0
  let out = ''
  for (const ch of word) {
    if (isSeparator(ch)) {
      if (used < chosen.length) out += ch
    } else if (used < chosen.length) {
      out += chosen[used]
      used += 1
    }
  }
  return out
}
