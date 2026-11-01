import { createStorage } from './storage.js'
import { createProfiles, AVATARS, MAX_PROFILES } from './profiles.js'

function memoryBackend() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

function setup() {
  const storage = createStorage(memoryBackend())
  return { storage, profiles: createProfiles(storage) }
}

test('exposes 24 distinct avatars and a limit of 4 profiles', () => {
  expect(new Set(AVATARS).size).toBe(24)
  expect(MAX_PROFILES).toBe(4)
})

test('add without dailyGoal defaults to 10', () => {
  const { profiles } = setup()
  const p = profiles.add({ name: 'Bin', avatar: AVATARS[0] })
  expect(p.dailyGoal).toBe(10)
  expect(profiles.list()).toEqual([p])
})

test('a daily goal below 5 is rejected', () => {
  const { profiles } = setup()
  expect(() => profiles.add({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 4 })).toThrow('GOAL_TOO_LOW')
})

test('a daily goal above 50 is rejected and 50 is accepted', () => {
  const { profiles } = setup()
  expect(() => profiles.add({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 51 })).toThrow('GOAL_TOO_HIGH')
  expect(profiles.add({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 50 }).dailyGoal).toBe(50)
})

test('a fifth profile is rejected', () => {
  const { profiles } = setup()
  for (let i = 0; i < 4; i++) profiles.add({ name: `P${i}`, avatar: AVATARS[i] })
  expect(() => profiles.add({ name: 'P5', avatar: AVATARS[4] })).toThrow('MAX_PROFILES')
})

test('the same avatar cannot be used twice', () => {
  const { profiles } = setup()
  profiles.add({ name: 'A', avatar: AVATARS[0] })
  expect(() => profiles.add({ name: 'B', avatar: AVATARS[0] })).toThrow('AVATAR_TAKEN')
})

test('update to another profile avatar is rejected', () => {
  const { profiles } = setup()
  profiles.add({ name: 'A', avatar: AVATARS[0] })
  const b = profiles.add({ name: 'B', avatar: AVATARS[1] })
  expect(() => profiles.update(b.id, { avatar: AVATARS[0] })).toThrow('AVATAR_TAKEN')
})

test('update changes name and goal but keeps the id', () => {
  const { profiles } = setup()
  const a = profiles.add({ name: 'A', avatar: AVATARS[0] })
  const updated = profiles.update(a.id, { name: 'Anna', dailyGoal: 15 })
  expect(updated).toEqual({ ...a, name: 'Anna', dailyGoal: 15 })
})

test('an empty name is rejected', () => {
  const { profiles } = setup()
  expect(() => profiles.add({ name: '   ', avatar: AVATARS[0] })).toThrow('NAME_REQUIRED')
})

test('an avatar outside the fixed set is rejected', () => {
  const { profiles } = setup()
  expect(() => profiles.add({ name: 'A', avatar: 'x' })).toThrow('INVALID_AVATAR')
})

test('remove deletes only that profile and its progress', () => {
  const { storage, profiles } = setup()
  const a = profiles.add({ name: 'A', avatar: AVATARS[0] })
  const b = profiles.add({ name: 'B', avatar: AVATARS[1] })
  storage.set(`progress:${a.id}`, { xp: 5 })
  storage.set(`progress:${b.id}`, { xp: 9 })
  profiles.setCurrentId(a.id)
  profiles.remove(a.id)
  expect(storage.get(`progress:${a.id}`)).toBeNull()
  expect(storage.get(`progress:${b.id}`)).toEqual({ xp: 9 })
  expect(profiles.list()).toEqual([b])
  expect(profiles.getCurrentId()).toBeNull()
})

test('the freed avatar can be reused after removal', () => {
  const { profiles } = setup()
  const a = profiles.add({ name: 'A', avatar: AVATARS[0] })
  profiles.remove(a.id)
  expect(() => profiles.add({ name: 'B', avatar: AVATARS[0] })).not.toThrow()
})

test('current profile id persists across instances', () => {
  const { storage, profiles } = setup()
  const a = profiles.add({ name: 'A', avatar: AVATARS[0] })
  profiles.setCurrentId(a.id)
  expect(createProfiles(storage).getCurrentId()).toBe(a.id)
})

test('a stale current id that no longer exists reads as null', () => {
  const { storage, profiles } = setup()
  storage.set('currentProfile', 'ghost')
  expect(profiles.getCurrentId()).toBeNull()
})
