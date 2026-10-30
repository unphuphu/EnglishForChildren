import { ASSESSMENT, BADGES } from './config.js'
import { assignTypes, buildExercise, pickSentences } from './sentences.js'
import { shuffle } from '../games/shuffle.js'

const { GROUP_SIZE } = ASSESSMENT
const ALL = Number.MAX_SAFE_INTEGER

export const groupOf = (lessonOrder) => Math.ceil(lessonOrder / GROUP_SIZE)

const lessonsOfGroup = (group, lessons) => lessons.filter((l) => groupOf(l.order) === group)

export function isGroupComplete({ group, lessons, progress }) {
  const inGroup = lessonsOfGroup(group, lessons)
  return inGroup.length === GROUP_SIZE
    && inGroup.every((l) => (progress.grammar.lessons[l.id]?.partsDone ?? 0) >= l.sessions)
}

export const passedCheckpoint = (score, total) => total > 0 && score / total >= ASSESSMENT.CHECKPOINT_PASS

function exercisesFrom(picks, rng) {
  const types = assignTypes(picks.map((p) => p.sentence))
  return picks.map((p, i) => buildExercise(p.sentence, p.lessonId, types[i], p.wordIds, rng))
}

// 15 sentences mixed across the lessons of the group (taken in turns so every lesson appears),
// only from words the child has learned; fewer than 10 usable sentences gives no test.
export function buildCheckpoint({ group, lessons, vocab, progress, today, rng = Math.random }) {
  const ranked = lessonsOfGroup(group, lessons).map((lesson) => pickSentences({
    lessons: [lesson], lessonId: lesson.id, part: null, vocab, progress, today, count: ALL, rng,
  }))
  const picks = []
  for (let round = 0; picks.length < ASSESSMENT.CHECKPOINT_QUESTIONS; round++) {
    const before = picks.length
    for (const list of ranked) {
      if (picks.length < ASSESSMENT.CHECKPOINT_QUESTIONS && list[round]) picks.push(list[round])
    }
    if (picks.length === before) break
  }
  if (picks.length < ASSESSMENT.CHECKPOINT_MIN) return []
  return exercisesFrom(shuffle(picks, rng), rng)
}

// Learned words, due ones first, then the weakest, ties broken at random.
function rankLearned(vocab, cards, today, rng) {
  const learned = shuffle(vocab.filter((w) => cards[w.id]), rng)
  const due = (w) => (cards[w.id].due != null && cards[w.id].due <= today ? 0 : 1)
  return learned.sort((a, b) => due(a) - due(b) || cards[a.id].box - cards[b.id].box)
}

// 10 vocabulary words and 10 sentences; when fewer sentences exist the vocabulary part
// takes the remaining places so the test keeps its size (20 questions).
export function buildGeneralTest({ lessons, vocab, progress, today, rng = Math.random }) {
  const learnedCount = vocab.filter((w) => progress.cards[w.id]).length
  if (learnedCount < ASSESSMENT.TEST_MIN_WORDS) return null
  const picks = pickSentences({
    lessons, lessonId: null, part: null, vocab, progress, today, count: ASSESSMENT.TEST_GRAMMAR, rng,
  })
  const vocabCount = ASSESSMENT.TEST_VOCAB + (ASSESSMENT.TEST_GRAMMAR - picks.length)
  return {
    vocabWords: rankLearned(vocab, progress.cards, today, rng).slice(0, vocabCount),
    exercises: exercisesFrom(picks, rng),
  }
}

export function rateScore(score, total) {
  const ratio = total > 0 ? score / total : 0
  const found = ASSESSMENT.RATINGS.find(([min]) => ratio >= min)
  return found ? found[1] : ASSESSMENT.LOWEST_RATING
}

export function weakAreas({ vocabResults, sentenceResults, lessons, vocab }) {
  const lessonIds = [...new Set(sentenceResults.filter((r) => !r.correct).map((r) => r.lessonId))]
  const wordIds = [...new Set(vocabResults.filter((r) => !r.correct).map((r) => r.wordId))]
  return {
    lessons: lessonIds
      .map((id) => lessons.find((l) => l.id === id))
      .filter(Boolean)
      .map((l) => ({ id: l.id, title: l.title })),
    words: wordIds.map((id) => vocab.find((w) => w.id === id)).filter(Boolean),
  }
}

const groupBadges = (state) => Object.entries(state.grammar.checkpoints)
  .filter(([, c]) => passedCheckpoint(c.best, c.total))
  .map(([group]) => `grammar-group-${group}`)

export function recordAssessment(state, { kind, group, score, total, date }) {
  const grammar = { ...state.grammar, checkpoints: { ...state.grammar.checkpoints } }
  if (kind === 'checkpoint') {
    const previous = grammar.checkpoints[group]
    const better = !previous || score / total > previous.best / previous.total
    grammar.checkpoints[group] = better ? { best: score, total } : previous
  } else {
    grammar.tests = [...grammar.tests, { date, score, total }].slice(-ASSESSMENT.TEST_HISTORY)
  }
  const next = { ...state, grammar }
  const earned = [...BADGES.filter((b) => b.test(next)).map((b) => b.id), ...groupBadges(next)]
  const newBadges = earned.filter((id) => !state.badges.includes(id))
  return { state: { ...next, badges: [...state.badges, ...newBadges] }, newBadges }
}
