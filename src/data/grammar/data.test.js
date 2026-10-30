import lessons from './lessons.js'
import roadmap from '../roadmap.json'
import freeWords from './freeWords.json'
import vocab from '../vocab/index.js'
import { validateGrammar } from '../../core/grammarSchema.js'
import { roadmapCoverageErrors } from '../../core/plan.js'

const present = new Set(lessons.map((l) => l.id))
const steps = roadmap.filter((s) => present.has(s.lesson))

test('lessons 1 to 4 exist in order with the specified sessions', () => {
  expect(lessons.slice(0, 4).map((l) => [l.id, l.order, l.sessions])).toEqual([
    ['to-be', 1, 2], ['this-that', 2, 1], ['there-is-are', 3, 2], ['have-has', 4, 1],
  ])
})

test('all lessons and the roadmap steps that use them are valid', () => {
  expect(validateGrammar({ lessons, roadmap: steps, vocab, freeWords })).toEqual([])
})

test('each lesson has between 20 and 26 sentences', () => {
  for (const lesson of lessons) {
    expect(lesson.sentences.length, lesson.id).toBeGreaterThanOrEqual(20)
    expect(lesson.sentences.length, lesson.id).toBeLessThanOrEqual(26)
  }
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

test('the roadmap steps covered by these lessons have enough eligible sentences', () => {
  expect(roadmapCoverageErrors({ roadmap: steps, lessons, vocab })).toEqual([])
})
