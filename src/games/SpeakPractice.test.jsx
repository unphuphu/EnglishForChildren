import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const listen = vi.fn()
const speak = vi.fn()
vi.mock('../core/speechRecognition.js', () => ({ listen: (...a) => listen(...a), isRecognitionSupported: () => true }))
vi.mock('../core/speech.js', () => ({ speak: (...a) => speak(...a), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))

import SpeakPractice from './SpeakPractice.jsx'

beforeEach(() => {
  listen.mockReset()
  speak.mockReset()
})

const heard = (...alternatives) => listen.mockResolvedValueOnce({ ok: true, alternatives })
const say = (user) => user.click(screen.getByRole('button', { name: /nói|thử lại/i }))

test('a right word shows praise and Tiếp tục reports correct', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  heard('dog')
  render(<SpeakPractice target="dog" onDone={onDone} />)
  await say(user)
  expect(await screen.findByText(/đúng rồi/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
  expect(onDone).toHaveBeenCalledWith({ correct: true, tries: 1, skipped: false })
})

test('a miss shows what was heard, plays the model voice and allows another try', async () => {
  const user = userEvent.setup()
  heard('dock')
  render(<SpeakPractice target="dog" onDone={() => {}} speechRate={0.8} voiceName="Libby" />)
  await say(user)
  expect(await screen.findByText(/dock/)).toBeInTheDocument()
  expect(speak).toHaveBeenCalledWith('dog', { rate: 0.8, voice: 'Libby' })
  heard('dog')
  await say(user)
  expect(await screen.findByText(/đúng rồi/i)).toBeInTheDocument()
})

test('a sentence miss lists the words that were not heard', async () => {
  const user = userEvent.setup()
  heard('I have dogs')
  render(<SpeakPractice target="I have two dogs" kind="sentence" onDone={() => {}} />)
  await say(user)
  expect(await screen.findByText(/chưa nghe thấy: two/i)).toBeInTheDocument()
})

test('after 3 misses only Tiếp tục remains and reports incorrect', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  for (let i = 0; i < 3; i++) heard('cat')
  render(<SpeakPractice target="dog" onDone={onDone} />)
  for (let i = 0; i < 3; i++) await say(user)
  expect(await screen.findByText(/đã thử 3 lần/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /thử lại/i })).toBeNull()
  expect(screen.queryByRole('button', { name: /bỏ qua/i })).toBeNull()
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
  expect(onDone).toHaveBeenCalledWith({ correct: false, tries: 3, skipped: false })
})

test('Bỏ qua skips without penalty', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  heard('cat')
  render(<SpeakPractice target="dog" onDone={onDone} />)
  await say(user)
  await user.click(await screen.findByRole('button', { name: /bỏ qua/i }))
  expect(onDone).toHaveBeenCalledWith({ correct: false, tries: 1, skipped: true })
})

test('silence asks to try again and a denied microphone explains how to allow it', async () => {
  const user = userEvent.setup()
  listen.mockResolvedValueOnce({ ok: false, reason: 'no-speech' })
  render(<SpeakPractice target="dog" onDone={() => {}} />)
  await say(user)
  expect(await screen.findByText(/chưa nghe thấy gì/i)).toBeInTheDocument()
  listen.mockResolvedValueOnce({ ok: false, reason: 'denied' })
  await say(user)
  expect(await screen.findByText(/chưa cho phép dùng micro/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /tiếp tục/i })).toBeInTheDocument()
})

test('without onDone there are no continue or skip buttons', async () => {
  const user = userEvent.setup()
  heard('cat')
  render(<SpeakPractice target="dog" />)
  await say(user)
  await screen.findByText(/mình nghe được/i)
  expect(screen.queryByRole('button', { name: /bỏ qua|tiếp tục/i })).toBeNull()
})
