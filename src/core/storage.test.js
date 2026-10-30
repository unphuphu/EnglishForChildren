import { createStorage } from './storage.js'

function fakeBackend(overrides = {}) {
  const map = new Map()
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    ...overrides,
  }
}

test('set then get round-trips a value', () => {
  const storage = createStorage(fakeBackend())
  expect(storage.set('a', { x: 1 })).toBe(true)
  expect(storage.get('a')).toEqual({ x: 1 })
})

test('get returns null for a missing key', () => {
  expect(createStorage(fakeBackend()).get('nope')).toBeNull()
})

test('a second set keeps the first value as backup and restoreBackup restores it', () => {
  const backend = fakeBackend()
  const storage = createStorage(backend)
  storage.set('a', { v: 1 })
  storage.set('a', { v: 2 })
  expect(JSON.parse(backend.map.get('a:bak'))).toEqual({ v: 1 })
  expect(storage.restoreBackup('a')).toBe(true)
  expect(storage.get('a')).toEqual({ v: 1 })
})

test('restoreBackup returns false when there is no backup', () => {
  expect(createStorage(fakeBackend()).restoreBackup('a')).toBe(false)
})

test('a throwing backend falls back to memory and reports not persistent', () => {
  const backend = fakeBackend({ setItem: () => { throw new Error('QuotaExceeded') } })
  const storage = createStorage(backend)
  expect(storage.isPersistent()).toBe(true)
  expect(storage.set('a', { x: 1 })).toBe(false)
  expect(storage.get('a')).toEqual({ x: 1 })
  expect(storage.isPersistent()).toBe(false)
})

test('a backend whose getItem throws still works through memory', () => {
  const backend = fakeBackend({ getItem: () => { throw new Error('blocked') } })
  const storage = createStorage(backend)
  expect(storage.get('a')).toBeNull()
  storage.set('a', 1)
  expect(storage.get('a')).toBe(1)
})

test('corrupt JSON gives null and the raw value is left in place', () => {
  const backend = fakeBackend()
  backend.map.set('a', '{not json')
  const storage = createStorage(backend)
  expect(storage.get('a')).toBeNull()
  expect(backend.map.get('a')).toBe('{not json')
})

test('remove deletes the value', () => {
  const storage = createStorage(fakeBackend())
  storage.set('a', 1)
  storage.remove('a')
  expect(storage.get('a')).toBeNull()
})
