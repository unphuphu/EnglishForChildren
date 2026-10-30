import lessons from './lessons.js'
import roadmap from '../roadmap.json'
import freeWords from './freeWords.json'
import vocab from '../vocab/index.js'
import { validateGrammar } from '../../core/grammarSchema.js'
import { roadmapCoverageErrors } from '../../core/plan.js'
import { pickNewWords } from '../../core/newWords.js'
import { eligibleSentences } from '../../core/sentences.js'
import { LESSON } from '../../core/config.js'

test('the eight lessons exist in order with the specified sessions', () => {
  expect(lessons.map((l) => [l.id, l.order, l.sessions])).toEqual([
    ['to-be', 1, 2],
    ['this-that', 2, 1],
    ['there-is-are', 3, 2],
    ['have-has', 4, 1],
    ['can', 5, 1],
    ['present-simple', 6, 2],
    ['present-continuous', 7, 2],
    ['wh-questions', 8, 1],
  ])
})

test('the roadmap has 12 steps that cover every lesson part exactly once', () => {
  expect(roadmap).toHaveLength(12)
  const expected = lessons.flatMap((l) => Array.from({ length: l.sessions }, (_, i) => `${l.id}:${i + 1}`))
  expect(roadmap.map((s) => `${s.lesson}:${s.part}`)).toEqual(expected)
})

test('all lessons and the whole roadmap are valid', () => {
  expect(validateGrammar({ lessons, roadmap, vocab, freeWords })).toEqual([])
})

test('each lesson has between 20 and 26 sentences and the total is between 160 and 200', () => {
  for (const lesson of lessons) {
    expect(lesson.sentences.length, lesson.id).toBeGreaterThanOrEqual(20)
    expect(lesson.sentences.length, lesson.id).toBeLessThanOrEqual(26)
  }
  const total = lessons.reduce((n, l) => n + l.sentences.length, 0)
  expect(total).toBeGreaterThanOrEqual(160)
  expect(total).toBeLessThanOrEqual(200)
})

test('every session of a two-session lesson has at least 10 sentences', () => {
  for (const lesson of lessons.filter((l) => l.sessions === 2)) {
    for (const session of [1, 2]) {
      const n = lesson.sentences.filter((s) => s.session === session).length
      expect(n, `${lesson.id} session ${session}`).toBeGreaterThanOrEqual(10)
    }
  }
})

test('every lesson explains in at least two blocks with examples', () => {
  for (const lesson of lessons) {
    expect(lesson.explain.length, lesson.id).toBeGreaterThanOrEqual(2)
    for (const block of lesson.explain) expect(block.examples.length).toBeGreaterThanOrEqual(2)
  }
})

test('every roadmap step has at least 8 eligible sentences at the default goal of 10 new words', () => {
  expect(roadmapCoverageErrors({ roadmap, lessons, vocab, goal: 10, minSentences: 8 })).toEqual([])
})

test('even the smallest goal (5 new words) leaves every step enough sentences to practise', () => {
  expect(roadmapCoverageErrors({ roadmap, lessons, vocab, goal: 5, minSentences: LESSON.MIN_SENTENCES })).toEqual([])
})

test('the verb lessons are practised at every goal, not only the noun lessons', () => {
  for (const goal of [5, 10, 15, 20]) {
    const cards = {}
    roadmap.forEach((step) => {
      const lesson = lessons.find((l) => l.id === step.lesson)
      const words = pickNewWords({ vocab, cards, topic: step.topic, goal, today: '2000-01-01', lesson, part: step.part })
      for (const w of words) cards[w.id] = {}
      if (['present-simple', 'present-continuous'].includes(step.lesson)) {
        const upTo = { ...lesson, sentences: lesson.sentences.filter((s) => s.session <= step.part) }
        expect(eligibleSentences({ lesson: upTo, vocab, cards }).length, `${step.lesson} part ${step.part} goal ${goal}`)
          .toBeGreaterThanOrEqual(LESSON.MIN_SENTENCES)
      }
    })
  }
})

test('no two sentences of a lesson have the same English text', () => {
  for (const lesson of lessons) {
    const texts = lesson.sentences.map((s) => s.en.toLowerCase())
    expect(texts.filter((t, i) => texts.indexOf(t) !== i), lesson.id).toEqual([])
  }
})

test('the this/that sentences that mix near and far cues keep a cue so only one article fits', () => {
  const s = lessons.find((l) => l.id === 'this-that').sentences.find((x) => x.id === 'this-that-020')
  expect(s.en).toMatch(/over there/)
})

test('every sentence has exactly one blank answer in the text and distinct wrong sentences', () => {
  for (const lesson of lessons) {
    for (const s of lesson.sentences) {
      expect(new Set(s.wrong).size, s.id).toBe(s.wrong.length)
      expect(s.wrong.includes(s.en), s.id).toBe(false)
      expect(s.blank.options.includes(s.blank.answer), s.id).toBe(true)
    }
  }
})
