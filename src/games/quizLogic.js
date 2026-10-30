import { shuffle } from './shuffle.js'

const MAX_DISTRACTORS = 3
const key = (text) => text.trim().toLowerCase()

// A distractor must not be a second correct answer: skip any candidate that shares the
// target's English text or Vietnamese meaning (the dataset has many such look-alikes).
export function buildQuestion(word, pool, direction, rng = Math.random) {
  const textOf = direction === 'vi2en' ? (w) => w.word : (w) => w.vi
  const answer = textOf(word)
  const seen = new Set([key(answer)])
  const distractors = []
  for (const candidate of shuffle(pool, rng)) {
    if (distractors.length === MAX_DISTRACTORS) break
    const text = textOf(candidate)
    const sameAsTarget = candidate.id === word.id
      || key(candidate.word) === key(word.word)
      || key(candidate.vi) === key(word.vi)
    if (sameAsTarget || seen.has(key(text))) continue
    seen.add(key(text))
    distractors.push(text)
  }
  return {
    prompt: direction === 'vi2en' ? word.vi : word.word,
    emoji: word.emoji ?? null,
    options: shuffle([answer, ...distractors], rng),
    answer,
  }
}
