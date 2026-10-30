import { createStorage } from './storage.js'
import { APP_DATA_VERSION, cleanOldData } from './dataVersion.js'
import { emptyProgress, normalizeProgress } from './progress.js'

function backendWithMap() {
  const map = new Map()
  return {
    map,
    get length() { return map.size },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

function v1Storage() {
  const backend = backendWithMap()
  const storage = createStorage(backend)
  storage.set('profiles', { version: 1, items: [{ id: 'a', name: 'Bin', avatar: '🦊', dailyGoal: 10 }] })
  storage.set('currentProfile', 'a')
  storage.set('progress:a', { version: 1, xp: 5, cards: {} })
  storage.set('progress:a', { version: 1, xp: 9, cards: {} })
  storage.set('other', 'keep me')
  return { backend, storage }
}

test('the data version is 2', () => {
  expect(APP_DATA_VERSION).toBe(2)
})

test('storage.keys lists the stored keys', () => {
  const { storage } = v1Storage()
  expect(storage.keys().sort()).toEqual(
    ['currentProfile', 'other', 'profiles', 'progress:a', 'progress:a:bak'].sort(),
  )
})

test('storage.keys includes memory-only keys when the backend is blocked', () => {
  const storage = createStorage(() => { throw new Error('SecurityError') })
  storage.set('a', 1)
  expect(storage.keys()).toEqual(['a'])
})

test('the first launch removes the v1 keys including backups, keeps other keys and sets the marker', () => {
  const { storage } = v1Storage()
  expect(cleanOldData(storage)).toBe(true)
  expect(storage.get('profiles')).toBeNull()
  expect(storage.get('currentProfile')).toBeNull()
  expect(storage.get('progress:a')).toBeNull()
  expect(storage.keys()).not.toContain('progress:a:bak')
  expect(storage.get('other')).toBe('keep me')
  expect(storage.get('appDataVersion')).toBe(2)
})

test('a second launch changes nothing and keeps data created after the first', () => {
  const { storage } = v1Storage()
  cleanOldData(storage)
  storage.set('profiles', { version: 1, items: [{ id: 'b', name: 'New', avatar: '🐼', dailyGoal: 10 }] })
  expect(cleanOldData(storage)).toBe(false)
  expect(storage.get('profiles').items[0].id).toBe('b')
})

test('a brand new browser just gets the marker', () => {
  const storage = createStorage(backendWithMap())
  expect(cleanOldData(storage)).toBe(false)
  expect(storage.get('appDataVersion')).toBe(2)
})

test('a blocked storage does not throw', () => {
  const storage = createStorage(() => { throw new Error('SecurityError') })
  expect(() => cleanOldData(storage)).not.toThrow()
})

describe('progress v2 shape', () => {
  test('the empty state has version 2, a plan and a grammar section', () => {
    const state = emptyProgress()
    expect(state.version).toBe(2)
    expect(state.plan).toEqual({ step: 0 })
    expect(state.grammar).toEqual({ lessons: {}, sentences: {}, checkpoints: {}, tests: [] })
  })

  test('the empty state is valid', () => {
    expect(normalizeProgress(emptyProgress())).toEqual(emptyProgress())
  })

  test.each([
    ['no plan', (s) => { delete s.plan }],
    ['a negative plan step', (s) => { s.plan.step = -1 }],
    ['no grammar section', (s) => { delete s.grammar }],
    ['lessons with a negative count', (s) => { s.grammar.lessons.x = { partsDone: -1, correct: 0, wrong: 0 } }],
    ['sentences with a text count', (s) => { s.grammar.sentences.x = { seen: 'a', wrong: 0 } }],
    ['a checkpoint without a best score', (s) => { s.grammar.checkpoints[1] = { total: 15 } }],
    ['tests that is not a list', (s) => { s.grammar.tests = {} }],
    ['a test without a date', (s) => { s.grammar.tests = [{ score: 1, total: 2 }] }],
  ])('rejects %s', (_label, mutate) => {
    const state = emptyProgress()
    mutate(state)
    expect(() => normalizeProgress(state)).toThrow('INVALID_PROGRESS')
  })

  test('accepts filled grammar sections', () => {
    const state = emptyProgress()
    state.plan.step = 4
    state.grammar.lessons['to-be'] = { partsDone: 2, correct: 10, wrong: 3 }
    state.grammar.sentences['to-be-001'] = { seen: 2, wrong: 1 }
    state.grammar.checkpoints[1] = { best: 12, total: 15 }
    state.grammar.tests = [{ date: '2026-10-30', score: 15, total: 20 }]
    expect(normalizeProgress(state)).toEqual(state)
  })
})
