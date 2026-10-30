import { suggestToday, roadmapCoverageErrors } from './plan.js'
import { emptyProgress } from './progress.js'

const word = (id, w, topic, level = 1) => ({ id, word: w, topic, level })
const vocab = [
  word('a-1', 'dog', 'animals'), word('a-2', 'cat', 'animals'), word('a-3', 'bird', 'animals', 2),
  word('f-1', 'mother', 'family'), word('f-2', 'father', 'family'),
  word('h-1', 'house', 'home'), word('h-2', 'room', 'home'),
]
const sentence = (id, session, uses) => ({
  id, en: `She likes the ${uses[0]}.`, vi: 'x', uses, session,
  blank: { answer: 'likes', options: ['likes', 'like'] }, wrong: ['a', 'b'], extra: [],
})
const lesson = (id, order, sessions, sentences) => ({ id, title: `Title ${id}`, order, sessions, explain: [], sentences })
const lessons = [lesson('to-be', 1, 2, []), lesson('this-that', 2, 1, [])]
const roadmap = [
  { topic: 'family', lesson: 'to-be', part: 1 },
  { topic: 'animals', lesson: 'to-be', part: 2 },
  { topic: 'home', lesson: 'this-that', part: 1 },
]
const withStep = (step, cards = {}) => ({ ...emptyProgress(), plan: { step }, cards })
const cardFor = (...ids) => Object.fromEntries(ids.map((id) => [id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01' }]))

describe('suggestToday', () => {
  const run = (progress, over = {}) => suggestToday({ roadmap, lessons, vocab, progress, ...over })

  test('a fresh profile gets the first step', () => {
    expect(run(withStep(0))).toEqual({
      step: 0, topic: 'family', lessonId: 'to-be', lessonTitle: 'Title to-be', part: 1, sessions: 2, beyondRoadmap: false,
    })
  })

  test('after one finished step it suggests the second', () => {
    expect(run(withStep(1))).toMatchObject({ step: 1, topic: 'animals', lessonId: 'to-be', part: 2 })
  })

  test('falls back to the next topic with unlearned words when the roadmap topic is fully learned', () => {
    const progress = withStep(0, cardFor('f-1', 'f-2'))
    expect(run(progress, { topicOrder: ['family', 'home', 'animals'] })).toMatchObject({ topic: 'home', lessonId: 'to-be' })
  })

  test('the default topic order is the order topics appear in the vocabulary', () => {
    expect(run(withStep(0, cardFor('f-1', 'f-2'))).topic).toBe('animals')
  })

  test('past the end of the roadmap there is no lesson but still a topic', () => {
    const out = run(withStep(3, cardFor('f-1', 'f-2')))
    expect(out).toMatchObject({ beyondRoadmap: true, lessonId: null, lessonTitle: null, part: null, sessions: null })
    expect(out.topic).toBe('animals')
  })

  test('an empty roadmap counts as beyond the roadmap', () => {
    expect(run(withStep(0), { roadmap: [] })).toMatchObject({ beyondRoadmap: true, lessonId: null, topic: 'animals' })
  })

  test('when every word is learned it keeps the roadmap topic instead of failing', () => {
    const all = cardFor(...vocab.map((w) => w.id))
    expect(run(withStep(0, all)).topic).toBe('family')
    expect(run(withStep(5, all)).topic).toBe('animals')
  })

  test('a roadmap step that points to a missing lesson still gives a topic', () => {
    const out = run(withStep(0), { roadmap: [{ topic: 'family', lesson: 'ghost', part: 1 }] })
    expect(out).toMatchObject({ topic: 'family', lessonId: null, beyondRoadmap: false })
  })
})

describe('roadmapCoverageErrors', () => {
  const eight = (prefix, session, uses) => Array.from({ length: 8 }, (_, i) => sentence(`${prefix}${i}`, session, uses))
  const run = (ls, rm = roadmap, over = {}) =>
    roadmapCoverageErrors({ roadmap: rm, lessons: ls, vocab, freeWords: [], ...over })

  test('reports a step whose lesson has too few eligible sentences', () => {
    const few = [lesson('to-be', 1, 2, [...eight('a', 1, ['mother']).slice(0, 3)]), lesson('this-that', 2, 1, eight('t', 1, ['dog']))]
    const errors = run(few, [{ topic: 'family', lesson: 'to-be', part: 1 }]).join(' ')
    expect(errors).toMatch(/step 1/)
    expect(errors).toMatch(/3/)
  })

  test('reports nothing when every step has enough eligible sentences', () => {
    const ok = [lesson('to-be', 1, 2, [...eight('a', 1, ['mother']), ...eight('b', 2, ['dog'])]), lesson('this-that', 2, 1, eight('t', 1, ['house']))]
    expect(run(ok)).toEqual([])
  })

  test('learned words accumulate across steps', () => {
    const l = [lesson('to-be', 1, 2, [...eight('a', 1, ['mother']), ...eight('b', 2, ['mother', 'dog'])]), lesson('this-that', 2, 1, eight('t', 1, ['house']))]
    expect(run(l)).toEqual([])
  })

  test('a sentence using a word of a later topic is not counted for an earlier step', () => {
    const l = [lesson('to-be', 1, 1, eight('a', 1, ['house']))]
    expect(run(l, [{ topic: 'family', lesson: 'to-be', part: 1 }]).join(' ')).toMatch(/step 1/)
  })

  test('only as many words as the daily goal are assumed learned per step', () => {
    const step = [{ topic: 'animals', lesson: 'to-be', part: 1 }]
    const needsBoth = [lesson('to-be', 1, 1, Array.from({ length: 8 }, (_, i) => sentence(`b${i}`, 1, ['dog', 'cat'])))]
    expect(run(needsBoth, step, { goal: 1 }).join(' ')).toMatch(/step 1/)
    expect(run(needsBoth, step, { goal: 2 })).toEqual([])
  })

  test('the words the lesson needs are learned first, even a harder one late in the file', () => {
    const step = [{ topic: 'animals', lesson: 'to-be', part: 1 }]
    const needsBird = [lesson('to-be', 1, 1, eight('a', 1, ['bird']))]
    expect(run(needsBird, step, { goal: 1 })).toEqual([])
  })

  test('the simulation follows the real word choice, so an unreachable word is reported', () => {
    const step = [{ topic: 'animals', lesson: 'to-be', part: 1 }]
    const needsGhost = [lesson('to-be', 1, 1, eight('a', 1, ['ghost']))]
    expect(run(needsGhost, step).join(' ')).toMatch(/step 1/)
  })

  test('earlier parts of the lesson count for a later part', () => {
    const l = [lesson('to-be', 1, 2, [...eight('a', 1, ['mother']).slice(0, 5), ...eight('b', 2, ['mother']).slice(0, 3)])]
    expect(run(l, [{ topic: 'family', lesson: 'to-be', part: 2 }])).toEqual([])
  })

  test('steps whose lesson does not exist are skipped here', () => {
    expect(run([], [{ topic: 'family', lesson: 'ghost', part: 1 }])).toEqual([])
  })

  test('the minimum can be changed', () => {
    const l = [lesson('to-be', 1, 1, eight('a', 1, ['mother']).slice(0, 3))]
    expect(run(l, [{ topic: 'family', lesson: 'to-be', part: 1 }], { minSentences: 3 })).toEqual([])
  })
})
