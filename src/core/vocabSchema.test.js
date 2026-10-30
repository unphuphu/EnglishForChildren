import { validateWord, validateVocab } from './vocabSchema.js'

const dog = {
  id: 'animals-001', word: 'dog', pos: 'noun', vi: 'con chó', ipa: '/dɒɡ/',
  emoji: '🐶', example: 'The dog runs fast.', exampleVi: 'Con chó chạy nhanh.',
  topic: 'animals', level: 1,
}

test('accepts the spec example word', () => {
  expect(validateWord(dog)).toEqual([])
})

test('reports a missing vi field', () => {
  const { vi, ...rest } = dog
  expect(validateWord(rest).join(' ')).toMatch(/vi/)
})

test('rejects level 4', () => {
  expect(validateWord({ ...dog, level: 4 }).join(' ')).toMatch(/level/)
})

test('rejects id animals-1', () => {
  expect(validateWord({ ...dog, id: 'animals-1' }).join(' ')).toMatch(/id/)
})

test('rejects id whose prefix differs from topic', () => {
  expect(validateWord({ ...dog, id: 'food-001' }).join(' ')).toMatch(/id/)
})

test('accepts a word without emoji', () => {
  const { emoji, ...rest } = dog
  expect(validateWord(rest)).toEqual([])
})

test('rejects an emoji field that is plain text', () => {
  expect(validateWord({ ...dog, emoji: 'dog' }).join(' ')).toMatch(/emoji/)
})

test('flags duplicate ids across words', () => {
  const errors = validateVocab([dog, { ...dog, word: 'cat' }])
  expect(errors.join(' ')).toMatch(/duplicate/i)
})
