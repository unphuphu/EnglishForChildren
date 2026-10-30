import lessons from './lessons.js'
import roadmap from '../roadmap.json'
import freeWords from './freeWords.json'
import vocab from '../vocab/index.js'
import { validateGrammar } from '../../core/grammarSchema.js'
import { roadmapCoverageErrors } from '../../core/plan.js'

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

test('every roadmap step has enough eligible sentences', () => {
  expect(roadmapCoverageErrors({ roadmap, lessons, vocab })).toEqual([])
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
