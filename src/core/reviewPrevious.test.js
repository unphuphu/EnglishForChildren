import { pickSentences } from './sentences.js'
import { buildLesson } from './lesson.js'
import { emptyProgress } from './progress.js'

const TODAY = '2026-10-30'

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const vocab = [
  { id: 'a', word: 'dog', topic: 'animals', level: 1 },
  { id: 'b', word: 'cat', topic: 'animals', level: 1 },
  { id: 'c', word: 'bird', topic: 'animals', level: 1 },
]
const sentence = (id, session, word) => ({
  id, en: `She likes the ${word} very much.`, vi: 'x', uses: [word], session,
  blank: { answer: 'likes', options: ['likes', 'like'] }, wrong: ['a', 'b'], extra: ['has', 'are'],
})
const many = (prefix, session, count, word) => Array.from({ length: count }, (_, i) => sentence(`${prefix}-${i}`, session, word))
const lessonOf = (id, order, sessions, sentences) => ({ id, title: id, order, sessions, explain: [], sentences })

const one = lessonOf('one', 1, 1, many('one', 1, 10, 'dog'))
const two = lessonOf('two', 2, 2, [...many('two1', 1, 10, 'cat'), ...many('two2', 2, 10, 'cat')])
const three = lessonOf('three', 3, 1, many('three', 1, 10, 'bird'))
const cardsFor = (...ids) => Object.fromEntries(ids.map((id) => [id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01' }]))
const finished = (...ids) => ({
  ...emptyProgress().grammar,
  lessons: Object.fromEntries(ids.map((id) => [id, { partsDone: 1, correct: 0, wrong: 0 }])),
})
const progressWith = (cards, grammar = emptyProgress().grammar) => ({ ...emptyProgress(), cards, grammar })

const pick = (over) => pickSentences({
  lessons: [one, two, three], lessonId: 'two', part: 1, vocab, today: TODAY, rng: seeded(1),
  progress: progressWith(cardsFor('a', 'b'), finished('one')), ...over,
})

describe('part 1 of a later lesson reviews the previous lesson', () => {
  test('takes 6 sentences from the current part and 2 from the previous lesson', () => {
    const picked = pick()
    expect(picked).toHaveLength(8)
    expect(picked.filter((p) => p.lessonId === 'two')).toHaveLength(6)
    expect(picked.filter((p) => p.lessonId === 'one')).toHaveLength(2)
  })

  test('never repeats a sentence', () => {
    const ids = pick().map((p) => p.sentence.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('the first lesson has no previous lesson, so all 8 come from its own part', () => {
    const picked = pick({ lessonId: 'one', progress: progressWith(cardsFor('a')) })
    expect(picked).toHaveLength(8)
    expect(picked.every((p) => p.lessonId === 'one')).toBe(true)
  })

  test('a previous lesson that was not finished is not reviewed', () => {
    const picked = pick({ progress: progressWith(cardsFor('a', 'b')) })
    expect(picked).toHaveLength(8)
    expect(picked.every((p) => p.lessonId === 'two')).toBe(true)
  })

  test('previous sentences with words the child has not learned are not used', () => {
    const picked = pick({ progress: progressWith(cardsFor('b'), finished('one')) })
    expect(picked.every((p) => p.lessonId === 'two')).toBe(true)
  })

  test('a later lesson is never reviewed in an earlier one', () => {
    const picked = pick({ progress: progressWith(cardsFor('a', 'b', 'c'), finished('one', 'three')) })
    expect(picked.some((p) => p.lessonId === 'three')).toBe(false)
  })

  test('with only 3 sentences in the current part the previous lesson tops up to 8', () => {
    const short = lessonOf('two', 2, 2, [...many('two1', 1, 3, 'cat'), ...many('two2', 2, 10, 'cat')])
    const picked = pick({ lessons: [one, short, three] })
    expect(picked).toHaveLength(8)
    expect(picked.filter((p) => p.lessonId === 'two')).toHaveLength(3)
    expect(picked.filter((p) => p.lessonId === 'one')).toHaveLength(5)
  })

  test('with only one sentence available from the previous lesson the current part fills the rest', () => {
    const tiny = lessonOf('one', 1, 1, many('one', 1, 1, 'dog'))
    const picked = pick({ lessons: [tiny, two, three] })
    expect(picked).toHaveLength(8)
    expect(picked.filter((p) => p.lessonId === 'one')).toHaveLength(1)
    expect(picked.filter((p) => p.lessonId === 'two')).toHaveLength(7)
  })

  test('part 2 still reviews the earlier parts of its own lesson', () => {
    const picked = pick({ part: 2 })
    expect(picked.filter((p) => p.sentence.session === 2)).toHaveLength(6)
    expect(picked.filter((p) => p.sentence.session === 1 && p.lessonId === 'two')).toHaveLength(2)
  })

  test('review picks keep their own lesson id so statistics go to the right lesson', () => {
    const picked = pick()
    for (const p of picked) expect(p.sentence.id.startsWith(p.lessonId === 'one' ? 'one' : 'two1')).toBe(true)
  })
})

describe('the daily lesson uses it', () => {
  const roadmap = [{ topic: 'animals', lesson: 'two', part: 1 }]
  const base = {
    roadmap, lessons: [one, two, three], vocab, today: TODAY, goal: 5, rng: seeded(2),
    progress: progressWith(cardsFor('a'), finished('one')),
  }

  test('part 1 of lesson 2 includes 2 exercises from lesson 1', () => {
    const { exercises } = buildLesson(base)
    expect(exercises).toHaveLength(8)
    expect(exercises.filter((e) => e.lessonId === 'one')).toHaveLength(2)
    expect(exercises.filter((e) => e.lessonId === 'two')).toHaveLength(6)
  })

  test('without a finished previous lesson all 8 are from the current lesson', () => {
    const { exercises } = buildLesson({ ...base, progress: progressWith(cardsFor('a')) })
    expect(exercises.every((e) => e.lessonId === 'two')).toBe(true)
  })
})
