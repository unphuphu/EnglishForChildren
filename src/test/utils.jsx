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

export const fixtureSentence = (id, session, wordIndex) => ({
  id,
  en: `She sees word${wordIndex} now.`,
  vi: `Cô ấy thấy word${wordIndex} bây giờ.`,
  uses: [`word${wordIndex}`],
  blank: { answer: 'sees', options: ['sees', 'see', 'seeing'] },
  wrong: [`She see word${wordIndex} now.`, `She seeing word${wordIndex} now.`],
  extra: ['has', 'are'],
  session,
})

export const fixtureLessons = [
  {
    id: 'basics',
    title: 'Basics',
    order: 1,
    sessions: 2,
    explain: [
      { vi: 'Khối giải thích một.', examples: [{ en: 'She sees a dog.', vi: 'Cô ấy thấy một con chó.' }, { en: 'He sees a cat.', vi: 'Anh ấy thấy một con mèo.' }] },
      { vi: 'Khối giải thích hai.', examples: [{ en: 'They see a bird.', vi: 'Họ thấy một con chim.' }, { en: 'We see a fish.', vi: 'Chúng tôi thấy một con cá.' }] },
    ],
    sentences: [
      ...Array.from({ length: 12 }, (_, i) => fixtureSentence(`basics-s1-${i}`, 1, i % 6)),
      ...Array.from({ length: 12 }, (_, i) => fixtureSentence(`basics-s2-${i}`, 2, 6 + (i % 6))),
    ],
  },
]

export const fixtureRoadmap = [
  { topic: 'animals', lesson: 'basics', part: 1 },
  { topic: 'animals', lesson: 'basics', part: 2 },
]

export function renderApp(ui, {
  route = '/', storage = createStorage(memoryBackend()), words = fixtureWords,
  lessons = fixtureLessons, roadmap = fixtureRoadmap,
} = {}) {
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProvider storage={storage} words={words} lessons={lessons} roadmap={roadmap}>
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
