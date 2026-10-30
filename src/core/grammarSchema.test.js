import { tokenize, matchesUses, validateLesson, validateGrammar } from './grammarSchema.js'

const vocab = [
  { id: 'a-001', word: 'dog', topic: 'animals' },
  { id: 'a-002', word: 'go', topic: 'actions' },
  { id: 'h-001', word: 'garden', topic: 'home' },
  { id: 'f-001', word: 'ice cream', topic: 'food' },
  { id: 'f-002', word: 'eat', topic: 'food' },
]
const vocabWords = new Set(vocab.map((w) => w.word))
const freeWords = new Set(['there', 'is', 'a', 'in', 'the', 'i', 'she', 'to', 'school', 'likes', 'are', 'am'])
const ctx = { vocabWords, freeWords: new Set([...freeWords, "there's", "isn't", 'it']) }

const sentence = (over = {}) => ({
  id: 'there-is-are-001',
  en: 'There is a dog in the garden.',
  vi: 'Có một con chó trong vườn.',
  uses: ['dog', 'garden'],
  blank: { answer: 'is', options: ['is', 'are', 'am'] },
  wrong: ['There are a dog in the garden.', 'There am a dog in the garden.'],
  extra: ['are', 'has'],
  session: 1,
  ...over,
})
const lesson = (over = {}) => ({
  id: 'there-is-are',
  title: 'There is / There are',
  order: 3,
  sessions: 2,
  explain: [{ vi: 'Dùng để nói có.', examples: [{ en: 'There is a dog.', vi: 'Có một con chó.' }] }],
  sentences: [sentence()],
  ...over,
})

describe('tokenize', () => {
  test('lowercases and strips punctuation but keeps apostrophes', () => {
    expect(tokenize("There's a dog, isn't it?")).toEqual(["there's", 'a', 'dog', "isn't", 'it'])
  })

  test('returns an empty list for text without words', () => {
    expect(tokenize('?!')).toEqual([])
  })
})

describe('matchesUses', () => {
  test.each([
    ['dog', ['dog']],
    ['dogs', ['dog']],
    ['goes', ['go']],
    ['running', ['run']],
    ['making', ['make']],
    ['studies', ['study']],
    ['played', ['play']],
    ['liked', ['like']],
    ['studied', ['study']],
    ['sitting', ['sit']],
  ])('%s matches %j', (token, uses) => {
    expect(matchesUses(token, uses)).toBe(true)
  })

  test.each([
    ['cat', ['dog']],
    ['dogged', ['cat']],
    ['go', ['going']],
  ])('%s does not match %j', (token, uses) => {
    expect(matchesUses(token, uses)).toBe(false)
  })
})

describe('validateLesson', () => {
  const run = (l) => validateLesson(l, ctx)
  const withSentence = (over) => lesson({ sentences: [sentence(over)] })

  test('accepts a valid lesson', () => {
    expect(run(lesson())).toEqual([])
  })

  test('reports a uses word that is not in the vocabulary', () => {
    expect(run(withSentence({ uses: ['dog', 'unicorn'] })).join(' ')).toMatch(/unicorn/)
  })

  test('reports a word in the sentence that is neither free nor used', () => {
    expect(run(withSentence({ en: 'There is a cat in the garden.' })).join(' ')).toMatch(/cat/)
  })

  test('accepts an inflected form of a used word', () => {
    const l = withSentence({
      en: 'She goes to school.', vi: 'Cô ấy đi học.', uses: ['go'],
      blank: { answer: 'goes', options: ['goes', 'go', 'going'] },
      wrong: ['She go to school.', 'She going to school.'],
    })
    expect(run(l)).toEqual([])
  })

  test('a multi-word use covers both of its words', () => {
    const l = withSentence({
      en: 'I eat ice cream.', vi: 'Tôi ăn kem.', uses: ['eat', 'ice cream'],
      blank: { answer: 'eat', options: ['eat', 'eats', 'eating'] },
      wrong: ['I eats ice cream.', 'I eating ice cream.'],
    })
    expect(run(l)).toEqual([])
  })

  test('reports a missing translation', () => {
    expect(run(withSentence({ vi: '' })).join(' ')).toMatch(/vi/)
  })

  test('reports a blank answer that is not in the sentence', () => {
    expect(run(withSentence({ blank: { answer: 'was', options: ['was', 'is', 'are'] } })).join(' ')).toMatch(/blank/)
  })

  test('reports a blank answer that is not among the options', () => {
    expect(run(withSentence({ blank: { answer: 'is', options: ['are', 'am', 'be'] } })).join(' ')).toMatch(/blank/)
  })

  test('reports duplicate blank options', () => {
    expect(run(withSentence({ blank: { answer: 'is', options: ['is', 'is', 'are'] } })).join(' ')).toMatch(/blank/)
  })

  test('reports a wrong sentence equal to the correct one', () => {
    expect(run(withSentence({ wrong: ['There is a dog in the garden.', 'There are a dog in the garden.'] })).join(' ')).toMatch(/wrong/)
  })

  test('reports fewer than two wrong sentences', () => {
    expect(run(withSentence({ wrong: ['There are a dog in the garden.'] })).join(' ')).toMatch(/wrong/)
  })

  test('reports a session above the lesson sessions', () => {
    expect(run(withSentence({ session: 3 })).join(' ')).toMatch(/session/)
  })

  test('reports duplicate sentence ids inside a lesson', () => {
    expect(run(lesson({ sentences: [sentence(), sentence()] })).join(' ')).toMatch(/duplicate/i)
  })

  test('reports a lesson without explanation or sentences', () => {
    expect(run(lesson({ explain: [] })).join(' ')).toMatch(/explain/)
    expect(run(lesson({ sentences: [] })).join(' ')).toMatch(/sentences/)
  })
})

describe('validateGrammar', () => {
  const run = (over = {}) => validateGrammar({
    lessons: [lesson()], roadmap: [{ topic: 'animals', lesson: 'there-is-are', part: 1 }],
    vocab, freeWords: [...ctx.freeWords], ...over,
  })

  test('accepts consistent data', () => {
    expect(run()).toEqual([])
  })

  test('reports duplicate sentence ids across lessons', () => {
    const other = lesson({ id: 'other', order: 4 })
    expect(run({ lessons: [lesson(), other] }).join(' ')).toMatch(/duplicate/i)
  })

  test('reports duplicate lesson orders', () => {
    const other = lesson({ id: 'other', order: 3, sentences: [sentence({ id: 'other-001' })] })
    expect(run({ lessons: [lesson(), other] }).join(' ')).toMatch(/order/)
  })

  test('reports a roadmap step with an unknown topic, an unknown lesson and a part beyond sessions', () => {
    const errors = run({
      roadmap: [
        { topic: 'nowhere', lesson: 'there-is-are', part: 1 },
        { topic: 'animals', lesson: 'ghost', part: 1 },
        { topic: 'animals', lesson: 'there-is-are', part: 3 },
      ],
    }).join(' ')
    expect(errors).toMatch(/nowhere/)
    expect(errors).toMatch(/ghost/)
    expect(errors).toMatch(/part/)
  })
})
