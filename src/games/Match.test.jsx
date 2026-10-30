import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Match from './Match.jsx'

const words = [
  { id: 'a', word: 'dog', vi: 'con chó' },
  { id: 'b', word: 'cat', vi: 'con mèo' },
  { id: 'c', word: 'because', vi: 'bởi vì' },
]
const card = (id, kind) => screen.getByTestId(`card-${id}-${kind}`)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('cards start face down', () => {
  render(<Match words={words} pool={[]} onFinish={() => {}} />)
  expect(card('a', 'en')).toHaveTextContent('❓')
  expect(screen.queryByText('dog')).toBeNull()
})

test('a mismatch flips both cards back after 800 ms', () => {
  render(<Match words={words} pool={[]} onFinish={() => {}} />)
  fireEvent.click(card('a', 'en'))
  fireEvent.click(card('b', 'vi'))
  expect(screen.getByText('dog')).toBeInTheDocument()
  expect(screen.getByText('con mèo')).toBeInTheDocument()
  act(() => { vi.advanceTimersByTime(800) })
  expect(screen.queryByText('dog')).toBeNull()
  expect(screen.queryByText('con mèo')).toBeNull()
})

test('a third card cannot be flipped while a mismatch is showing', () => {
  render(<Match words={words} pool={[]} onFinish={() => {}} />)
  fireEvent.click(card('a', 'en'))
  fireEvent.click(card('b', 'vi'))
  fireEvent.click(card('c', 'en'))
  expect(screen.queryByText('because')).toBeNull()
})

test('a matching pair stays revealed', () => {
  render(<Match words={words} pool={[]} onFinish={() => {}} />)
  fireEvent.click(card('a', 'en'))
  fireEvent.click(card('a', 'vi'))
  act(() => { vi.advanceTimersByTime(2000) })
  expect(screen.getByText('dog')).toBeInTheDocument()
  expect(screen.getByText('con chó')).toBeInTheDocument()
})

test('clicking the same card twice does not match it with itself', () => {
  render(<Match words={words} pool={[]} onFinish={() => {}} />)
  fireEvent.click(card('a', 'en'))
  fireEvent.click(card('a', 'en'))
  act(() => { vi.advanceTimersByTime(2000) })
  expect(screen.getByText('dog')).toBeInTheDocument()
})

test('finishing reports one result per word, marking the word that was mismatched', () => {
  const onFinish = vi.fn()
  render(<Match words={words} pool={[]} onFinish={onFinish} />)
  fireEvent.click(card('a', 'en'))
  fireEvent.click(card('b', 'vi'))
  act(() => { vi.advanceTimersByTime(800) })
  for (const id of ['a', 'b', 'c']) {
    fireEvent.click(card(id, 'en'))
    fireEvent.click(card(id, 'vi'))
  }
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledWith([
    { wordId: 'a', correct: false },
    { wordId: 'b', correct: false },
    { wordId: 'c', correct: true },
  ])
})

test('the timer counts seconds', () => {
  render(<Match words={words} pool={[]} onFinish={() => {}} />)
  act(() => { vi.advanceTimersByTime(3000) })
  expect(screen.getByText(/3s/)).toBeInTheDocument()
})
