export const AVATARS = [
  '🦊', '🐼', '🦁', '🐙', '🐯', '🐨', '🐸', '🦄',
  '🐵', '🐰', '🐶', '🐱', '🐧', '🦉', '🐢', '🐬',
  '🦋', '🐝', '🦖', '🐘', '🦒', '🐞', '🦜', '🐳',
]
export const MAX_PROFILES = 4
export const MIN_DAILY_GOAL = 5
export const DEFAULT_DAILY_GOAL = 10

const LIST_KEY = 'profiles'
const CURRENT_KEY = 'currentProfile'

export function createProfiles(storage) {
  const read = () => storage.get(LIST_KEY)?.items ?? []
  const write = (items) => storage.set(LIST_KEY, { version: 1, items })

  function validate(fields, others) {
    if ('name' in fields && !String(fields.name ?? '').trim()) throw new Error('NAME_REQUIRED')
    if ('avatar' in fields) {
      if (!AVATARS.includes(fields.avatar)) throw new Error('INVALID_AVATAR')
      if (others.some((p) => p.avatar === fields.avatar)) throw new Error('AVATAR_TAKEN')
    }
    if ('dailyGoal' in fields && !(Number.isInteger(fields.dailyGoal) && fields.dailyGoal >= MIN_DAILY_GOAL)) {
      throw new Error('GOAL_TOO_LOW')
    }
  }

  const api = {
    list: read,
    add({ name, avatar, dailyGoal = DEFAULT_DAILY_GOAL }) {
      const items = read()
      if (items.length >= MAX_PROFILES) throw new Error('MAX_PROFILES')
      validate({ name, avatar, dailyGoal }, items)
      const profile = { id: crypto.randomUUID(), name: name.trim(), avatar, dailyGoal }
      write([...items, profile])
      return profile
    },
    update(id, patch) {
      const items = read()
      const current = items.find((p) => p.id === id)
      if (!current) throw new Error('NOT_FOUND')
      validate(patch, items.filter((p) => p.id !== id))
      const updated = { ...current, ...patch, ...('name' in patch ? { name: patch.name.trim() } : {}) }
      write(items.map((p) => (p.id === id ? updated : p)))
      return updated
    },
    remove(id) {
      write(read().filter((p) => p.id !== id))
      storage.remove(`progress:${id}`)
      if (storage.get(CURRENT_KEY) === id) storage.remove(CURRENT_KEY)
    },
    getCurrentId() {
      const id = storage.get(CURRENT_KEY)
      return read().some((p) => p.id === id) ? id : null
    },
    setCurrentId(id) {
      if (id === null) storage.remove(CURRENT_KEY)
      else storage.set(CURRENT_KEY, id)
    },
  }
  return api
}
