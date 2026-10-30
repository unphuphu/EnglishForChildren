import { shuffle } from './shuffle.js'

export const MAX_MATCH_WORDS = 6
const key = (text) => text.trim().toLowerCase()

// Words that repeat an earlier word's English text or Vietnamese meaning are dropped,
// so the board never holds look-alike pairs.
export function buildMatchBoard(words, rng = Math.random) {
  const seenWords = new Set()
  const seenMeanings = new Set()
  const unique = words.filter((w) => {
    if (seenWords.has(key(w.word)) || seenMeanings.has(key(w.vi))) return false
    seenWords.add(key(w.word))
    seenMeanings.add(key(w.vi))
    return true
  })
  const cards = unique.slice(0, MAX_MATCH_WORDS).flatMap((w) => [
    { id: `${w.id}:en`, wordId: w.id, kind: 'en', text: w.word },
    { id: `${w.id}:vi`, wordId: w.id, kind: 'vi', text: w.vi },
  ])
  return shuffle(cards, rng)
}
