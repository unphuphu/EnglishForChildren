import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))
const available = { value: true }
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => available.value }))

import TileExercise from './TileExercise.jsx'
import { speak } from '../core/speech.js'

const base = { sentenceId: 's1', lessonId: 'l', wordIds: ['a-001'], en: 'She likes the dog.', vi: 'Cô ấy thích con chó.' }
const order = { ...base, type: 'order', tokens: ['dog.', 'the', 'She', 'likes'] }
const translate = { ...base, type: 'translate', prompt: 'Cô ấy thích con chó.', tokens: ['has', 'She', 'likes', 'the', 'dog.', 'are'] }
const repeated = {
  ...base, type: 'order', en: 'The cat sees the dog.', vi: 'Con mèo nhìn con chó.', tokens: ['dog.', 'the', 'sees', 'cat', 'The'],
}

async function tap(user, words) {
  for (const text of words) {
    const tile = screen.getAllByRole('button', { name: text }).find((b) => !b.disabled)
    await user.click(tile)
  }
}
const check = (user) => user.click(screen.getByRole('button', { name: /kiểm tra/i }))
const next = (user) => user.click(screen.getByRole('button', { name: /tiếp tục/i }))

beforeEach(() => {
  available.value = true
  speak.mockClear()
})

describe('order', () => {
  test('building the right sentence is correct and reports the answer once', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<TileExercise exercise={order} onAnswer={onAnswer} />)
    await tap(user, ['She', 'likes', 'the', 'dog.'])
    await check(user)
    expect(screen.getByRole('status')).toHaveTextContent(/đúng/i)
    await next(user)
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith({ sentenceId: 's1', lessonId: 'l', wordIds: ['a-001'], correct: true })
  })

  test('a wrong order is incorrect and shows the correct sentence with its translation', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<TileExercise exercise={order} onAnswer={onAnswer} />)
    await tap(user, ['likes', 'She', 'the', 'dog.'])
    await check(user)
    expect(screen.getByRole('status')).toHaveTextContent(/chưa đúng/i)
    expect(screen.getByRole('status')).toHaveTextContent('She likes the dog.')
    expect(screen.getByText('Cô ấy thích con chó.')).toBeInTheDocument()
    await next(user)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: false }))
  })

  test('Kiểm tra stays disabled until every tile is placed', async () => {
    const user = userEvent.setup()
    render(<TileExercise exercise={order} onAnswer={() => {}} />)
    expect(screen.getByRole('button', { name: /kiểm tra/i })).toBeDisabled()
    await tap(user, ['She', 'likes', 'the'])
    expect(screen.getByRole('button', { name: /kiểm tra/i })).toBeDisabled()
    await tap(user, ['dog.'])
    expect(screen.getByRole('button', { name: /kiểm tra/i })).toBeEnabled()
  })

  test('a placed tile can be returned', async () => {
    const user = userEvent.setup()
    render(<TileExercise exercise={order} onAnswer={() => {}} />)
    await tap(user, ['She'])
    await user.click(screen.getByRole('button', { name: /bỏ She/i }))
    expect(screen.queryByRole('button', { name: /bỏ She/i })).toBeNull()
    expect(screen.getByRole('button', { name: 'She' })).toBeEnabled()
  })

  test('repeated words are each usable exactly once', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<TileExercise exercise={repeated} onAnswer={onAnswer} />)
    await tap(user, ['The', 'cat', 'sees', 'the', 'dog.'])
    await check(user)
    await next(user)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }))
  })

  test('the order exercise does not show a Vietnamese prompt before the check', () => {
    render(<TileExercise exercise={order} onAnswer={() => {}} />)
    expect(screen.queryByText('Cô ấy thích con chó.')).toBeNull()
  })

  test('after checking the tiles are locked and Kiểm tra is gone', async () => {
    const user = userEvent.setup()
    render(<TileExercise exercise={order} onAnswer={() => {}} />)
    await tap(user, ['She', 'likes', 'the', 'dog.'])
    await check(user)
    expect(screen.queryByRole('button', { name: /kiểm tra/i })).toBeNull()
    screen.getAllByRole('button').filter((b) => /^bỏ /.test(b.getAttribute('aria-label') ?? '')).forEach((b) => expect(b).toBeDisabled())
  })

  test('answering twice in a row reports only once', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<TileExercise exercise={order} onAnswer={onAnswer} />)
    await tap(user, ['She', 'likes', 'the', 'dog.'])
    await check(user)
    await user.dblClick(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })
})

describe('translate', () => {
  test('shows the Vietnamese prompt and the extra tiles', () => {
    render(<TileExercise exercise={translate} onAnswer={() => {}} />)
    expect(screen.getByText('Cô ấy thích con chó.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'has' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'are' })).toBeInTheDocument()
  })

  test('the correct sentence without the extra tiles is correct', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<TileExercise exercise={translate} onAnswer={onAnswer} />)
    await tap(user, ['She', 'likes', 'the', 'dog.'])
    await check(user)
    await next(user)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }))
  })

  test('using an extra tile makes it wrong', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<TileExercise exercise={translate} onAnswer={onAnswer} />)
    await tap(user, ['She', 'has', 'the', 'dog.'])
    await check(user)
    await next(user)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: false }))
  })

  test('Kiểm tra is disabled until at least one tile is placed', async () => {
    const user = userEvent.setup()
    render(<TileExercise exercise={translate} onAnswer={() => {}} />)
    expect(screen.getByRole('button', { name: /kiểm tra/i })).toBeDisabled()
    await tap(user, ['She'])
    expect(screen.getByRole('button', { name: /kiểm tra/i })).toBeEnabled()
  })
})

describe('reading aloud', () => {
  test('the correct sentence is read once after checking and never before', async () => {
    const user = userEvent.setup()
    render(<TileExercise exercise={order} onAnswer={() => {}} voiceName="Libby" speechRate={0.8} />)
    await tap(user, ['She', 'likes', 'the', 'dog.'])
    expect(speak).not.toHaveBeenCalled()
    await check(user)
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak).toHaveBeenCalledWith('She likes the dog.', { rate: 0.8, voice: 'Libby' })
    await next(user)
    expect(speak).toHaveBeenCalledTimes(1)
  })

  test('a wrong answer also reads the correct sentence', async () => {
    const user = userEvent.setup()
    render(<TileExercise exercise={order} onAnswer={() => {}} />)
    await tap(user, ['likes', 'She', 'the', 'dog.'])
    await check(user)
    expect(speak).toHaveBeenCalledWith('She likes the dog.', expect.anything())
  })

  test('the speaker button replays the sentence', async () => {
    const user = userEvent.setup()
    render(<TileExercise exercise={order} onAnswer={() => {}} />)
    await tap(user, ['She', 'likes', 'the', 'dog.'])
    await check(user)
    await user.click(screen.getByRole('button', { name: /nghe lại/i }))
    expect(speak).toHaveBeenCalledTimes(2)
  })

  test('without speech there is no sound and no speaker button', async () => {
    available.value = false
    const user = userEvent.setup()
    render(<TileExercise exercise={order} onAnswer={() => {}} />)
    await tap(user, ['She', 'likes', 'the', 'dog.'])
    await check(user)
    expect(speak).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /nghe lại/i })).toBeNull()
  })
})
