import words from './index.js'
import { validateVocab } from '../../core/vocabSchema.js'

const byTopic = Object.groupBy(words, (w) => w.topic)

test('every word passes the schema', () => {
  expect(validateVocab(words)).toEqual([])
})

test('every topic has at least 30 words', () => {
  for (const [topic, list] of Object.entries(byTopic)) {
    expect(list.length, topic).toBeGreaterThanOrEqual(30)
  }
})

test('every topic uses all three levels', () => {
  for (const [topic, list] of Object.entries(byTopic)) {
    expect(new Set(list.map((w) => w.level)), topic).toEqual(new Set([1, 2, 3]))
  }
})

test('dataset has at least 800 words', () => {
  expect(words.length).toBeGreaterThanOrEqual(800)
})

test('no word is repeated within a topic', () => {
  for (const [topic, list] of Object.entries(byTopic)) {
    const texts = list.map((w) => w.word.toLowerCase())
    expect(texts.filter((t, i) => texts.indexOf(t) !== i), topic).toEqual([])
  }
})

test('total word count is between 1000 and 2000', () => {
  expect(words.length).toBeGreaterThanOrEqual(1000)
  expect(words.length).toBeLessThanOrEqual(2000)
})

test('there are 25 to 30 topics', () => {
  const count = Object.keys(byTopic).length
  expect(count).toBeGreaterThanOrEqual(25)
  expect(count).toBeLessThanOrEqual(30)
})

test('words without emoji still have an example sentence', () => {
  for (const w of words.filter((x) => !x.emoji)) {
    expect(w.example.trim().length, w.id).toBeGreaterThan(0)
  }
})
