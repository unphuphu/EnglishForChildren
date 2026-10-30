import { newCard, review, isMastered, pickWords, INTERVALS, MASTERED_BOX } from './srs.js'
import { addDays } from './date.js'

const TODAY = '2026-10-30'
const w = (id, level = 1) => ({ id, word: id, level })

test('constants match the spec', () => {
  expect(INTERVALS).toEqual([1, 3, 7, 14])
  expect(MASTERED_BOX).toBe(3)
})

test('a new card starts empty', () => {
  expect(newCard()).toEqual({ box: 0, correct: 0, wrong: 0, due: null })
})

test('three correct answers move through boxes 1-3 with due +1, +3, +7 days', () => {
  let c = review(newCard(), true, TODAY)
  expect([c.box, c.due]).toEqual([1, '2026-10-31'])
  c = review(c, true, '2026-10-31')
  expect([c.box, c.due]).toEqual([2, '2026-11-03'])
  c = review(c, true, '2026-11-03')
  expect([c.box, c.due, c.correct]).toEqual([3, '2026-11-10', 3])
})

test('box never exceeds 4 and the top interval is 14 days', () => {
  let c = newCard()
  let day = TODAY
  for (let i = 0; i < 6; i++) {
    c = review(c, true, day)
    if (i < 5) day = c.due
  }
  expect(c.box).toBe(4)
  expect(c.due).toBe(addDays(day, 14))
})

test('a wrong answer resets to box 0, due today, and counts the miss', () => {
  const c = review({ box: 3, correct: 3, wrong: 0, due: '2026-11-06' }, false, TODAY)
  expect(c).toEqual({ box: 0, correct: 3, wrong: 1, due: TODAY })
})

test('review does not mutate the card it receives', () => {
  const c = newCard()
  review(c, true, TODAY)
  expect(c).toEqual(newCard())
})

test('isMastered is true from box 3', () => {
  expect(isMastered({ box: 2 })).toBe(false)
  expect(isMastered({ box: 3 })).toBe(true)
})

test('pickWords puts due words before unseen ones', () => {
  const words = [w('a'), w('b'), w('c')]
  const cards = { c: { box: 1, correct: 1, wrong: 0, due: '2026-10-29' } }
  const picked = pickWords({ words, cards, today: TODAY, level: 1, count: 2 })
  expect(picked.map((x) => x.id)).toEqual(['c', 'a'])
})

test('pickWords does not pick words that are not yet due unless padding is needed', () => {
  const words = [w('a'), w('b')]
  const cards = { a: { box: 2, correct: 2, wrong: 0, due: '2026-11-05' } }
  expect(pickWords({ words, cards, today: TODAY, level: 1, count: 1 }).map((x) => x.id)).toEqual(['b'])
})

test('pickWords puts error-prone words before unseen ones', () => {
  const words = [w('a'), w('b')]
  const cards = { b: { box: 1, correct: 1, wrong: 3, due: '2026-11-05' } }
  expect(pickWords({ words, cards, today: TODAY, level: 1, count: 1 }).map((x) => x.id)).toEqual(['b'])
})

test('pickWords only offers unseen words up to the given level', () => {
  const words = [w('a', 1), w('b', 3)]
  expect(pickWords({ words, cards: {}, today: TODAY, level: 1, count: 5 }).map((x) => x.id)).toEqual(['a'])
})

test('pickWords never returns duplicates and honors count', () => {
  const words = Array.from({ length: 20 }, (_, i) => w(`w${i}`))
  const cards = { w0: { box: 0, correct: 0, wrong: 2, due: TODAY } }
  const picked = pickWords({ words, cards, today: TODAY, level: 1, count: 10 })
  expect(picked).toHaveLength(10)
  expect(new Set(picked.map((x) => x.id)).size).toBe(10)
})

test('pickWords returns fewer than count when too few words exist', () => {
  const words = [w('a'), w('b'), w('c'), w('d')]
  expect(pickWords({ words, cards: {}, today: TODAY, level: 1, count: 10 })).toHaveLength(4)
})
