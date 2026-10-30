import { daysBetween } from './date.js'
import { levelForXp } from './progress.js'
import { pickWords } from './srs.js'

const DEFAULT_SIZE = 10
const MAX_MATCH_WORDS = 6
const DAILY_EXTRA_MODES = ['listen', 'scramble', 'match']

export function playerLevelToWordLevel(xpLevel) {
  if (xpLevel >= 7) return 3
  if (xpLevel >= 4) return 2
  return 1
}

const stepFor = (mode, words) => ({ mode, words: mode === 'match' ? words.slice(0, MAX_MATCH_WORDS) : words })

function describe(words, progress) {
  return { words, newWords: words.filter((w) => !progress.cards[w.id]) }
}

export function buildDailySession({ vocab, progress, today, size = DEFAULT_SIZE }) {
  const level = playerLevelToWordLevel(levelForXp(progress.xp))
  const words = pickWords({ words: vocab, cards: progress.cards, today, level, count: size })
  const { newWords } = describe(words, progress)
  const dayIndex = Math.abs(daysBetween('2026-01-01', today))
  const steps = []
  if (newWords.length) steps.push(stepFor('flashcard', newWords))
  steps.push(stepFor('quiz', words))
  steps.push(stepFor(DAILY_EXTRA_MODES[dayIndex % DAILY_EXTRA_MODES.length], words))
  return { words, newWords, steps }
}

export function buildTopicSession({ vocab, topic, progress, today, size = DEFAULT_SIZE }) {
  const topicWords = pickWords({
    words: vocab.filter((w) => w.topic === topic),
    cards: progress.cards,
    today,
    level: 3,
    count: size,
  })
  const padding = topicWords.length >= size ? [] : pickWords({
    words: vocab.filter((w) => w.topic !== topic),
    cards: progress.cards,
    today,
    level: playerLevelToWordLevel(levelForXp(progress.xp)),
    count: size - topicWords.length,
  })
  const words = [...topicWords, ...padding]
  const { newWords } = describe(words, progress)
  const steps = ['flashcard', 'quiz', 'listen', 'scramble', 'match'].map((mode) => stepFor(mode, words))
  return { words, newWords, steps }
}
