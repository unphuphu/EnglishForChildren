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
