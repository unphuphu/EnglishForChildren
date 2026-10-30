import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => true }))
const voices = { list: [{ name: 'Google US English', lang: 'en-US' }, { name: 'Microsoft Libby', lang: 'en-GB' }] }
vi.mock('../core/useEnglishVoices.js', () => ({ useEnglishVoices: () => voices.list }))

import App from '../App.jsx'
import Flashcard from '../games/Flashcard.jsx'
import Listen from '../games/Listen.jsx'
import Scramble from '../games/Scramble.jsx'
import { renderApp, seededStorage } from '../test/utils.jsx'
import { createProfiles } from '../core/profiles.js'
import { speak } from '../core/speech.js'
import { render } from '@testing-library/react'

const word = { id: 'a-001', word: 'dog', vi: 'con chó', ipa: '/dɒɡ/', example: 'E.', exampleVi: 'V.' }
const profileOf = (storage, id) => createProfiles(storage).list().find((p) => p.id === id)

beforeEach(() => {
  voices.list = [{ name: 'Google US English', lang: 'en-US' }, { name: 'Microsoft Libby', lang: 'en-GB' }]
  speak.mockClear()
})

test('Settings offers an automatic option plus every English voice', () => {
  renderApp(<App />, { route: '/settings', storage: seededStorage().storage })
  const select = screen.getByLabelText(/giọng đọc/i)
  expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
    'Tự động', 'Google US English (en-US)', 'Microsoft Libby (en-GB)',
  ])
  expect(select.value).toBe('')
})

test('choosing a voice saves it on the profile', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  renderApp(<App />, { route: '/settings', storage })
  await user.selectOptions(screen.getByLabelText(/giọng đọc/i), 'Microsoft Libby')
  expect(profileOf(storage, profile.id).voice).toBe('Microsoft Libby')
})

test('choosing Tự động clears the saved voice', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  createProfiles(storage).update(profile.id, { voice: 'Microsoft Libby' })
  renderApp(<App />, { route: '/settings', storage })
  expect(screen.getByLabelText(/giọng đọc/i).value).toBe('Microsoft Libby')
  await user.selectOptions(screen.getByLabelText(/giọng đọc/i), '')
  expect(profileOf(storage, profile.id).voice).toBeNull()
})

test('Thử nghe speaks with the chosen voice and rate', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  createProfiles(storage).update(profile.id, { voice: 'Microsoft Libby', speechRate: 0.8 })
  renderApp(<App />, { route: '/settings', storage })
  await user.click(screen.getByRole('button', { name: /thử nghe/i }))
  expect(speak).toHaveBeenCalledWith('Hello', expect.objectContaining({ voice: 'Microsoft Libby', rate: 0.8 }))
})

test('a saved voice that this browser no longer has is shown as Tự động', () => {
  const { storage, profile } = seededStorage()
  createProfiles(storage).update(profile.id, { voice: 'Gone Voice' })
  renderApp(<App />, { route: '/settings', storage })
  expect(screen.getByLabelText(/giọng đọc/i).value).toBe('')
})

test('without any English voice the voice section is hidden', () => {
  voices.list = []
  renderApp(<App />, { route: '/settings', storage: seededStorage().storage })
  expect(screen.queryByLabelText(/giọng đọc/i)).toBeNull()
})

test('Flashcard speaks with the profile voice', async () => {
  const user = userEvent.setup()
  render(<Flashcard words={[word]} pool={[]} onFinish={() => {}} voiceName="Microsoft Libby" speechRate={0.9} />)
  await user.click(screen.getByRole('button', { name: /nghe/i }))
  expect(speak).toHaveBeenCalledWith('dog', { rate: 0.9, voice: 'Microsoft Libby' })
})

test('Listen speaks with the profile voice', () => {
  render(<Listen words={[word]} pool={[word]} onFinish={() => {}} voiceName="Microsoft Libby" />)
  expect(speak).toHaveBeenCalledWith('dog', expect.objectContaining({ voice: 'Microsoft Libby' }))
})

test('Scramble speaks with the profile voice', async () => {
  const user = userEvent.setup()
  render(<Scramble words={[word]} pool={[]} onFinish={() => {}} voiceName="Microsoft Libby" />)
  await user.click(screen.getByRole('button', { name: /nghe/i }))
  expect(speak).toHaveBeenCalledWith('dog', expect.objectContaining({ voice: 'Microsoft Libby' }))
})
