import { pickNewWords } from './newWords.js'

const TODAY = '2026-10-30'
const w = (word, level = 1, topic = 'jobs') => ({ id: `${topic}-${word}`, word, topic, level })
const ids = (words) => words.map((x) => x.id)
const sentence = (id, session, uses) => ({ id, en: 'x', vi: 'y', uses, session })
const lessonWith = (sentences) => ({ id: 'l', title: 'L', order: 1, sessions: 2, sentences })
const cardsFor = (...list) => Object.fromEntries(list.map((id) => [id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01' }]))

// File order mimics the real "jobs" topic: easy nouns, then harder jobs, then the verbs the lesson needs.
const jobs = [
  w('doctor'), w('nurse'), w('chef', 2), w('pilot', 2), w('teacher'), w('work'), w('help'), w('police officer', 2),
]

const pick = (over = {}) => pickNewWords({ vocab: jobs, cards: {}, topic: 'jobs', goal: 3, today: TODAY, ...over })

describe('without a lesson', () => {
  test('easier words come first, in file order', () => {
    expect(ids(pick())).toEqual(['jobs-doctor', 'jobs-nurse', 'jobs-teacher'])
  })

  test('harder words are used only after every easier word', () => {
    expect(ids(pick({ goal: 7 }))).toEqual([
      'jobs-doctor', 'jobs-nurse', 'jobs-teacher', 'jobs-work', 'jobs-help', 'jobs-chef', 'jobs-pilot',
    ])
  })

  test('the number of words never exceeds the goal and never repeats a word', () => {
    const list = ids(pick({ goal: 20 }))
    expect(list).toHaveLength(8)
    expect(new Set(list).size).toBe(8)
  })

  test('words the child already has are skipped', () => {
    expect(ids(pick({ cards: cardsFor('jobs-doctor', 'jobs-nurse') }))).toEqual(['jobs-teacher', 'jobs-work', 'jobs-help'])
  })
})

describe('with a lesson', () => {
  const lesson = lessonWith([sentence('a', 1, ['work']), sentence('b', 1, ['work']), sentence('c', 1, ['help'])])

  test('words the lesson sentences need come before other words, even if they sit later in the file', () => {
    expect(ids(pick({ lesson, part: 1, goal: 2 }))).toEqual(['jobs-work', 'jobs-help'])
  })

  test('the word used by the most sentences comes first', () => {
    expect(ids(pick({ lesson, part: 1, goal: 1 }))).toEqual(['jobs-work'])
  })

  test('after the needed words the rest follow by level and file order', () => {
    expect(ids(pick({ lesson, part: 1, goal: 5 }))).toEqual(['jobs-work', 'jobs-help', 'jobs-doctor', 'jobs-nurse', 'jobs-teacher'])
  })

  test('sentences of a later part do not count yet', () => {
    const later = lessonWith([sentence('a', 2, ['work']), sentence('b', 1, ['help'])])
    expect(ids(pick({ lesson: later, part: 1, goal: 1 }))).toEqual(['jobs-help'])
    expect(ids(pick({ lesson: later, part: 2, goal: 2 }))).toEqual(['jobs-work', 'jobs-help'])
  })

  test('a sentence that needs a word the child cannot get today does not boost its other words', () => {
    const blocked = lessonWith([sentence('a', 1, ['work', 'astronaut']), sentence('b', 1, ['help'])])
    expect(ids(pick({ lesson: blocked, part: 1, goal: 1 }))).toEqual(['jobs-help'])
  })

  test('a sentence whose other words are already learned boosts the missing one', () => {
    const l = lessonWith([sentence('a', 1, ['work', 'doctor']), sentence('b', 1, ['help', 'unknown'])])
    const cards = cardsFor('jobs-doctor')
    expect(ids(pick({ lesson: l, part: 1, goal: 1, cards }))).toEqual(['jobs-work'])
  })

  test('a sentence whose other word is learned in another topic still counts', () => {
    const vocab = [...jobs, w('mother', 1, 'family')]
    const l = lessonWith([sentence('a', 1, ['work', 'mother'])])
    const out = pickNewWords({ vocab, cards: cardsFor('family-mother'), topic: 'jobs', goal: 1, today: TODAY, lesson: l, part: 1 })
    expect(ids(out)).toEqual(['jobs-work'])
  })

  test('uses are matched ignoring case', () => {
    const l = lessonWith([sentence('a', 1, ['WORK'])])
    expect(ids(pick({ lesson: l, part: 1, goal: 1 }))).toEqual(['jobs-work'])
  })

  test('a multi-word use matches its vocabulary entry', () => {
    const l = lessonWith([sentence('a', 1, ['police officer'])])
    expect(ids(pick({ lesson: l, part: 1, goal: 1 }))).toEqual(['jobs-police officer'])
  })

  test('a lesson with no sentences behaves like no lesson', () => {
    expect(ids(pick({ lesson: lessonWith([]), part: 1 }))).toEqual(['jobs-doctor', 'jobs-nurse', 'jobs-teacher'])
  })
})

describe('topping up and edge cases', () => {
  test('due words of the topic top up a nearly finished topic', () => {
    const vocab = [w('a'), w('b'), w('c')]
    const cards = { 'jobs-b': { box: 1, correct: 1, wrong: 0, due: '2026-10-29' }, 'jobs-c': { box: 1, correct: 1, wrong: 0, due: '2030-01-01' } }
    const out = pickNewWords({ vocab, cards, topic: 'jobs', goal: 5, today: TODAY })
    expect(ids(out)).toEqual(['jobs-a', 'jobs-b'])
  })

  test('an unknown topic and an empty vocabulary give nothing', () => {
    expect(pick({ topic: 'ghost' })).toEqual([])
    expect(pickNewWords({ vocab: [], cards: {}, topic: 'jobs', goal: 5, today: TODAY })).toEqual([])
  })

  test('a goal of zero gives nothing', () => {
    expect(pick({ goal: 0 })).toEqual([])
  })
})
