import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))

import App from '../App.jsx'
import { renderApp, seededStorage } from '../test/utils.jsx'
import { createStorage } from '../core/storage.js'
import { createProfiles, AVATARS } from '../core/profiles.js'

function failingStorage() {
  const backend = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError') },
    removeItem: () => {},
  }
  const storage = createStorage(backend)
  const profiles = createProfiles(storage)
  const profile = profiles.add({ name: 'Bin', avatar: AVATARS[0] })
  profiles.setCurrentId(profile.id)
  return storage
}

test('the header warns that progress will not be saved when storage fails', () => {
  renderApp(<App />, { storage: failingStorage() })
  expect(screen.getByText(/tiến độ sẽ không được lưu/i)).toBeInTheDocument()
})

test('there is no storage warning when storage works', () => {
  renderApp(<App />, { storage: seededStorage().storage })
  expect(screen.queryByText(/tiến độ sẽ không được lưu/i)).toBeNull()
})

test('the app still works in memory when storage fails', async () => {
  const user = userEvent.setup()
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage: failingStorage() })
  await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
  await user.click(screen.getByRole('button', { name: /đã nhớ/i }))
  expect(screen.getByText('2/10')).toBeInTheDocument()
})

test('without speech Home shows a dismissible note', async () => {
  const user = userEvent.setup()
  renderApp(<App />, { storage: seededStorage().storage })
  expect(screen.getByText(/chưa có giọng đọc tiếng anh/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /đóng/i }))
  expect(screen.queryByText(/chưa có giọng đọc tiếng anh/i)).toBeNull()
})

test('without speech no speaker button appears during a session', () => {
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage: seededStorage().storage })
  expect(screen.queryByRole('button', { name: /nghe/i })).toBeNull()
})
