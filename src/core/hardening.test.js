import { createStorage } from './storage.js'
import { createProfiles, AVATARS } from './profiles.js'
import {
  createProgressStore, emptyProgress, finishSession, normalizeProgress, dailyCount,
} from './progress.js'
import { importProfile } from './exportImport.js'
import { review, newCard } from './srs.js'

function backendWithMap() {
  const map = new Map()
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

describe('storage hardening', () => {
  test('a localStorage property that throws falls back to memory instead of crashing', () => {
    const storage = createStorage(() => { throw new Error('SecurityError') })
    expect(storage.get('a')).toBeNull()
    expect(storage.set('a', { x: 1 })).toBe(false)
    expect(storage.get('a')).toEqual({ x: 1 })
    expect(storage.isPersistent()).toBe(false)
  })

  test('getStatus tells missing, ok and corrupt apart', () => {
    const backend = backendWithMap()
    const storage = createStorage(backend)
    expect(storage.getStatus('a')).toEqual({ status: 'missing', value: null })
    storage.set('a', { v: 1 })
    expect(storage.getStatus('a')).toEqual({ status: 'ok', value: { v: 1 } })
    backend.map.set('a', '{broken')
    expect(storage.getStatus('a')).toEqual({ status: 'corrupt', value: null })
  })

  test('a corrupt main value is never copied over a good backup', () => {
    const backend = backendWithMap()
    const storage = createStorage(backend)
    storage.set('a', { v: 1 })
    storage.set('a', { v: 2 })
    backend.map.set('a', '{broken')
    storage.set('a', { v: 3 })
    expect(JSON.parse(backend.map.get('a:bak'))).toEqual({ v: 1 })
  })
})

describe('normalizeProgress', () => {
  test('keeps a complete state unchanged', () => {
    expect(normalizeProgress(emptyProgress())).toEqual(emptyProgress())
  })

  test('fills the optional v1 sections of a state that has the required v2 sections', () => {
    const { streak, daily, badges, perfectSessions, ...rest } = emptyProgress()
    const state = normalizeProgress(rest)
    expect(state.streak).toEqual({ count: 0, lastDate: null })
    expect(state.daily).toEqual({ date: null, correctIds: [], goalAwarded: false })
    expect(state.badges).toEqual([])
    expect(state.perfectSessions).toBe(0)
  })

  test.each([
    ['null', null],
    ['a string', '5'],
    ['an array', []],
    ['no version', (() => { const { version, ...rest } = emptyProgress(); return rest })()],
    ['version 1 (no migration from v1)', { ...emptyProgress(), version: 1 }],
    ['a newer version', { ...emptyProgress(), version: 3 }],
    ['a non-numeric xp', { ...emptyProgress(), xp: 'a' }],
    ['cards as an array', { ...emptyProgress(), cards: [] }],
    ['a card with a numeric due', { ...emptyProgress(), cards: { a: { box: 1, correct: 1, wrong: 0, due: 5 } } }],
    ['a card with box 9', { ...emptyProgress(), cards: { a: { box: 9, correct: 1, wrong: 0, due: null } } }],
    ['a streak without a count', { ...emptyProgress(), streak: {} }],
  ])('rejects %s', (_label, data) => {
    expect(() => normalizeProgress(data)).toThrow('INVALID_PROGRESS')
  })
})

describe('progress store recovery', () => {
  function setup() {
    const backend = backendWithMap()
    const storage = createStorage(backend)
    return { backend, storage, store: createProgressStore(storage, 'p1') }
  }

  test('check reports missing, ok and corrupt', () => {
    const { backend, store } = setup()
    expect(store.check()).toBe('missing')
    store.save(emptyProgress())
    expect(store.check()).toBe('ok')
    backend.map.set('progress:p1', '{broken')
    expect(store.check()).toBe('corrupt')
  })

  test('a future version counts as corrupt and load never throws', () => {
    const { storage, store } = setup()
    storage.set('progress:p1', { ...emptyProgress(), version: 9 })
    expect(store.check()).toBe('corrupt')
    expect(store.load()).toEqual(emptyProgress())
  })

  test('restoreBackup brings back the last good save', () => {
    const { backend, store } = setup()
    store.save({ ...emptyProgress(), xp: 100 })
    store.save({ ...emptyProgress(), xp: 200 })
    backend.map.set('progress:p1', '{broken')
    expect(store.hasBackup()).toBe(true)
    expect(store.restoreBackup()).toBe(true)
    expect(store.check()).toBe('ok')
    expect(store.load().xp).toBe(100)
  })

  test('restoreBackup returns false when there is no usable backup', () => {
    const { backend, store } = setup()
    backend.map.set('progress:p1', '{broken')
    expect(store.hasBackup()).toBe(false)
    expect(store.restoreBackup()).toBe(false)
  })

  test('reset replaces the data with an empty state', () => {
    const { backend, store } = setup()
    backend.map.set('progress:p1', '{broken')
    store.reset()
    expect(store.check()).toBe('ok')
    expect(store.load()).toEqual(emptyProgress())
  })
})

describe('profile list hardening', () => {
  test('a damaged list is read as empty instead of throwing', () => {
    const storage = createStorage(backendWithMap())
    storage.set('profiles', { version: 1, items: {} })
    expect(createProfiles(storage).list()).toEqual([])
  })

  test('junk entries in the list are ignored', () => {
    const storage = createStorage(backendWithMap())
    const good = { id: 'a', name: 'Bin', avatar: AVATARS[0], dailyGoal: 10 }
    storage.set('profiles', { version: 1, items: [good, null, { id: 5 }, 'x'] })
    expect(createProfiles(storage).list()).toEqual([good])
  })
})

describe('import hardening', () => {
  const file = (progress) => JSON.stringify({
    app: 'english-for-children', version: 2,
    profile: { name: 'Lan', avatar: AVATARS[0], dailyGoal: 10 }, progress,
  })

  test('a progress file that lacks the v2 sections is rejected', () => {
    const storage = createStorage(backendWithMap())
    expect(() => importProfile(storage, file({ version: 2, xp: 0, cards: {} }))).toThrow('INVALID_FILE')
  })

  test('a complete progress file is accepted', () => {
    const storage = createStorage(backendWithMap())
    const created = importProfile(storage, file(emptyProgress()))
    expect(createProgressStore(storage, created.id).load()).toEqual(emptyProgress())
  })

  test('a progress file without a version is rejected', () => {
    const storage = createStorage(backendWithMap())
    const { version, ...rest } = emptyProgress()
    expect(() => importProfile(storage, file(rest))).toThrow('INVALID_FILE')
  })

  test('a progress file with a malformed card is rejected', () => {
    const storage = createStorage(backendWithMap())
    const bad = { ...emptyProgress(), cards: { a: { box: 1, correct: 1, wrong: 0, due: 5 } } }
    expect(() => importProfile(storage, file(bad))).toThrow('INVALID_FILE')
  })
})

describe('review respects the due date', () => {
  test('a correct answer before the card is due keeps its box and due date', () => {
    const card = { box: 2, correct: 2, wrong: 0, due: '2026-11-05' }
    expect(review(card, true, '2026-10-30')).toEqual({ box: 2, correct: 3, wrong: 0, due: '2026-11-05' })
  })

  test('a correct answer on or after the due date advances the box', () => {
    const card = { box: 2, correct: 2, wrong: 0, due: '2026-10-30' }
    expect(review(card, true, '2026-10-30').box).toBe(3)
  })

  test('a wrong answer before the due date still resets the card', () => {
    const card = { box: 3, correct: 3, wrong: 0, due: '2026-11-06' }
    expect(review(card, false, '2026-10-30')).toEqual({ box: 0, correct: 3, wrong: 1, due: '2026-10-30' })
  })

  test('repeating a topic round on the same day cannot master a word', () => {
    let card = newCard()
    for (let i = 0; i < 5; i++) card = review(card, true, '2026-10-30')
    expect(card.box).toBe(1)
  })
})

describe('self-reported flashcard results do not score', () => {
  const vocab = [{ id: 'w1', topic: 't', level: 1 }, { id: 'w2', topic: 't', level: 1 }]
  const run = (results, goal = 10) =>
    finishSession(emptyProgress(), { results, goal, today: '2026-10-30', vocab })

  test('ten "I remember" taps give no XP, no perfect bonus and no goal progress', () => {
    const results = Array.from({ length: 10 }, (_, i) => ({ wordId: `f${i}`, correct: true, selfReported: true }))
    const out = run(results)
    expect(out.xpGained).toBe(0)
    expect(out.state.perfectSessions).toBe(0)
    expect(out.goalReachedNow).toBe(false)
    expect(dailyCount(out.state, '2026-10-30')).toBe(0)
    expect(out.state.streak.count).toBe(0)
  })

  test('they still schedule the cards', () => {
    const out = run([{ wordId: 'w1', correct: true, selfReported: true }, { wordId: 'w2', correct: false, selfReported: true }])
    expect(out.state.cards.w1.box).toBe(1)
    expect(out.state.cards.w2.box).toBe(0)
  })

  test('a flashcard step followed by a quiz scores only the quiz answers', () => {
    const results = [
      { wordId: 'w1', correct: true, selfReported: true },
      { wordId: 'w2', correct: true, selfReported: true },
      { wordId: 'w1', correct: true },
      { wordId: 'w2', correct: false },
    ]
    const out = run(results)
    expect(out.xpGained).toBe(10)
    expect(out.state.perfectSessions).toBe(0)
  })

  test('a perfect scored round still earns the perfect bonus', () => {
    const out = run([{ wordId: 'w1', correct: true }, { wordId: 'w2', correct: true }])
    expect(out.xpGained).toBe(40)
  })
})
