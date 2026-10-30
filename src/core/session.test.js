import { buildDailySession, buildTopicSession, playerLevelToWordLevel } from './session.js'
import { emptyProgress } from './progress.js'

const TODAY = '2026-10-30'
const mk = (topic, n, level = 1) =>
  Array.from({ length: n }, (_, i) => ({ id: `${topic}-${String(i + 1).padStart(3, '0')}`, word: `${topic}${i}`, topic, level }))
const vocab = [...mk('animals', 30, 1), ...mk('food', 30, 1), ...mk('hard', 10, 3)]
const nonFlashcard = (session) => session.steps.filter((s) => s.mode !== 'flashcard')

test('XP levels map to word levels 1, 2 and 3', () => {
  expect([1, 3, 4, 6, 7, 20].map(playerLevelToWordLevel)).toEqual([1, 1, 2, 2, 3, 3])
})

test('a fresh profile gets 10 level-1 words and a flashcard step covering all of them', () => {
  const s = buildDailySession({ vocab, progress: emptyProgress(), today: TODAY })
  expect(s.words).toHaveLength(10)
  expect(s.words.every((w) => w.level === 1)).toBe(true)
  expect(s.newWords).toHaveLength(10)
  expect(s.steps[0].mode).toBe('flashcard')
  expect(s.steps[0].words.map((w) => w.id).sort()).toEqual(s.words.map((w) => w.id).sort())
})

test('due words are chosen before unseen ones and are not shown as new', () => {
  const progress = emptyProgress()
  progress.cards['food-005'] = { box: 1, correct: 1, wrong: 0, due: '2026-10-29' }
  const s = buildDailySession({ vocab, progress, today: TODAY })
  expect(s.words[0].id).toBe('food-005')
  expect(s.newWords.map((w) => w.id)).not.toContain('food-005')
})

test('with no new words there is no flashcard step', () => {
  const progress = emptyProgress()
  for (const w of vocab.filter((x) => x.level === 1)) progress.cards[w.id] = { box: 1, correct: 1, wrong: 0, due: TODAY }
  const s = buildDailySession({ vocab, progress, today: TODAY })
  expect(s.steps.some((x) => x.mode === 'flashcard')).toBe(false)
})

test('every word appears in at least one non-flashcard step and no step repeats a word', () => {
  const s = buildDailySession({ vocab, progress: emptyProgress(), today: TODAY })
  const covered = new Set(nonFlashcard(s).flatMap((x) => x.words.map((w) => w.id)))
  for (const w of s.words) expect(covered.has(w.id)).toBe(true)
  for (const step of s.steps) {
    expect(new Set(step.words.map((w) => w.id)).size).toBe(step.words.length)
  }
})

test('a match step never exceeds 6 words, on any day of a week', () => {
  for (let d = 24; d <= 30; d++) {
    const s = buildDailySession({ vocab, progress: emptyProgress(), today: `2026-10-${d}` })
    for (const step of s.steps.filter((x) => x.mode === 'match')) expect(step.words.length).toBeLessThanOrEqual(6)
  }
})

test('the size option limits the session', () => {
  expect(buildDailySession({ vocab, progress: emptyProgress(), today: TODAY, size: 5 }).words).toHaveLength(5)
})

test('a small vocabulary returns what exists without repeating words', () => {
  const s = buildDailySession({ vocab: mk('tiny', 4), progress: emptyProgress(), today: TODAY })
  expect(s.words).toHaveLength(4)
})

test('a topic session offers every mode as its own step', () => {
  const s = buildTopicSession({ vocab, topic: 'animals', progress: emptyProgress(), today: TODAY })
  expect(s.steps.map((x) => x.mode).sort()).toEqual(['flashcard', 'listen', 'match', 'quiz', 'scramble'])
  expect(s.words.every((w) => w.topic === 'animals')).toBe(true)
})

test('a topic with only 4 words is padded to 10 distinct words from other topics at the same level', () => {
  const small = [...mk('tiny', 4, 1), ...mk('food', 30, 1), ...mk('hard', 10, 3)]
  const s = buildTopicSession({ vocab: small, topic: 'tiny', progress: emptyProgress(), today: TODAY })
  expect(s.words).toHaveLength(10)
  expect(new Set(s.words.map((w) => w.id)).size).toBe(10)
  expect(s.words.filter((w) => w.topic === 'hard')).toHaveLength(0)
  expect(s.words.filter((w) => w.topic === 'tiny')).toHaveLength(4)
})

test('topic play includes words of every level in that topic', () => {
  const s = buildTopicSession({ vocab, topic: 'hard', progress: emptyProgress(), today: TODAY })
  expect(s.words.filter((w) => w.topic === 'hard')).toHaveLength(10)
})
