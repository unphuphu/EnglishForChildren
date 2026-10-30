import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider } from '../context/AppContext.jsx'
import { createStorage } from '../core/storage.js'
import { createProfiles, AVATARS } from '../core/profiles.js'
import { createProgressStore } from '../core/progress.js'

export function memoryBackend() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

export const fixtureWords = Array.from({ length: 12 }, (_, i) => ({
  id: `animals-${String(i + 1).padStart(3, '0')}`,
  word: `word${i}`,
  pos: 'noun',
  vi: `nghĩa ${i}`,
  ipa: '/x/',
  example: `Example ${i}.`,
  exampleVi: `Ví dụ ${i}.`,
  topic: 'animals',
  level: 1,
}))

export function renderApp(ui, { route = '/', storage = createStorage(memoryBackend()), words = fixtureWords } = {}) {
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProvider storage={storage} words={words}>
        {ui}
      </AppProvider>
    </MemoryRouter>,
  )
  return { ...result, storage }
}

export function seededStorage({ name = 'Bin', dailyGoal = 10, progress } = {}) {
  const storage = createStorage(memoryBackend())
  const profiles = createProfiles(storage)
  const profile = profiles.add({ name, avatar: AVATARS[0], dailyGoal })
  profiles.setCurrentId(profile.id)
  if (progress) createProgressStore(storage, profile.id).save(progress)
  return { storage, profile }
}

export function savedProgress(storage, profileId) {
  return createProgressStore(storage, profileId).load()
}
