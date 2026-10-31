import { validateLesson, filterValidLessons } from './grammarSchema.js'
import { assignTypes } from './sentences.js'

const ctx = {
  vocabWords: new Set(['dog', 'cat', 'garden']),
  freeWords: new Set(['there', 'is', 'a', 'in', 'the', 'and', 'are', 'what', 'it', 'this', 'no', 'not', 'has', 'am']),
}

const sentence = (over = {}) => ({
  id: 's-001',
  en: 'There is a dog in the garden.',
  vi: 'Có một con chó trong vườn.',
  uses: ['dog', 'garden'],
  blank: { answer: 'is', options: ['is', 'are', 'am'] },
  wrong: ['There are a dog in the garden.', 'There am a dog in the garden.'],
  extra: ['are', 'has'],
  session: 1,
  ...over,
})
const lesson = (sentences = [sentence()], over = {}) => ({
  id: 'l', title: 'L', order: 1, sessions: 1,
  explain: [{ vi: 'x', examples: [{ en: 'a', vi: 'b' }] }], sentences, ...over,
})

describe('sentence rules that keep exercises unambiguous', () => {
  test('a sentence with "and" is rejected because its parts can swap places', () => {
    const errors = validateLesson(lesson([sentence({ en: 'There is a dog and a cat in the garden.', uses: ['dog', 'cat', 'garden'] })]), ctx)
    expect(errors.join(' ')).toMatch(/coordination|and|or/i)
  })

  test('a sentence with "or" is rejected as well', () => {
    const errors = validateLesson(lesson([sentence({ en: 'Is it a dog or a cat?', uses: ['dog', 'cat'], blank: { answer: 'Is', options: ['Is', 'Are'] }, wrong: ['Are it a dog or a cat?', 'Am it a dog or a cat?'] })]), { ...ctx, freeWords: new Set([...ctx.freeWords, 'or', 'it']) })
    expect(errors.join(' ')).toMatch(/coordination|and|or/i)
  })

  test('a sentence without a coordination word is fine', () => {
    expect(validateLesson(lesson(), ctx)).toEqual([])
  })

  test.each(['no', 'not', 'and', 'or', 'NO'])('the extra tile "%s" is rejected because it can build another correct sentence', (word) => {
    const errors = validateLesson(lesson([sentence({ extra: ['are', word] })]), ctx)
    expect(errors.join(' ')).toMatch(/extra/)
  })

  test('harmless extra tiles are accepted', () => {
    expect(validateLesson(lesson([sentence({ extra: ['are', 'has'] })]), ctx)).toEqual([])
  })
})

describe('assignTypes with two-sentence texts', () => {
  const twoSentences = sentence({
    id: 'wh', en: 'What is this? It is a cat.', uses: ['cat'],
    blank: { answer: 'What', options: ['What', 'Where', 'Who'] },
    wrong: ['Where is this? It is a cat.', 'Who is this? It is a cat.'],
  })

  test('a text of two sentences is never an order exercise', () => {
    for (let position = 0; position < 4; position++) {
      const list = Array.from({ length: 4 }, (_, i) => sentence({ id: `x${i}` }))
      list[position] = twoSentences
      expect(assignTypes(list)[position]).not.toBe('order')
    }
  })

  test('it can still be a blank, choose or translate exercise', () => {
    const types = [0, 1, 2, 3].map((i) => {
      const list = Array.from({ length: 4 }, () => twoSentences)
      return assignTypes(list)[i]
    })
    expect(new Set(types)).toEqual(new Set(['translate', 'blank', 'choose']))
  })

  test('a single sentence with a question mark at the end can still be an order exercise', () => {
    expect(assignTypes([sentence({ en: 'Is there a dog in the garden?' })])[0]).toBe('order')
  })
})

describe('filterValidLessons', () => {
  const good = lesson()

  test('keeps valid lessons and reports the invalid ones with their errors', () => {
    const broken = lesson([sentence({ uses: undefined, extra: undefined })], { id: 'broken', order: 2 })
    const { valid, rejected } = filterValidLessons([good, broken], ctx)
    expect(valid.map((l) => l.id)).toEqual(['l'])
    expect(rejected).toHaveLength(1)
    expect(rejected[0].id).toBe('broken')
    expect(rejected[0].errors.length).toBeGreaterThan(0)
  })

  test('a lesson without sentences or explanation is rejected', () => {
    const { valid } = filterValidLessons([lesson([], { id: 'a' }), lesson(undefined, { id: 'b', explain: undefined })], ctx)
    expect(valid).toEqual([])
  })

  test('entries that are not lesson objects never throw', () => {
    const { valid, rejected } = filterValidLessons([null, 5, 'x', [], undefined, good], ctx)
    expect(valid.map((l) => l.id)).toEqual(['l'])
    expect(rejected).toHaveLength(5)
  })

  test('a sentence that is not an object never throws', () => {
    const { valid, rejected } = filterValidLessons([{ ...good, id: 'weird', sentences: [null, 3] }], ctx)
    expect(valid).toEqual([])
    expect(rejected[0].id).toBe('weird')
  })

  test('two lessons with the same id keep only the first', () => {
    const { valid, rejected } = filterValidLessons([good, { ...good, order: 2 }], ctx)
    expect(valid).toHaveLength(1)
    expect(rejected).toHaveLength(1)
  })

  test('an empty list gives empty results', () => {
    expect(filterValidLessons([], ctx)).toEqual({ valid: [], rejected: [] })
  })
})
