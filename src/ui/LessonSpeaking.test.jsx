import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => true }))
// The fake child always reads the sentence that is on screen.
vi.mock('../core/speechRecognition.js', () => ({
  isRecognitionSupported: () => true,
  listen: async () => ({ ok: true, alternatives: [document.querySelector('.speak-step .prompt-text')?.textContent ?? ''] }),
}))

import App from '../App.jsx'
import { renderApp, seededStorage, savedProgress } from '../test/utils.jsx'
import { answerExerciseRight } from '../test/exerciseHelpers.js'

async function rememberAll(user, count) {
  for (let i = 0; i < count; i++) {
    await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
    await user.click(screen.getByRole('button', { name: /đã nhớ/i }))
  }
}

async function reachSpeakingStep(user, storage) {
  renderApp(<App />, { route: '/lesson', storage })
  expect(screen.getByText('Bước 1/5')).toBeInTheDocument()
  await rememberAll(user, 5)
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
  for (let i = 0; i < 8; i++) await answerExerciseRight(user)
  expect(screen.getByText('Bước 4/5')).toBeInTheDocument()
}

test('with a microphone the lesson has a speaking step that earns 5 XP per sentence read right', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage({ dailyGoal: 5 })
  await reachSpeakingStep(user, storage)
  for (let i = 0; i < 3; i++) {
    await user.click(screen.getByRole('button', { name: /^🎤 nói$/i }))
    await user.click(await screen.findByRole('button', { name: /tiếp tục/i }))
  }
  expect(await screen.findByText(/buổi học hôm nay đã xong/i)).toBeInTheDocument()
  expect(screen.getByText('+145 XP')).toBeInTheDocument()
  const saved = savedProgress(storage, profile.id)
  expect(saved.xp).toBe(145)
  expect(saved.grammar.lessons.basics.partsDone).toBe(1)
})

test('skipping the sentences earns nothing extra and still completes the lesson', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage({ dailyGoal: 5 })
  await reachSpeakingStep(user, storage)
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /bỏ qua/i }))
  expect(await screen.findByText(/buổi học hôm nay đã xong/i)).toBeInTheDocument()
  expect(savedProgress(storage, profile.id).xp).toBe(130)
})

test('the flashcard offers reading the word once it is flipped', async () => {
  const user = userEvent.setup()
  const { storage } = seededStorage({ dailyGoal: 5 })
  renderApp(<App />, { route: '/lesson', storage })
  expect(screen.queryByRole('button', { name: /^🎤 nói$/i })).toBeNull()
  await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
  expect(screen.getByRole('button', { name: /^🎤 nói$/i })).toBeInTheDocument()
})

test('a profile that switched the microphone off gets the old four steps', () => {
  const { storage, profile } = seededStorage({ dailyGoal: 5 })
  const stored = JSON.parse(storage.get ? JSON.stringify(storage.get('profiles')) : 'null')
  stored.items = stored.items.map((p) => (p.id === profile.id ? { ...p, micEnabled: false } : p))
  storage.set('profiles', stored)
  renderApp(<App />, { route: '/lesson', storage })
  expect(screen.getByText('Bước 1/4')).toBeInTheDocument()
})
