import { shuffle } from '../games/shuffle.js'
import { LESSON } from './config.js'

const TYPES = ['order', 'blank', 'choose', 'translate']
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A used word can match several vocabulary entries (the same English word in different topics);
// only the entries the child has learned count, so the exercise never credits an unlearned word.
export function resolveWordIds(sentence, vocab, learnedIds) {
  const ids = []
  for (const use of sentence.uses) {
    const matches = vocab.filter((w) => w.word.toLowerCase() === use.toLowerCase() && learnedIds.has(w.id))
    if (matches.length === 0) return null
    ids.push(...matches.map((w) => w.id))
  }
  return ids
}

export function eligibleSentences({ lesson, vocab, cards, extraWordIds = [] }) {
  const learned = new Set([...Object.keys(cards), ...extraWordIds])
  return lesson.sentences.filter((s) => resolveWordIds(s, vocab, learned) !== null)
}

export function pickSentences({
  lessons, lessonId, part, vocab, progress, extraWordIds = [], today, count = LESSON.SENTENCES, rng = Math.random,
}) {
  const { cards } = progress
  const learned = new Set([...Object.keys(cards), ...extraWordIds])
  const candidates = (lesson) => lesson.sentences
    .map((sentence) => {
      const wordIds = resolveWordIds(sentence, vocab, learned)
      return wordIds ? { sentence, lessonId: lesson.id, wordIds } : null
    })
    .filter(Boolean)

  const score = ({ sentence, wordIds }) => {
    const due = wordIds.filter((id) => cards[id]?.due != null && cards[id].due <= today).length
    const weak = wordIds.filter((id) => cards[id] && cards[id].wrong > cards[id].correct).length
    const seen = progress.grammar.sentences[sentence.id]?.seen ?? 0
    return 2 * due + weak + (seen === 0 ? 1 : 0) - 0.5 * seen
  }
  const rank = (items) => shuffle(items, rng)
    .map((item) => ({ item, score: score(item) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)

  if (lessonId === null) {
    const finished = lessons.filter((l) => (progress.grammar.lessons[l.id]?.partsDone ?? 0) >= 1)
    return rank(finished.flatMap(candidates)).slice(0, count)
  }

  const lesson = lessons.find((l) => l.id === lessonId)
  if (!lesson) return []
  const all = candidates(lesson)
  if (part === null) return rank(all).slice(0, count)

  const current = rank(all.filter((i) => i.sentence.session === part))
  // Part 1 reviews the lessons finished before this one; later parts review this lesson's earlier parts.
  const earlier = part === 1
    ? rank(lessons
      .filter((l) => l.order < lesson.order && (progress.grammar.lessons[l.id]?.partsDone ?? 0) >= 1)
      .flatMap(candidates))
    : rank(all.filter((i) => i.sentence.session < part))
  const wantCurrent = earlier.length === 0 ? count : Math.min(LESSON.CURRENT_PART, count)
  const chosenCurrent = current.slice(0, wantCurrent)
  const result = [...chosenCurrent, ...earlier.slice(0, count - chosenCurrent.length)]
  if (result.length < count) {
    result.push(...current.slice(chosenCurrent.length, chosenCurrent.length + count - result.length))
  }
  return result
}

const supports = {
  // two sentences in one text (a question and its answer) could be put together in another order
  order: (s) => s.en.split(' ').length >= 3 && !/[.?!]\s+\S/.test(s.en),
  blank: (s) => Array.isArray(s.blank?.options) && s.blank.options.length >= 2,
  choose: (s) => Array.isArray(s.wrong) && s.wrong.length >= 2,
  translate: () => true,
}

export function assignTypes(sentences) {
  return sentences.map((sentence, i) => {
    for (let k = 0; k < TYPES.length; k++) {
      const type = TYPES[(i + k) % TYPES.length]
      if (supports[type](sentence)) return type
    }
    return 'translate'
  })
}

function shuffledDifferent(tokens, rng) {
  const original = tokens.join(' ')
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = shuffle(tokens, rng)
    if (candidate.join(' ') !== original) return candidate
  }
  return [...tokens.slice(1), tokens[0]]
}

export function buildExercise(sentence, lessonId, type, wordIds, rng = Math.random) {
  const base = { type, sentenceId: sentence.id, lessonId, en: sentence.en, vi: sentence.vi, wordIds }
  switch (type) {
    case 'order':
      return { ...base, tokens: shuffledDifferent(sentence.en.split(' '), rng) }
    case 'blank': {
      const { answer, options } = sentence.blank
      const gap = new RegExp(`\\b${escapeRegExp(answer)}\\b`, 'i')
      return { ...base, text: sentence.en.replace(gap, '___'), answer, options: shuffle(options, rng) }
    }
    case 'choose': {
      const wrongs = shuffle([...new Set(sentence.wrong)].filter((w) => w !== sentence.en), rng).slice(0, 3)
      return { ...base, answer: sentence.en, options: shuffle([sentence.en, ...wrongs], rng) }
    }
    case 'translate':
      return { ...base, prompt: sentence.vi, tokens: shuffle([...sentence.en.split(' '), ...sentence.extra], rng) }
    default:
      throw new Error('UNKNOWN_EXERCISE_TYPE')
  }
}
