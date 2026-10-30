import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => true }))

import Scramble from './Scramble.jsx'

const dog = { id: 'a-001', word: 'dog', vi: 'con chó', emoji: '🐶' }
const iceCream = { id: 'a-002', word: 'ice-cream', vi: 'kem' }

async function tap(user, letter) {
  const button = screen.getAllByRole('button', { name: letter }).find((b) => !b.disabled)
  await user.click(button)
}

test('building the word correctly records correct:true', async () => {
  const user = userEvent.setup()
  const onFinish = vi.fn()
  render(<Scramble words={[dog]} pool={[]} onFinish={onFinish} />)
  for (const l of 'dog') await tap(user, l)
  expect(screen.getByRole('status')).toHaveTextContent(/đúng/i)
  await user.click(screen.getByRole('button', { name: /kết quả/i }))
  expect(onFinish).toHaveBeenCalledWith([{ wordId: 'a-001', correct: true }])
})

test('two wrong tries record correct:false and reveal the answer', async () => {
  const user = userEvent.setup()
  const onFinish = vi.fn()
  render(<Scramble words={[dog]} pool={[]} onFinish={onFinish} />)
  for (const l of 'god') await tap(user, l)
  expect(screen.getByRole('status')).toHaveTextContent(/thử lại/i)
  for (const l of 'god') await tap(user, l)
  expect(screen.getByRole('status')).toHaveTextContent('dog')
  await user.click(screen.getByRole('button', { name: /kết quả/i }))
  expect(onFinish).toHaveBeenCalledWith([{ wordId: 'a-001', correct: false }])
})

test('a hyphenated word is solved by tapping only its letters', async () => {
  const user = userEvent.setup()
  const onFinish = vi.fn()
  render(<Scramble words={[iceCream]} pool={[]} onFinish={onFinish} />)
  for (const l of 'icecream') await tap(user, l)
  await user.click(screen.getByRole('button', { name: /kết quả/i }))
  expect(onFinish).toHaveBeenCalledWith([{ wordId: 'a-002', correct: true }])
})

test('the clue shows the meaning, and never "undefined" when there is no emoji', () => {
  render(<Scramble words={[iceCream]} pool={[]} onFinish={() => {}} />)
  expect(screen.getByText('kem')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/undefined|null/)
})

test('a chosen letter can be taken back', async () => {
  const user = userEvent.setup()
  render(<Scramble words={[dog]} pool={[]} onFinish={() => {}} />)
  await tap(user, 'd')
  await user.click(screen.getByRole('button', { name: /bỏ d/i }))
  expect(screen.queryByRole('button', { name: /bỏ d/i })).toBeNull()
})
