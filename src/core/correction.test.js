import { buildCheckMessages, parseCorrection } from './correction.js'

test('the check messages ask only for OK or the corrected sentence', () => {
  const messages = buildCheckMessages('She go to school.')
  expect(messages[0].role).toBe('system')
  expect(messages[0].content).toMatch(/answer exactly: OK/)
  expect(messages[1]).toEqual({ role: 'user', content: 'She go to school.' })
})

test('OK means there is nothing to show', () => {
  expect(parseCorrection('I like dogs.', 'OK')).toBeNull()
  expect(parseCorrection('I like dogs.', 'ok.')).toBeNull()
})

test('a corrected sentence marks the words that changed', () => {
  const result = parseCorrection('She go to school every day.', 'She goes to school every day.')
  expect(result.suggestion).toBe('She goes to school every day.')
  expect(result.parts.filter((p) => p.changed).map((p) => p.text)).toEqual(['goes'])
})

test('labels and notes in brackets from the model are removed', () => {
  expect(parseCorrection('She go to school every day.', 'Incorrect grammar: She goes to school every day.').suggestion)
    .toBe('She goes to school every day.')
  const result = parseCorrection('I like apples and I have two dog.', 'I like apples and I have two dogs. (two should be dogs)')
  expect(result.suggestion).toBe('I like apples and I have two dogs.')
  expect(result.parts.find((p) => p.changed).text).toBe('dogs.')
})

test('quotes around the answer are removed', () => {
  expect(parseCorrection('He have a cat.', '"He has a cat."').suggestion).toBe('He has a cat.')
})

test('an unchanged sentence (ignoring case and punctuation) shows nothing', () => {
  expect(parseCorrection('I like dogs.', 'i like dogs')).toBeNull()
})

test('answers that are not a small fix are ignored', () => {
  expect(parseCorrection('I like dogs.', 'Dogs are wonderful animals that many people love to keep at home.')).toBeNull()
  expect(parseCorrection('She go to school every day.', 'He plays football on Sunday morning.')).toBeNull()
  expect(parseCorrection('I like dogs.', 'Câu này đúng rồi.')).toBeNull()
  expect(parseCorrection('I like dogs.', '')).toBeNull()
})
