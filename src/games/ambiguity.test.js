import { buildQuestion } from './quizLogic.js'
import { buildMatchBoard } from './matchLogic.js'

const w = (id, word, vi) => ({ id, word, vi })

describe('quiz options never contain a second correct answer', () => {
  const light = w('adj-1', 'light', 'nhẹ')
  const pool = [
    light,
    w('home-1', 'light', 'ánh sáng / đèn'),
    w('adj-2', 'lamp', 'nhẹ'),
    w('adj-3', 'heavy', 'nặng'),
    w('adj-4', 'dark', 'tối'),
    w('adj-5', 'bright', 'sáng'),
    w('adj-6', 'soft', 'mềm'),
  ]

  test('en to vi: a word with the same English text is not used as a distractor', () => {
    for (let i = 0; i < 30; i++) {
      const q = buildQuestion(light, pool, 'en2vi')
      expect(q.options).not.toContain('ánh sáng / đèn')
      expect(q.options.filter((o) => o === 'nhẹ')).toHaveLength(1)
    }
  })

  test('vi to en: a word with the same Vietnamese meaning is not used as a distractor', () => {
    for (let i = 0; i < 30; i++) {
      const q = buildQuestion(light, pool, 'vi2en')
      expect(q.options).not.toContain('lamp')
      expect(q.options.filter((o) => o === 'light')).toHaveLength(1)
    }
  })

  test('the comparison ignores case and surrounding spaces', () => {
    const q = buildQuestion(w('a', 'Light', 'nhẹ'), [w('b', ' light ', 'x'), w('c', 'dark', 'tối')], 'en2vi')
    expect(q.options).not.toContain('x')
  })
})

describe('match boards never contain look-alike pairs', () => {
  test('a second word with the same English text is dropped', () => {
    const board = buildMatchBoard([w('a', 'light', 'nhẹ'), w('b', 'light', 'ánh sáng')])
    expect([...new Set(board.map((c) => c.wordId))]).toEqual(['a'])
    expect(board).toHaveLength(2)
  })

  test('a second word with the same Vietnamese meaning is dropped', () => {
    const board = buildMatchBoard([w('a', 'start', 'bắt đầu'), w('b', 'begin', 'bắt đầu'), w('c', 'end', 'kết thúc')])
    expect([...new Set(board.map((c) => c.wordId))].sort()).toEqual(['a', 'c'])
  })

  test('dropping duplicates happens before the 6-word cap', () => {
    const words = [w('a', 'x', 'm'), w('b', 'x', 'n'), ...Array.from({ length: 6 }, (_, i) => w(`w${i}`, `word${i}`, `nghĩa${i}`))]
    expect(buildMatchBoard(words)).toHaveLength(12)
  })
})
