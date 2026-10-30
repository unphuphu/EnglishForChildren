import { createStorage } from './storage.js'
import { createProfiles, AVATARS } from './profiles.js'
import { createProgressStore, emptyProgress } from './progress.js'
import { exportProfile, importProfile } from './exportImport.js'

function memoryBackend() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }
}
const fresh = () => createStorage(memoryBackend())

function source() {
  const storage = fresh()
  const profile = createProfiles(storage).add({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 15 })
  const progress = { ...emptyProgress(), xp: 120, cards: { 'a-001': { box: 2, correct: 2, wrong: 0, due: '2026-11-02' } } }
  createProgressStore(storage, profile.id).save(progress)
  return { storage, profile, progress }
}

test('export then import into a fresh storage reproduces name, goal, xp and cards', () => {
  const { storage, profile, progress } = source()
  const json = exportProfile(storage, profile.id)
  const target = fresh()
  const imported = importProfile(target, json)
  expect(imported).toMatchObject({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 15 })
  expect(imported.id).not.toBe(profile.id)
  expect(createProgressStore(target, imported.id).load()).toEqual(progress)
})

test('the export is marked as coming from this app', () => {
  const { storage, profile } = source()
  expect(JSON.parse(exportProfile(storage, profile.id))).toMatchObject({ app: 'english-for-children', version: 1 })
})

test('exporting an unknown profile throws NOT_FOUND', () => {
  expect(() => exportProfile(fresh(), 'ghost')).toThrow('NOT_FOUND')
})

test('importing a file from another app throws INVALID_FILE', () => {
  expect(() => importProfile(fresh(), JSON.stringify({ app: 'other', version: 1 }))).toThrow('INVALID_FILE')
})

test('importing text that is not JSON throws INVALID_FILE', () => {
  expect(() => importProfile(fresh(), 'hello')).toThrow('INVALID_FILE')
})

test('importing a file without progress throws INVALID_FILE', () => {
  const { storage, profile } = source()
  const data = JSON.parse(exportProfile(storage, profile.id))
  delete data.progress
  expect(() => importProfile(fresh(), JSON.stringify(data))).toThrow('INVALID_FILE')
})

test('importing a file from a newer version throws INVALID_FILE', () => {
  const { storage, profile } = source()
  const data = JSON.parse(exportProfile(storage, profile.id))
  data.version = 99
  expect(() => importProfile(fresh(), JSON.stringify(data))).toThrow('INVALID_FILE')
})

test('importing when 4 profiles already exist throws MAX_PROFILES', () => {
  const { storage, profile } = source()
  const json = exportProfile(storage, profile.id)
  const target = fresh()
  const profiles = createProfiles(target)
  for (let i = 0; i < 4; i++) profiles.add({ name: `P${i}`, avatar: AVATARS[i + 5] })
  expect(() => importProfile(target, json)).toThrow('MAX_PROFILES')
})

test('an imported profile whose avatar is taken gets a different free avatar', () => {
  const { storage, profile } = source()
  const json = exportProfile(storage, profile.id)
  const target = fresh()
  createProfiles(target).add({ name: 'Other', avatar: AVATARS[0] })
  const imported = importProfile(target, json)
  expect(imported.avatar).not.toBe(AVATARS[0])
  expect(AVATARS).toContain(imported.avatar)
})

test('importing twice creates two separate profiles', () => {
  const { storage, profile } = source()
  const json = exportProfile(storage, profile.id)
  const target = fresh()
  const a = importProfile(target, json)
  const b = importProfile(target, json)
  expect(a.id).not.toBe(b.id)
  expect(createProfiles(target).list()).toHaveLength(2)
})
