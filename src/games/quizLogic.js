import { shuffle } from './shuffle.js'

const MAX_DISTRACTORS = 3

export function buildQuestion(word, pool, direction, rng = Math.random) {
  const textOf = direction === 'vi2en' ? (w) => w.word : (w) => w.vi
  const answer = textOf(word)
  const seen = new Set([answer.toLowerCase()])
  const distractors = []
  for (const candidate of shuffle(pool, rng)) {
    if (distractors.length === MAX_DISTRACTORS) break
    const text = textOf(candidate)
    if (candidate.id === word.id || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    distractors.push(text)
  }
  return {
    prompt: direction === 'vi2en' ? word.vi : word.word,
    emoji: word.emoji ?? null,
    options: shuffle([answer, ...distractors], rng),
    answer,
  }
}
