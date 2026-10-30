import { AVATARS, createProfiles, DEFAULT_DAILY_GOAL, MIN_DAILY_GOAL } from './profiles.js'
import { createProgressStore, normalizeProgress } from './progress.js'

const APP = 'english-for-children'
const FILE_VERSION = 1
const invalid = () => new Error('INVALID_FILE')

export function exportProfile(storage, profileId) {
  const profile = createProfiles(storage).list().find((p) => p.id === profileId)
  if (!profile) throw new Error('NOT_FOUND')
  const progress = createProgressStore(storage, profileId).load()
  return JSON.stringify({ app: APP, version: FILE_VERSION, profile, progress })
}

function parseFile(json) {
  let data
  try {
    data = JSON.parse(json)
  } catch {
    throw invalid()
  }
  const { profile, progress } = data ?? {}
  if (data?.app !== APP || data.version !== FILE_VERSION || !profile || typeof progress !== 'object' || progress === null) {
    throw invalid()
  }
  try {
    return { profile, progress: normalizeProgress(progress) }
  } catch {
    throw invalid()
  }
}

export function importProfile(storage, json) {
  const { profile, progress } = parseFile(json)
  const profiles = createProfiles(storage)
  const used = new Set(profiles.list().map((p) => p.avatar))
  const avatar = AVATARS.includes(profile.avatar) && !used.has(profile.avatar)
    ? profile.avatar
    : AVATARS.find((a) => !used.has(a))
  const dailyGoal = Number.isInteger(profile.dailyGoal) && profile.dailyGoal >= MIN_DAILY_GOAL
    ? profile.dailyGoal
    : DEFAULT_DAILY_GOAL

  let created
  try {
    created = profiles.add({ name: String(profile.name ?? ''), avatar, dailyGoal })
  } catch (e) {
    throw e.message === 'MAX_PROFILES' ? e : invalid()
  }
  const extras = {}
  if (typeof profile.speechRate === 'number') extras.speechRate = profile.speechRate
  if (typeof profile.voice === 'string') extras.voice = profile.voice
  if (Object.keys(extras).length) created = profiles.update(created.id, extras)
  createProgressStore(storage, created.id).save(progress)
  return created
}
