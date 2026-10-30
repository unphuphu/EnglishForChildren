import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true }))
const speechAvailable = { value: true }
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => speechAvailable.value }))

import Quiz from './Quiz.jsx'
import Listen from './Listen.jsx'
import { speak } from '../core/speech.js'

const mk = (id, w, viText, emoji) => ({ id, word: w, vi: viText, example: `${w} example`, ...(emoji ? { emoji } : {}) })
const words = [mk('a-001', 'dog', 'con chó', '🐶'), mk('a-002', 'cat', 'con mèo', '🐱'), mk('a-003', 'because', 'bởi vì')]
const pool = [...words, mk('a-004', 'bird', 'con chim', '🐦'), mk('a-005', 'fish', 'con cá', '🐟'), mk('a-006', 'cow', 'con bò', '🐮')]

const options = () => within(screen.getByRole('group', { name: /đáp án/i })).getAllByRole('button')
const choose = async (user, text) => user.click(within(screen.getByRole('group', { name: /đáp án/i })).getByText(text))
const wrongOption = (answer) => options().find((b) => b.textContent !== answer)

beforeEach(() => {
  speechAvailable.value = true
  speak.mockClear()
})

test('Quiz: all correct answers produce 3 correct results and one onFinish call', async () => {
  const user = userEvent.setup()
  const onFinish = vi.fn()
  render(<Quiz words={words} pool={pool} onFinish={onFinish} />)
  await choose(user, 'dog')
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
  await choose(user, 'con mèo')
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
  await choose(user, 'because')
  expect(onFinish).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /kết quả/i }))
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith([
    { wordId: 'a-001', correct: true },
    { wordId: 'a-002', correct: true },
    { wordId: 'a-003', correct: true },
  ])
})

test('Quiz: a wrong choice records correct:false', async () => {
  const user = userEvent.setup()
  const onFinish = vi.fn()
  render(<Quiz words={[words[0]]} pool={pool} onFinish={onFinish} />)
  await user.click(wrongOption('dog'))
  await user.click(screen.getByRole('button', { name: /kết quả/i }))
  expect(onFinish).toHaveBeenCalledWith([{ wordId: 'a-001', correct: false }])
})

test('Quiz: a word without emoji shows its meaning and the page never shows "undefined"', () => {
  render(<Quiz words={[words[2]]} pool={pool} onFinish={() => {}} />)
  expect(screen.getByText('bởi vì')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/undefined|null/)
})

test('Listen: auto-plays the first word and has a speaker button', () => {
  render(<Listen words={words} pool={pool} onFinish={() => {}} />)
  expect(speak).toHaveBeenCalledWith('dog', expect.anything())
  expect(screen.getByRole('button', { name: /nghe lại/i })).toBeInTheDocument()
})

test('Listen: without speech there is no speaker button and the meaning is shown instead', () => {
  speechAvailable.value = false
  render(<Listen words={words} pool={pool} onFinish={() => {}} />)
  expect(screen.queryByRole('button', { name: /nghe lại/i })).toBeNull()
  expect(speak).not.toHaveBeenCalled()
  expect(screen.getByText('con chó')).toBeInTheDocument()
})

test('Listen: choosing the heard word is correct', async () => {
  const user = userEvent.setup()
  const onFinish = vi.fn()
  render(<Listen words={[words[0]]} pool={pool} onFinish={onFinish} />)
  await choose(user, 'dog')
  await user.click(screen.getByRole('button', { name: /kết quả/i }))
  expect(onFinish).toHaveBeenCalledWith([{ wordId: 'a-001', correct: true }])
})
