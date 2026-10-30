import { shuffle } from './shuffle.js'

export const MAX_MATCH_WORDS = 6

export function buildMatchBoard(words, rng = Math.random) {
  const cards = words.slice(0, MAX_MATCH_WORDS).flatMap((w) => [
    { id: `${w.id}:en`, wordId: w.id, kind: 'en', text: w.word },
    { id: `${w.id}:vi`, wordId: w.id, kind: 'vi', text: w.vi },
  ])
  return shuffle(cards, rng)
}
