import {
  groupOf, isGroupComplete, buildCheckpoint, buildGeneralTest, rateScore, weakAreas, recordAssessment, passedCheckpoint,
} from './assessment.js'
import { emptyProgress } from './progress.js'

const TODAY = '2026-10-30'

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const vocab = Array.from({ length: 60 }, (_, i) => ({ id: `w${i}`, word: `w${i}`, vi: `nghĩa ${i}`, topic: 't', level: 1 }))
const sentence = (id, session, word) => ({
  id, en: `She likes the ${word} very much.`, vi: 'Cô ấy rất thích.', uses: [word], session,
  blank: { answer: 'likes', options: ['likes', 'like', 'liking'] },
  wrong: ['She like the thing very much.', 'She liking the thing very much.'], extra: ['has', 'are'],
})
const lesson = (order, perLesson = 6, sessions = 1) => ({
  id: `l${order}`, title: `Lesson ${order}`, order, sessions, explain: [],
  sentences: Array.from({ length: perLesson }, (_, j) => sentence(`l${order}-${j}`, 1, `w${(order - 1) * 6 + j}`)),
})
const lessonsUpTo = (n, perLesson) => Array.from({ length: n }, (_, i) => lesson(i + 1, perLesson))
const cardsFor = (ids, over = {}) => Object.fromEntries(ids.map((id) => [id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01', ...over }]))
const allIds = vocab.map((w) => w.id)
const finished = (...orders) => ({
  ...emptyProgress().grammar,
  lessons: Object.fromEntries(orders.map((o) => [`l${o}`, { partsDone: 1, correct: 0, wrong: 0 }])),
})
const progress = (cards, grammar = emptyProgress().grammar) => ({ ...emptyProgress(), cards, grammar })

describe('groups', () => {
  test('groups hold five lessons each', () => {
    expect([1, 5, 6, 10, 11].map(groupOf)).toEqual([1, 1, 2, 2, 3])
  })

  test('a group is complete only with five lessons that are all finished', () => {
    expect(isGroupComplete({ group: 1, lessons: lessonsUpTo(4), progress: progress({}, finished(1, 2, 3, 4)) })).toBe(false)
    expect(isGroupComplete({ group: 1, lessons: lessonsUpTo(5), progress: progress({}, finished(1, 2, 3, 4)) })).toBe(false)
    expect(isGroupComplete({ group: 1, lessons: lessonsUpTo(5), progress: progress({}, finished(1, 2, 3, 4, 5)) })).toBe(true)
  })

  test('a lesson with two sessions needs both parts', () => {
    const lessons = [...lessonsUpTo(4), lesson(5, 6, 2)]
    const grammar = finished(1, 2, 3, 4, 5)
    expect(isGroupComplete({ group: 1, lessons, progress: progress({}, grammar) })).toBe(false)
    grammar.lessons.l5.partsDone = 2
    expect(isGroupComplete({ group: 1, lessons, progress: progress({}, grammar) })).toBe(true)
  })

  test('group 2 with only lesson 6 is not complete', () => {
    expect(isGroupComplete({ group: 2, lessons: lessonsUpTo(6), progress: progress({}, finished(1, 2, 3, 4, 5, 6)) })).toBe(false)
  })

  test('a group that does not exist is not complete', () => {
    expect(isGroupComplete({ group: 9, lessons: lessonsUpTo(5), progress: progress({}, finished(1, 2, 3, 4, 5)) })).toBe(false)
  })
})

describe('buildCheckpoint', () => {
  const build = (lessons, cards, over = {}) => buildCheckpoint({
    group: 1, lessons, vocab, progress: progress(cards, finished(1, 2, 3, 4, 5)), today: TODAY, rng: seeded(1), ...over,
  })

  test('gives 15 distinct sentences mixed across the five lessons', () => {
    const exercises = build(lessonsUpTo(5), cardsFor(allIds))
    expect(exercises).toHaveLength(15)
    expect(new Set(exercises.map((e) => e.sentenceId)).size).toBe(15)
    expect(new Set(exercises.map((e) => e.lessonId)).size).toBe(5)
  })

  test('uses all four exercise types', () => {
    const types = new Set(build(lessonsUpTo(5), cardsFor(allIds)).map((e) => e.type))
    expect(types).toEqual(new Set(['order', 'blank', 'choose', 'translate']))
  })

  test('only draws sentences whose words are learned', () => {
    const learned = cardsFor(allIds.slice(0, 20))
    const exercises = build(lessonsUpTo(5), learned)
    for (const e of exercises) for (const id of e.wordIds) expect(learned[id]).toBeDefined()
  })

  test('with only 12 eligible sentences it gives those 12', () => {
    // lesson 1 uses w0-w5 and lesson 2 uses w6-w11, so exactly 12 sentences qualify
    expect(build(lessonsUpTo(5), cardsFor(allIds.slice(0, 12)))).toHaveLength(12)
  })

  test('with fewer than 10 eligible sentences it gives none', () => {
    expect(build(lessonsUpTo(5), cardsFor(allIds.slice(0, 9)))).toEqual([])
  })

  test('only the lessons of the requested group are used', () => {
    const lessons = lessonsUpTo(10)
    const exercises = buildCheckpoint({
      group: 2, lessons, vocab, progress: progress(cardsFor(allIds), finished(6, 7, 8, 9, 10)), today: TODAY, rng: seeded(2),
    })
    expect(exercises).toHaveLength(15)
    for (const e of exercises) expect(['l6', 'l7', 'l8', 'l9', 'l10']).toContain(e.lessonId)
  })

  test('the same seed gives the same questions', () => {
    const a = build(lessonsUpTo(5), cardsFor(allIds), { rng: seeded(5) })
    const b = build(lessonsUpTo(5), cardsFor(allIds), { rng: seeded(5) })
    expect(a.map((e) => [e.sentenceId, e.type])).toEqual(b.map((e) => [e.sentenceId, e.type]))
  })
})

describe('buildGeneralTest', () => {
  const build = (cards, grammar, lessons = lessonsUpTo(5), rng = seeded(3)) =>
    buildGeneralTest({ lessons, vocab, progress: progress(cards, grammar), today: TODAY, rng })

  test('splits into 10 vocabulary words and 10 sentences', () => {
    const test = build(cardsFor(allIds), finished(1, 2, 3))
    expect(test.vocabWords).toHaveLength(10)
    expect(test.exercises).toHaveLength(10)
  })

  test('without a studied lesson all 20 questions are vocabulary', () => {
    const test = build(cardsFor(allIds))
    expect(test.vocabWords).toHaveLength(20)
    expect(test.exercises).toEqual([])
  })

  test('is not available with fewer than 10 learned words', () => {
    expect(build(cardsFor(allIds.slice(0, 9)), finished(1))).toBeNull()
    expect(build({}, finished(1))).toBeNull()
  })

  test('with fewer than 10 usable sentences the vocabulary part fills up to 20 questions', () => {
    const test = build(cardsFor(allIds.slice(0, 12)), finished(1), [lesson(1, 4)])
    expect(test.exercises).toHaveLength(4)
    expect(test.vocabWords).toHaveLength(12)
    expect(test.vocabWords.length + test.exercises.length).toBeLessThanOrEqual(20)
  })

  test('with only 10 learned words the vocabulary part uses all of them', () => {
    const test = build(cardsFor(allIds.slice(0, 10)))
    expect(test.vocabWords).toHaveLength(10)
  })

  test('due words come first and nothing is repeated', () => {
    const cards = { ...cardsFor(allIds.slice(0, 30)), w25: { box: 1, correct: 1, wrong: 0, due: '2026-10-29' } }
    const test = build(cards)
    expect(test.vocabWords.map((w) => w.id)).toContain('w25')
    const ids = test.vocabWords.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('only lessons with a finished part contribute sentences', () => {
    const test = build(cardsFor(allIds), finished(2))
    for (const e of test.exercises) expect(e.lessonId).toBe('l2')
  })
})

describe('rateScore', () => {
  test.each([
    [20, 20, 'Xuất sắc'], [18, 20, 'Xuất sắc'], [17, 20, 'Tốt'], [14, 20, 'Tốt'],
    [13, 20, 'Khá'], [10, 20, 'Khá'], [9, 20, 'Cần cố gắng thêm'], [0, 20, 'Cần cố gắng thêm'],
  ])('%i of %i is %s', (score, total, label) => {
    expect(rateScore(score, total)).toBe(label)
  })

  test('a test with no questions is not a good score', () => {
    expect(rateScore(0, 0)).toBe('Cần cố gắng thêm')
  })
})

describe('passedCheckpoint', () => {
  test('passes from 70 percent', () => {
    expect(passedCheckpoint(11, 15)).toBe(true)
    expect(passedCheckpoint(10, 15)).toBe(false)
    expect(passedCheckpoint(0, 0)).toBe(false)
  })
})

describe('weakAreas', () => {
  const lessons = [lesson(1), lesson(2)]
  const sr = (lessonId, correct, sentenceId = `${lessonId}-x`) => ({ sentenceId, lessonId, wordIds: [], correct })

  test('lists lessons and words answered wrong, each once', () => {
    const out = weakAreas({
      vocabResults: [{ wordId: 'w1', correct: false }, { wordId: 'w1', correct: false }, { wordId: 'w2', correct: true }],
      sentenceResults: [sr('l2', false), sr('l2', false, 'other'), sr('l1', true)],
      lessons, vocab,
    })
    expect(out.lessons).toEqual([{ id: 'l2', title: 'Lesson 2' }])
    expect(out.words.map((w) => w.id)).toEqual(['w1'])
  })

  test('nothing is weak when everything is right', () => {
    const out = weakAreas({ vocabResults: [{ wordId: 'w1', correct: true }], sentenceResults: [sr('l1', true)], lessons, vocab })
    expect(out).toEqual({ lessons: [], words: [] })
  })

  test('unknown ids are ignored instead of crashing', () => {
    const out = weakAreas({ vocabResults: [{ wordId: 'ghost', correct: false }], sentenceResults: [sr('ghost', false)], lessons, vocab })
    expect(out).toEqual({ lessons: [], words: [] })
  })
})

describe('recordAssessment', () => {
  const rec = (state, over) => recordAssessment(state, { kind: 'checkpoint', group: 1, score: 11, total: 15, date: TODAY, ...over })

  test('a checkpoint at 11/15 passes and awards the group badge', () => {
    const out = rec(emptyProgress())
    expect(out.newBadges).toContain('grammar-group-1')
    expect(out.state.badges).toContain('grammar-group-1')
    expect(out.state.grammar.checkpoints[1]).toEqual({ best: 11, total: 15 })
  })

  test('a checkpoint at 10/15 does not pass', () => {
    const out = rec(emptyProgress(), { score: 10 })
    expect(out.newBadges).not.toContain('grammar-group-1')
    expect(out.state.grammar.checkpoints[1]).toEqual({ best: 10, total: 15 })
  })

  test('the best checkpoint score is kept', () => {
    const first = rec(emptyProgress(), { score: 12 })
    const second = rec(first.state, { score: 9 })
    expect(second.state.grammar.checkpoints[1]).toEqual({ best: 12, total: 15 })
  })

  test('a later pass after a failure awards the badge once', () => {
    const fail = rec(emptyProgress(), { score: 8 })
    const pass = rec(fail.state, { score: 12 })
    expect(pass.newBadges).toContain('grammar-group-1')
    const again = rec(pass.state, { score: 14 })
    expect(again.newBadges).not.toContain('grammar-group-1')
    expect(again.state.badges.filter((b) => b === 'grammar-group-1')).toHaveLength(1)
  })

  test('each group has its own record and badge', () => {
    const one = rec(emptyProgress())
    const two = rec(one.state, { group: 2, score: 15 })
    expect(two.state.badges).toEqual(expect.arrayContaining(['grammar-group-1', 'grammar-group-2']))
  })

  test('a general test is appended and the list keeps the last 10', () => {
    let state = emptyProgress()
    for (let i = 0; i < 12; i++) state = recordAssessment(state, { kind: 'test', score: i, total: 20, date: `2026-10-${10 + i}` }).state
    expect(state.grammar.tests).toHaveLength(10)
    expect(state.grammar.tests[0].score).toBe(2)
    expect(state.grammar.tests.at(-1)).toEqual({ date: '2026-10-21', score: 11, total: 20 })
  })

  test('test-90 is awarded at 18/20 and not at 17/20, and only once', () => {
    const low = recordAssessment(emptyProgress(), { kind: 'test', score: 17, total: 20, date: TODAY })
    expect(low.newBadges).not.toContain('test-90')
    const high = recordAssessment(low.state, { kind: 'test', score: 18, total: 20, date: TODAY })
    expect(high.newBadges).toContain('test-90')
    const again = recordAssessment(high.state, { kind: 'test', score: 20, total: 20, date: TODAY })
    expect(again.newBadges).not.toContain('test-90')
  })

  test('a checkpoint never awards test-90', () => {
    expect(rec(emptyProgress(), { score: 15 }).newBadges).not.toContain('test-90')
  })

  test('the input state is not mutated', () => {
    const state = emptyProgress()
    const frozen = structuredClone(state)
    rec(state)
    recordAssessment(state, { kind: 'test', score: 20, total: 20, date: TODAY })
    expect(state).toEqual(frozen)
  })
})
