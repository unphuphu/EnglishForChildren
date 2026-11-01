import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))

import App from '../App.jsx'
import { renderApp, seededStorage, savedProgress, fixtureWords } from '../test/utils.jsx'
import { emptyProgress } from '../core/progress.js'

const word = (topic, i, level = 1) => ({
  id: `${topic}-${String(i).padStart(3, '0')}`, word: `${topic}${i}`, pos: 'noun', vi: `nghĩa ${topic}${i}`,
  ipa: '/x/', example: 'E.', exampleVi: 'V.', topic, level,
})
const three = fixtureWords.slice(0, 3)

async function remember(user, times, answer = /đã nhớ/i) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
    await user.click(screen.getByRole('button', { name: answer }))
  }
}

afterEach(() => vi.useRealTimers())

test('a flashcard run with 3 remembered words earns no XP but schedules 3 cards at box 1', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage, words: three })
  await remember(user, 3)
  expect(screen.getByText('+0 XP')).toBeInTheDocument()
  const saved = savedProgress(storage, profile.id)
  expect(Object.values(saved.cards).map((c) => c.box)).toEqual([1, 1, 1])
})

test('the session uses the date it started on, even if midnight passes during play', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 30, 23, 59))
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage, words: three })
  await remember(user, 1)
  vi.setSystemTime(new Date(2026, 9, 31, 0, 2))
  await remember(user, 2)
  expect(savedProgress(storage, profile.id).daily.date).toBe('2026-10-30')
})

test('Results lists the words answered wrong', async () => {
  const user = userEvent.setup()
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage, words: three })
  await remember(user, 1, /chưa nhớ/i)
  await remember(user, 2)
  expect(screen.getByText(/cần ôn lại/i)).toBeInTheDocument()
  expect(screen.getByTestId('review-list')).toHaveTextContent('word0')
  expect(screen.getByRole('link', { name: /về trang chủ/i })).toBeInTheDocument()
})

test('a topic with only 4 words plays a full session of 10 distinct words', () => {
  const words = [...[1, 2, 3, 4].map((i) => word('tiny', i)), ...Array.from({ length: 12 }, (_, i) => word('food', i + 1))]
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/play/flashcard?topic=tiny', storage, words })
  expect(screen.getByText('1/10')).toBeInTheDocument()
})

test('the daily session starts with flashcards for new words', () => {
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/play/daily', storage })
  expect(screen.getByRole('button', { name: /lật thẻ/i })).toBeInTheDocument()
})

test('Topics shows 0/12 for a fresh profile and counts learned words, per topic and in total', () => {
  const { storage } = seededStorage()
  const { unmount } = renderApp(<App />, { route: '/topics', storage })
  expect(screen.getByTitle(/đã học/i)).toHaveTextContent('0/12')
  unmount()
  const progress = emptyProgress()
  for (const w of fixtureWords.slice(0, 3)) progress.cards[w.id] = { box: 3, correct: 3, wrong: 0, due: '2030-01-01' }
  renderApp(<App />, { route: '/topics', storage: seededStorage({ progress }).storage })
  expect(screen.getByTitle(/đã học/i)).toHaveTextContent('3/12')
  expect(screen.getByText(/^đã học:/i)).toHaveTextContent('3/12')
})

test('choosing a topic lists the five modes', () => {
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/topics/animals', storage })
  for (const name of [/flashcard/i, /trắc nghiệm/i, /nghe rồi chọn/i, /ghép chữ/i, /ghép cặp/i]) {
    expect(screen.getByRole('link', { name })).toBeInTheDocument()
  }
  expect(screen.getByRole('link', { name: /ghép chữ/i })).toHaveAttribute('href', '/play/scramble?topic=animals')
})

test('play routes redirect to the picker when nobody is signed in', () => {
  renderApp(<App />, { route: '/play/daily' })
  expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
})

test('Chơi tiếp starts a new round', async () => {
  const user = userEvent.setup()
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/play/flashcard?topic=animals', storage, words: three })
  await remember(user, 3)
  await user.click(screen.getByRole('button', { name: /chơi tiếp/i }))
  expect(screen.getByRole('button', { name: /lật thẻ/i })).toBeInTheDocument()
})
