import { createStorage } from './storage.js'
import {
  emptyProgress, addBonusXp, levelForXp, xpForLevel, currentStreak, dailyCount, finishSession, createProgressStore,
} from './progress.js'

const D = '2026-10-30'
const ids = (n, from = 0) => Array.from({ length: n }, (_, i) => `w${from + i}`)
const results = (list, correct = true) => list.map((wordId) => ({ wordId, correct }))
const vocab = ids(30).map((id) => ({ id, topic: 'misc', level: 1 }))
const run = (state, res, extra = {}) =>
  finishSession(state, { results: res, today: D, vocab, ...extra })

function memoryBackend() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }
}

test('7 correct and 3 wrong give 70 XP and no bonuses', () => {
  const res = [...results(ids(7)), ...results(ids(3, 7), false)]
  const out = run(emptyProgress(), res)
  expect(out.xpGained).toBe(70)
  expect(out.goalReachedNow).toBe(false)
  expect(out.state.xp).toBe(70)
})

test('10 of 10 correct without a lesson gives 100 + 20 perfect and never the goal bonus', () => {
  const out = run(emptyProgress(), results(ids(10)))
  expect(out.xpGained).toBe(120)
  expect(out.goalReachedNow).toBe(false)
})

test('completing a lesson adds the 30 XP goal bonus: 100 + 20 + 30 = 150', () => {
  const out = run(emptyProgress(), results(ids(10)), { completesLesson: true })
  expect(out.xpGained).toBe(150)
  expect(out.goalReachedNow).toBe(true)
})

test('a lesson with no correct answers still earns the goal bonus', () => {
  const out = run(emptyProgress(), results(ids(3), false), { completesLesson: true })
  expect(out.xpGained).toBe(30)
  expect(out.goalReachedNow).toBe(true)
})

test('the goal bonus is awarded once per day', () => {
  const first = run(emptyProgress(), results(ids(10)), { completesLesson: true })
  const second = run(first.state, results(ids(10, 10)), { completesLesson: true })
  expect(second.xpGained).toBe(120)
  expect(second.goalReachedNow).toBe(false)
})

test('goal progress counts distinct correct words across sessions today', () => {
  const a = run(emptyProgress(), results(ids(4)))
  const b = run(a.state, results(ids(4)))
  expect(dailyCount(b.state, D)).toBe(4)
  const c = run(b.state, results(ids(3, 4)))
  expect(dailyCount(c.state, D)).toBe(7)
})

test('dailyCount is 0 on a new day', () => {
  const a = run(emptyProgress(), results(ids(4)))
  expect(dailyCount(a.state, '2026-10-31')).toBe(0)
})

test('streak grows on consecutive lesson days and resets after a missed day', () => {
  const day1 = run(emptyProgress(), results(ids(10)), { today: '2026-10-30', completesLesson: true })
  expect(day1.state.streak.count).toBe(1)
  const day2 = run(day1.state, results(ids(10, 10)), { today: '2026-10-31', completesLesson: true })
  expect(day2.state.streak.count).toBe(2)
  expect(currentStreak(day2.state, '2026-11-01')).toBe(2)
  expect(currentStreak(day2.state, '2026-11-02')).toBe(0)
})

test('a session that is not a lesson never changes the streak, however many answers are correct', () => {
  const out = run(emptyProgress(), results(ids(30)))
  expect(out.state.streak).toEqual({ count: 0, lastDate: null })
})

test('a second lesson the same day does not extend the streak again', () => {
  const first = run(emptyProgress(), results(ids(3)), { completesLesson: true })
  const second = run(first.state, results(ids(3, 3)), { completesLesson: true })
  expect(second.state.streak.count).toBe(1)
})

test('level follows the XP formula', () => {
  expect(levelForXp(0)).toBe(1)
  expect(levelForXp(50)).toBe(2)
  expect(levelForXp(200)).toBe(3)
})

test('first-perfect badge is awarded once', () => {
  const first = run(emptyProgress(), results(ids(3)))
  expect(first.newBadges).toContain('first-perfect')
  const second = run(first.state, results(ids(3, 3)))
  expect(second.newBadges).not.toContain('first-perfect')
  expect(second.state.badges.filter((b) => b === 'first-perfect')).toHaveLength(1)
})

test('mastered-50 is awarded when the 50th card reaches box 3', () => {
  const state = emptyProgress()
  for (let i = 0; i < 49; i++) state.cards[`m${i}`] = { box: 3, correct: 3, wrong: 0, due: '2026-11-06' }
  state.cards.last = { box: 2, correct: 2, wrong: 0, due: D }
  const out = run(state, [{ wordId: 'last', correct: true }])
  expect(out.newBadges).toContain('mastered-50')
})

test('topic-complete badge is awarded when every word of a topic is mastered', () => {
  const small = [{ id: 'a', topic: 't', level: 1 }, { id: 'b', topic: 't', level: 1 }]
  const state = emptyProgress()
  state.cards.a = { box: 3, correct: 3, wrong: 0, due: D }
  state.cards.b = { box: 2, correct: 2, wrong: 0, due: D }
  const out = finishSession(state, { results: [{ wordId: 'b', correct: true }], goal: 10, today: D, vocab: small })
  expect(out.newBadges).toContain('topic-complete:t')
})

test('a word answered twice in one session advances its card once', () => {
  const out = run(emptyProgress(), [{ wordId: 'w1', correct: true }, { wordId: 'w1', correct: true }])
  expect(out.state.cards.w1.box).toBe(1)
  expect(out.state.cards.w1.correct).toBe(1)
})

test('a word answered wrong then right in one session counts as wrong', () => {
  const out = run(emptyProgress(), [{ wordId: 'w1', correct: false }, { wordId: 'w1', correct: true }])
  expect(out.state.cards.w1.box).toBe(0)
  expect(out.state.cards.w1.wrong).toBe(1)
})

test('an empty session earns nothing, not even a perfect bonus', () => {
  const out = run(emptyProgress(), [])
  expect(out.xpGained).toBe(0)
  expect(out.state.perfectSessions).toBe(0)
})

test('finishSession does not mutate its input', () => {
  const state = emptyProgress()
  const frozen = structuredClone(state)
  run(state, results(ids(10)))
  expect(state).toEqual(frozen)
})

test('load returns an empty progress for a profile with no data', () => {
  const store = createProgressStore(createStorage(memoryBackend()), 'p1')
  expect(store.load()).toEqual(emptyProgress())
})

test('save then load round-trips and profiles never see each other', () => {
  const storage = createStorage(memoryBackend())
  const a = createProgressStore(storage, 'a')
  const b = createProgressStore(storage, 'b')
  a.save({ ...emptyProgress(), xp: 42 })
  expect(a.load().xp).toBe(42)
  expect(b.load().xp).toBe(0)
})

test('xpForLevel is the first XP of a level and agrees with levelForXp', () => {
  expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 50, 200, 450])
  for (const level of [1, 2, 3, 4, 8]) {
    expect(levelForXp(xpForLevel(level))).toBe(level)
    if (level > 1) expect(levelForXp(xpForLevel(level) - 1)).toBe(level - 1)
  }
})

test('addBonusXp adds whole XP without touching the rest and ignores negatives', () => {
  const state = emptyProgress()
  expect(addBonusXp(state, 15).xp).toBe(15)
  expect(addBonusXp(state, 15)).toEqual({ ...state, xp: 15 })
  expect(addBonusXp(state, -5).xp).toBe(0)
  expect(state.xp).toBe(0)
})
