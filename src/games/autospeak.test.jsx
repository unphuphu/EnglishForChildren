import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))
const available = { value: true }
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => available.value }))

import Flashcard from './Flashcard.jsx'
import Quiz from './Quiz.jsx'
import Scramble from './Scramble.jsx'
import Match from './Match.jsx'
import { speak } from '../core/speech.js'

const mk = (id, w, viText) => ({ id, word: w, vi: viText, ipa: '/x/', example: 'E.', exampleVi: 'V.' })
const dog = mk('a-001', 'dog', 'con chó')
const cat = mk('a-002', 'cat', 'con mèo')
const pool = [dog, cat, mk('a-003', 'bird', 'con chim'), mk('a-004', 'fish', 'con cá'), mk('a-005', 'cow', 'con bò')]

const spoken = () => speak.mock.calls.map((c) => c[0])

beforeEach(() => {
  available.value = true
  speak.mockClear()
})

describe('Flashcard', () => {
  test('reads each word once when its card appears', async () => {
    const user = userEvent.setup()
    render(<Flashcard words={[dog, cat]} pool={[]} onFinish={() => {}} />)
    expect(spoken()).toEqual(['dog'])
    await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
    expect(spoken()).toEqual(['dog'])
    await user.click(screen.getByRole('button', { name: /đã nhớ/i }))
    expect(spoken()).toEqual(['dog', 'cat'])
  })

  test('uses the chosen voice and rate', () => {
    render(<Flashcard words={[dog]} pool={[]} onFinish={() => {}} voiceName="Libby" speechRate={0.8} />)
    expect(speak).toHaveBeenCalledWith('dog', { rate: 0.8, voice: 'Libby' })
  })

  test('stays silent when speech is unavailable', () => {
    available.value = false
    render(<Flashcard words={[dog]} pool={[]} onFinish={() => {}} />)
    expect(speak).not.toHaveBeenCalled()
  })
})

describe('Quiz', () => {
  const options = () => within(screen.getByRole('group', { name: /đáp án/i }))

  test('a Vietnamese-to-English question reads the word only after answering, once', async () => {
    const user = userEvent.setup()
    render(<Quiz words={[dog]} pool={pool} onFinish={() => {}} />)
    expect(speak).not.toHaveBeenCalled()
    await user.click(options().getByText('dog'))
    expect(spoken()).toEqual(['dog'])
  })

  test('also reads the word after a wrong answer', async () => {
    const user = userEvent.setup()
    render(<Quiz words={[dog]} pool={pool} onFinish={() => {}} />)
    await user.click(options().getAllByRole('button').find((b) => b.textContent !== 'dog'))
    expect(spoken()).toEqual(['dog'])
  })

  test('an English-to-Vietnamese question reads the shown word when it appears, once', async () => {
    const user = userEvent.setup()
    render(<Quiz words={[dog, cat]} pool={pool} onFinish={() => {}} />)
    await user.click(options().getByText('dog'))
    await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(spoken()).toEqual(['dog', 'cat'])
    await user.click(options().getByText('con mèo'))
    expect(spoken()).toEqual(['dog', 'cat'])
  })
})

describe('Scramble', () => {
  test('reads the word after it is solved, not before', async () => {
    const user = userEvent.setup()
    render(<Scramble words={[dog]} pool={[]} onFinish={() => {}} />)
    expect(speak).not.toHaveBeenCalled()
    for (const l of 'dog') {
      await user.click(screen.getAllByRole('button', { name: l }).find((b) => !b.disabled))
    }
    expect(spoken()).toEqual(['dog'])
  })

  test('reads the answer when it is revealed after two wrong tries', async () => {
    const user = userEvent.setup()
    render(<Scramble words={[dog]} pool={[]} onFinish={() => {}} />)
    for (const l of 'godgod') {
      await user.click(screen.getAllByRole('button', { name: l }).find((b) => !b.disabled))
    }
    expect(spoken()).toEqual(['dog'])
  })
})

describe('Match', () => {
  const words = [dog, cat]

  test('reads an English card when it is flipped but not a Vietnamese one', () => {
    render(<Match words={words} pool={[]} onFinish={() => {}} voiceName="Libby" speechRate={0.9} />)
    fireEvent.click(screen.getByTestId('card-a-001-vi'))
    expect(speak).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('card-a-001-en'))
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak).toHaveBeenCalledWith('dog', { rate: 0.9, voice: 'Libby' })
  })
})
