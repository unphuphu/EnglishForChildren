import { screen } from '@testing-library/react'
import App from '../App.jsx'
import { renderApp, memoryBackend, fixtureWords } from '../test/utils.jsx'
import { createStorage } from '../core/storage.js'
import { createProfiles, AVATARS } from '../core/profiles.js'
import { createProgressStore, emptyProgress } from '../core/progress.js'
import { todayISO } from '../core/date.js'

function homeStorage(progress) {
  const storage = createStorage(memoryBackend())
  const profiles = createProfiles(storage)
  const p = profiles.add({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 10 })
  profiles.setCurrentId(p.id)
  if (progress) createProgressStore(storage, p.id).save(progress)
  return storage
}

test('Home shows 4/10 after 4 correct words today', () => {
  const progress = emptyProgress()
  progress.daily = { date: todayISO(), correctIds: fixtureWords.slice(0, 4).map((w) => w.id), goalAwarded: false }
  renderApp(<App />, { storage: homeStorage(progress) })
  expect(screen.getByText('4/10')).toBeInTheDocument()
})

test('Home shows 0/10, level 1 and streak 0 for a new profile', () => {
  renderApp(<App />, { storage: homeStorage() })
  expect(screen.getByText('0/10')).toBeInTheDocument()
  expect(screen.getByText(/cấp 1/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/chuỗi ngày/i)).toHaveTextContent('0')
})

test('yesterday\'s count does not carry into today', () => {
  const progress = emptyProgress()
  progress.daily = { date: '2000-01-01', correctIds: ['animals-001'], goalAwarded: true }
  renderApp(<App />, { storage: homeStorage(progress) })
  expect(screen.getByText('0/10')).toBeInTheDocument()
})

test('Home has the main call to action', () => {
  renderApp(<App />, { storage: homeStorage() })
  expect(screen.getByRole('link', { name: /học hôm nay/i })).toHaveAttribute('href', '/play/daily')
})
