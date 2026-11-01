import { normalizeText, scoreSentence, scoreWord } from './pronunciation.js'

test('normalizeText lowercases and drops punctuation but keeps apostrophes', () => {
  expect(normalizeText("  It’s a Nice Day!  ")).toBe("it's a nice day")
  expect(normalizeText('star-shaped   lantern.')).toBe('star shaped lantern')
})

test('a word matches ignoring case, punctuation, spaces and hyphens', () => {
  expect(scoreWord('Ice cream', ['ice cream']).ok).toBe(true)
  expect(scoreWord('ice cream', ['icecream']).ok).toBe(true)
  expect(scoreWord('star-shaped lantern', ['Star shaped lantern.']).ok).toBe(true)
})

test('any alternative can match and the first heard text is reported', () => {
  const result = scoreWord('dog', ['dock', 'dog'])
  expect(result).toEqual({ ok: true, heard: 'dock' })
})

test('short words must match exactly, long words may be one letter off', () => {
  expect(scoreWord('cat', ['cut']).ok).toBe(false)
  expect(scoreWord('banana', ['bananas']).ok).toBe(true)
  expect(scoreWord('banana', ['bandana x']).ok).toBe(false)
})

test('nothing heard is never a match', () => {
  expect(scoreWord('dog', []).ok).toBe(false)
  expect(scoreWord('dog', ['']).ok).toBe(false)
  expect(scoreSentence('I like dogs.', []).ok).toBe(false)
})

test('a sentence read exactly passes with nothing missing', () => {
  const result = scoreSentence('She goes to school every day.', ['she goes to school every day'])
  expect(result).toMatchObject({ ok: true, ratio: 1, missing: [] })
})

test('a sentence passes with at least 80 percent of the words in order', () => {
  expect(scoreSentence('She goes to school every day', ['she goes to school every']).ok).toBe(true)
  expect(scoreSentence('She goes to school every day', ['she goes to school']).ok).toBe(false)
})

test('missing words are reported and word order matters', () => {
  const result = scoreSentence('I have two dogs', ['I have dogs'])
  expect(result.missing).toEqual(['two'])
  expect(scoreSentence('I like red apples', ['apples red like I']).ok).toBe(false)
})

test('the best alternative is used for a sentence', () => {
  const result = scoreSentence('I like apples', ['I bike apples', 'I like apples'])
  expect(result.ok).toBe(true)
  expect(result.heard).toBe('I like apples')
})
