import { createVocabService } from './vocabService.js'

const w = (id, topic, level) => ({ id, word: id, topic, level })
const words = [w('animals-001', 'animals', 1), w('animals-002', 'animals', 2), w('food-001', 'food', 1)]
words[0].word = 'dog'

test('topics() returns counts per topic', () => {
  const svc = createVocabService(words)
  expect(svc.topics()).toEqual([
    { topic: 'animals', count: 2 },
    { topic: 'food', count: 1 },
  ])
})

test('byTopic and byLevel filter', () => {
  const svc = createVocabService(words)
  expect(svc.byTopic('animals')).toHaveLength(2)
  expect(svc.byLevel(1).map((x) => x.id)).toEqual(['animals-001', 'food-001'])
})

test('get finds by id or returns undefined', () => {
  const svc = createVocabService(words)
  expect(svc.get('animals-001').word).toBe('dog')
  expect(svc.get('nope')).toBeUndefined()
})
