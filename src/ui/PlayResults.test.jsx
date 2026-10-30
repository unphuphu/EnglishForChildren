import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))

import App from '../App.jsx'
import { renderApp, seededStorage, fixtureWords, savedProgress } from '../test/utils.jsx'

const three = fixtureWords.slice(0, 3)

async function finishFlashcards() {
  const user = userEvent.setup()
  for (let i = 0; i < 3; i++) {
    await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
    await user.click(screen.getByRole('button', { name: /đã nhớ/i }))
  }
}

test('a single-game run does not show the old words-per-day goal line', async () => {
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage, words: three })
  await finishFlashcards()
  expect(screen.getByText(/hoàn thành!/i)).toBeInTheDocument()
  expect(screen.queryByText(/hôm nay:/i)).toBeNull()
  expect(screen.queryByText(/hoàn thành mục tiêu/i)).toBeNull()
})

test('a single-game run never completes the daily lesson', async () => {
  const { storage, profile } = seededStorage()
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage, words: three })
  await finishFlashcards()
  const saved = savedProgress(storage, profile.id)
  expect(saved.daily.goalAwarded).toBe(false)
  expect(saved.plan.step).toBe(0)
  expect(saved.streak.count).toBe(0)
})
