import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))

import App from '../App.jsx'
import { renderApp, seededStorage } from '../test/utils.jsx'

const back = () => screen.getByRole('link', { name: /trang chủ/i })

describe('back navigation', () => {
  test.each(['/settings', '/profile', '/topics', '/topics/animals', '/games/quiz', '/play/quiz?topic=animals'])(
    '%s has a way back to the home page',
    (route) => {
      renderApp(<App />, { route, storage: seededStorage().storage })
      expect(back()).toHaveAttribute('href', '/')
    },
  )

  test('the home page itself shows no back link', () => {
    renderApp(<App />, { storage: seededStorage().storage })
    expect(screen.queryByRole('link', { name: /^← trang chủ/i })).toBeNull()
  })

  test('clicking back from Settings returns to the home page', async () => {
    const user = userEvent.setup()
    renderApp(<App />, { route: '/settings', storage: seededStorage().storage })
    await user.click(back())
    expect(screen.getByText(/xin chào, bin/i)).toBeInTheDocument()
  })

  test('the add-profile screen can be cancelled', async () => {
    const user = userEvent.setup()
    renderApp(<App />, { route: '/add-profile' })
    await user.click(screen.getByRole('link', { name: /quay lại/i }))
    expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
  })
})

describe('games are reachable from the home page', () => {
  test('Home lists all five games as links', () => {
    renderApp(<App />, { storage: seededStorage().storage })
    const expected = {
      flashcard: /flashcard/i, quiz: /trắc nghiệm/i, listen: /nghe rồi chọn/i, scramble: /ghép chữ/i, match: /ghép cặp/i,
    }
    for (const [mode, name] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `/games/${mode}`)
    }
  })

  test('a game page offers every topic plus an all-topics option', () => {
    renderApp(<App />, { route: '/games/scramble', storage: seededStorage().storage })
    expect(screen.getByRole('heading', { name: /ghép chữ/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tất cả chủ đề/i })).toHaveAttribute('href', '/play/scramble?topic=all')
    expect(screen.getByRole('link', { name: /animals/i })).toHaveAttribute('href', '/play/scramble?topic=animals')
  })

  test('an unknown game redirects home', () => {
    renderApp(<App />, { route: '/games/nope', storage: seededStorage().storage })
    expect(screen.getByText(/xin chào, bin/i)).toBeInTheDocument()
  })

  test('playing a game over all topics starts with its first question', () => {
    renderApp(<App />, { route: '/play/quiz?topic=all', storage: seededStorage().storage })
    expect(screen.getByRole('group', { name: /đáp án/i })).toBeInTheDocument()
  })

  test('the Topics page links back to the game list too', () => {
    renderApp(<App />, { route: '/topics', storage: seededStorage().storage })
    expect(screen.getByRole('link', { name: /trang chủ/i })).toBeInTheDocument()
  })
})
