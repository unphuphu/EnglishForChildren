import { buildMatchBoard, MAX_MATCH_WORDS } from './matchLogic.js'

const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, word: `word${i}`, vi: `nghĩa ${i}` }))

test('six words give 12 cards, one en and one vi per word', () => {
  const board = buildMatchBoard(mk(6))
  expect(board).toHaveLength(12)
  for (let i = 0; i < 6; i++) {
    const cards = board.filter((c) => c.wordId === `w${i}`)
    expect(cards.map((c) => c.kind).sort()).toEqual(['en', 'vi'])
  }
})

test('three words give 6 cards', () => {
  expect(buildMatchBoard(mk(3))).toHaveLength(6)
})

test('more than the maximum words are capped', () => {
  expect(MAX_MATCH_WORDS).toBe(6)
  expect(buildMatchBoard(mk(9))).toHaveLength(12)
})

test('card text is the English word or the Vietnamese meaning, never empty', () => {
  const board = buildMatchBoard([{ id: 'x', word: 'because', vi: 'bởi vì' }])
  expect(board.find((c) => c.kind === 'en').text).toBe('because')
  expect(board.find((c) => c.kind === 'vi').text).toBe('bởi vì')
})

test('card ids are unique', () => {
  const board = buildMatchBoard(mk(6))
  expect(new Set(board.map((c) => c.id)).size).toBe(12)
})

test('the board is shuffled by the given rng', () => {
  const ordered = buildMatchBoard(mk(6), () => 0.999999)
  const other = buildMatchBoard(mk(6), () => 0)
  expect(ordered.map((c) => c.id)).not.toEqual(other.map((c) => c.id))
})
