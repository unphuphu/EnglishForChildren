import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true }))
const speechAvailable = { value: true }
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => speechAvailable.value }))

import Flashcard from './Flashcard.jsx'
import { speak } from '../core/speech.js'

const dog = { id: 'a-001', word: 'dog', vi: 'con chó', ipa: '/dɒɡ/', emoji: '🐶', example: 'The dog runs.', exampleVi: 'Con chó chạy.' }
const because = { id: 'a-002', word: 'because', vi: 'bởi vì', ipa: '/bɪˈkɒz/', example: 'I smile because I am happy.', exampleVi: 'Tôi cười vì tôi vui.' }

beforeEach(() => {
  speechAvailable.value = true
  speak.mockClear()
})

test('the front shows the word and flipping reveals meaning and example', async () => {
  const user = userEvent.setup()
  render(<Flashcard words={[dog]} pool={[]} onFinish={() => {}} />)
  expect(screen.getByText('dog')).toBeInTheDocument()
  expect(screen.queryByText('con chó')).toBeNull()
  await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
  expect(screen.getByText('con chó')).toBeInTheDocument()
  expect(screen.getByText('The dog runs.')).toBeInTheDocument()
  expect(screen.getByText('Con chó chạy.')).toBeInTheDocument()
})

test('self-assessment is only possible after flipping', async () => {
  const user = userEvent.setup()
  render(<Flashcard words={[dog]} pool={[]} onFinish={() => {}} />)
  expect(screen.queryByRole('button', { name: /đã nhớ/i })).toBeNull()
  await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
  expect(screen.getByRole('button', { name: /đã nhớ/i })).toBeInTheDocument()
})

test('marking remembered then forgotten finishes with both results', async () => {
  const user = userEvent.setup()
  const onFinish = vi.fn()
  render(<Flashcard words={[dog, because]} pool={[]} onFinish={onFinish} />)
  await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
  await user.click(screen.getByRole('button', { name: /đã nhớ/i }))
  expect(onFinish).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
  await user.click(screen.getByRole('button', { name: /chưa nhớ/i }))
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith([
    { wordId: 'a-001', correct: true, selfReported: true },
    { wordId: 'a-002', correct: false, selfReported: true },
  ])
})

test('a word without emoji renders no emoji node and no "undefined"', () => {
  const { container } = render(<Flashcard words={[because]} pool={[]} onFinish={() => {}} />)
  expect(container.querySelector('.emoji')).toBeNull()
  expect(document.body.textContent).not.toMatch(/undefined|null/)
})

test('the speaker button speaks the word, and is hidden without speech', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<Flashcard words={[dog]} pool={[]} onFinish={() => {}} />)
  await user.click(screen.getByRole('button', { name: /nghe/i }))
  expect(speak).toHaveBeenCalledWith('dog', expect.anything())
  unmount()
  speechAvailable.value = false
  render(<Flashcard words={[dog]} pool={[]} onFinish={() => {}} />)
  expect(screen.queryByRole('button', { name: /nghe/i })).toBeNull()
})
