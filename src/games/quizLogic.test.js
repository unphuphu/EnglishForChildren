import { buildQuestion } from './quizLogic.js'

const word = (id, w, vi, emoji) => ({ id, word: w, vi, ...(emoji ? { emoji } : {}) })
const dog = word('a-001', 'dog', 'con chó', '🐶')
const pool = [
  dog,
  word('a-002', 'cat', 'con mèo', '🐱'),
  word('a-003', 'bird', 'con chim', '🐦'),
  word('a-004', 'fish', 'con cá', '🐟'),
  word('a-005', 'cow', 'con bò', '🐮'),
]
const rng = () => 0.3

test('vi2en asks for the English word and offers 4 distinct options with the answer once', () => {
  const q = buildQuestion(dog, pool, 'vi2en', rng)
  expect(q.prompt).toBe('con chó')
  expect(q.answer).toBe('dog')
  expect(q.options).toHaveLength(4)
  expect(new Set(q.options).size).toBe(4)
  expect(q.options.filter((o) => o === 'dog')).toHaveLength(1)
})

test('en2vi asks for the Vietnamese meaning', () => {
  const q = buildQuestion(dog, pool, 'en2vi', rng)
  expect(q.prompt).toBe('dog')
  expect(q.answer).toBe('con chó')
  expect(q.options).toContain('con chó')
})

test('emoji is passed through when present and null otherwise', () => {
  expect(buildQuestion(dog, pool, 'vi2en', rng).emoji).toBe('🐶')
  expect(buildQuestion(word('x-001', 'because', 'bởi vì'), pool, 'vi2en', rng).emoji).toBeNull()
})

test('a pool word with the same meaning is never offered as a distractor', () => {
  const twin = word('a-009', 'hound', 'con chó')
  const q = buildQuestion(dog, [...pool, twin], 'en2vi', rng)
  expect(q.options.filter((o) => o === 'con chó')).toHaveLength(1)
})

test('a pool word with the same English text is never offered twice', () => {
  const twin = word('b-001', 'dog', 'chó con')
  const q = buildQuestion(dog, [...pool, twin], 'vi2en', rng)
  expect(q.options.filter((o) => o === 'dog')).toHaveLength(1)
})

test('with only two other pool words there are 3 options, never duplicates', () => {
  const q = buildQuestion(dog, [dog, pool[1], pool[2]], 'vi2en', rng)
  expect(q.options).toHaveLength(3)
  expect(new Set(q.options).size).toBe(3)
})

test('with an empty pool the only option is the answer', () => {
  expect(buildQuestion(dog, [dog], 'vi2en', rng).options).toEqual(['dog'])
})
