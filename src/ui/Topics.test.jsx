import { screen, within } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))

import App from '../App.jsx'
import { renderApp, seededStorage } from '../test/utils.jsx'

test('topic cards and a total line count the words already learned', () => {
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/topics', storage })
  const total = screen.getByText(/đã học tổng cộng/i)
  expect(total).toHaveTextContent(/0\/\d+ từ/)

  const cards = screen.getAllByRole('link').filter((a) => a.classList.contains('topic-card'))
  const sum = cards.reduce((s, c) => s + Number(within(c).getByTitle(/đã học/i).textContent.split('/')[1]), 0)
  expect(total).toHaveTextContent(`0/${sum} từ`)
})
