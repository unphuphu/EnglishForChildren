import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => true }))

import ChoiceExercise from './ChoiceExercise.jsx'
import SentenceExercises from './SentenceExercises.jsx'
import { speak } from '../core/speech.js'

const ids = (n) => ({ sentenceId: `s${n}`, lessonId: 'l', wordIds: [`w${n}`] })
const sentence = { en: 'She likes the dog.', vi: 'Cô ấy thích con chó.' }
const blank = { ...ids(1), ...sentence, type: 'blank', text: 'She ___ the dog.', options: ['like', 'likes', 'liking'], answer: 'likes' }
const choose = {
  ...ids(2), ...sentence, type: 'choose', answer: 'She likes the dog.',
  options: ['She like the dog.', 'She likes the dog.', 'She liking the dog.'],
}
const order = { ...ids(3), ...sentence, type: 'order', tokens: ['dog.', 'the', 'She', 'likes'] }
const translate = { ...ids(4), ...sentence, type: 'translate', prompt: sentence.vi, tokens: ['are', 'She', 'likes', 'the', 'dog.'] }

const group = () => within(screen.getByRole('group', { name: /đáp án/i }))
const next = (user) => user.click(screen.getByRole('button', { name: /tiếp tục/i }))

beforeEach(() => speak.mockClear())

describe('ChoiceExercise', () => {
  test('blank: shows the sentence with a gap and every option once', () => {
    render(<ChoiceExercise exercise={blank} onAnswer={() => {}} />)
    expect(screen.getByText('She ___ the dog.')).toBeInTheDocument()
    expect(group().getAllByRole('button').map((b) => b.textContent)).toEqual(['like', 'likes', 'liking'])
  })

  test('blank: the right option is correct, is read once after answering, and is reported once', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<ChoiceExercise exercise={blank} onAnswer={onAnswer} voiceName="Libby" speechRate={0.9} />)
    expect(speak).not.toHaveBeenCalled()
    await user.click(group().getByText('likes'))
    expect(screen.getByRole('status')).toHaveTextContent(/đúng/i)
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak).toHaveBeenCalledWith('She likes the dog.', { rate: 0.9, voice: 'Libby' })
    await next(user)
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith({ sentenceId: 's1', lessonId: 'l', wordIds: ['w1'], correct: true })
  })

  test('blank: a wrong option is incorrect and reveals the correct sentence and translation', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<ChoiceExercise exercise={blank} onAnswer={onAnswer} />)
    await user.click(group().getByText('like'))
    expect(screen.getByRole('status')).toHaveTextContent(/chưa đúng/i)
    expect(screen.getByRole('status')).toHaveTextContent('She likes the dog.')
    expect(screen.getByText('Cô ấy thích con chó.')).toBeInTheDocument()
    await next(user)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: false }))
  })

  test('the options are locked after the first tap', async () => {
    const user = userEvent.setup()
    render(<ChoiceExercise exercise={blank} onAnswer={() => {}} />)
    await user.click(group().getByText('like'))
    group().getAllByRole('button').forEach((b) => expect(b).toBeDisabled())
  })

  test('choose: picking the correct sentence is correct', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<ChoiceExercise exercise={choose} onAnswer={onAnswer} />)
    await user.click(group().getByText('She likes the dog.'))
    await next(user)
    expect(onAnswer).toHaveBeenCalledWith({ sentenceId: 's2', lessonId: 'l', wordIds: ['w2'], correct: true })
  })

  test('choose: picking a wrong sentence is incorrect', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<ChoiceExercise exercise={choose} onAnswer={onAnswer} />)
    await user.click(group().getByText('She liking the dog.'))
    await next(user)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: false }))
  })

  test('double-clicking Tiếp tục reports once', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<ChoiceExercise exercise={blank} onAnswer={onAnswer} />)
    await user.click(group().getByText('likes'))
    await user.dblClick(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })
})

describe('SentenceExercises', () => {
  async function playRight(user) {
    await user.click(group().getByText('likes'))
    await next(user)
    await user.click(group().getByText('She likes the dog.'))
    await next(user)
    for (const text of ['She', 'likes', 'the', 'dog.']) {
      await user.click(screen.getAllByRole('button', { name: text }).find((b) => !b.disabled))
    }
    await user.click(screen.getByRole('button', { name: /kiểm tra/i }))
    await next(user)
    for (const text of ['She', 'likes', 'the', 'dog.']) {
      await user.click(screen.getAllByRole('button', { name: text }).find((b) => !b.disabled))
    }
    await user.click(screen.getByRole('button', { name: /kiểm tra/i }))
    await next(user)
  }

  test('collects one result per exercise in order and finishes once', async () => {
    const user = userEvent.setup()
    const onFinish = vi.fn()
    render(<SentenceExercises exercises={[blank, choose, order, translate]} onFinish={onFinish} />)
    await playRight(user)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith([
      { sentenceId: 's1', lessonId: 'l', wordIds: ['w1'], correct: true },
      { sentenceId: 's2', lessonId: 'l', wordIds: ['w2'], correct: true },
      { sentenceId: 's3', lessonId: 'l', wordIds: ['w3'], correct: true },
      { sentenceId: 's4', lessonId: 'l', wordIds: ['w4'], correct: true },
    ])
  })

  test('shows progress as k/n', async () => {
    const user = userEvent.setup()
    render(<SentenceExercises exercises={[blank, choose, order, translate]} onFinish={() => {}} />)
    expect(screen.getByText('1/4')).toBeInTheDocument()
    await user.click(group().getByText('likes'))
    await next(user)
    expect(screen.getByText('2/4')).toBeInTheDocument()
  })

  test('an empty list finishes immediately with no results, once', () => {
    const onFinish = vi.fn()
    const { rerender } = render(<SentenceExercises exercises={[]} onFinish={onFinish} />)
    rerender(<SentenceExercises exercises={[]} onFinish={onFinish} />)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledWith([])
  })

  test('the voice and rate reach the exercises', async () => {
    const user = userEvent.setup()
    render(<SentenceExercises exercises={[blank]} onFinish={() => {}} voiceName="Libby" speechRate={0.7} />)
    await user.click(group().getByText('likes'))
    expect(speak).toHaveBeenCalledWith('She likes the dog.', { rate: 0.7, voice: 'Libby' })
  })

  test('a single exercise finishes after its answer', async () => {
    const user = userEvent.setup()
    const onFinish = vi.fn()
    render(<SentenceExercises exercises={[choose]} onFinish={onFinish} />)
    await user.click(group().getByText('She like the dog.'))
    await next(user)
    expect(onFinish).toHaveBeenCalledWith([{ sentenceId: 's2', lessonId: 'l', wordIds: ['w2'], correct: false }])
  })
})
