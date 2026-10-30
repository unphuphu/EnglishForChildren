import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))

import App from '../App.jsx'
import { renderApp, seededStorage, savedProgress, fixtureWords, fixtureSentence } from '../test/utils.jsx'
import { answerExerciseRight, answerExerciseWrong, answerQuiz } from '../test/exerciseHelpers.js'
import { emptyProgress } from '../core/progress.js'

const lessons5 = Array.from({ length: 5 }, (_, i) => ({
  id: `g${i + 1}`,
  title: `G${i + 1}`,
  order: i + 1,
  sessions: 1,
  explain: [{ vi: 'Giải thích.', examples: [{ en: 'A b.', vi: 'C.' }] }],
  sentences: [0, 1, 2].map((j) => fixtureSentence(`g${i + 1}-${j}`, 1, i * 2 + j)),
}))

const cards = (count = 12) => Object.fromEntries(
  fixtureWords.slice(0, count).map((w) => [w.id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01' }]),
)
const finishedGrammar = (n = 5) => ({
  ...emptyProgress().grammar,
  lessons: Object.fromEntries(Array.from({ length: n }, (_, i) => [`g${i + 1}`, { partsDone: 1, correct: 0, wrong: 0 }])),
})
const storageWith = (over = {}) => seededStorage({
  progress: { ...emptyProgress(), cards: cards(), grammar: finishedGrammar(), ...over },
})
const render = (route, storage, extra = {}) => renderApp(<App />, { route, storage, lessons: lessons5, roadmap: [], ...extra })

async function play(user, right, wrong) {
  for (let i = 0; i < right; i++) await answerExerciseRight(user)
  for (let i = 0; i < wrong; i++) await answerExerciseWrong(user)
}

describe('checkpoint entry', () => {
  test('a finished group offers its checkpoint on the grammar screen', () => {
    const { storage } = storageWith()
    render('/grammar', storage)
    expect(screen.getByRole('link', { name: /kiểm tra nhóm 1/i })).toHaveAttribute('href', '/grammar/checkpoint/1')
  })

  test('an unfinished group offers nothing', () => {
    const { storage } = storageWith({ grammar: finishedGrammar(4) })
    render('/grammar', storage)
    expect(screen.queryByRole('link', { name: /kiểm tra nhóm/i })).toBeNull()
  })

  test('the best score is shown once a checkpoint was taken', () => {
    const grammar = { ...finishedGrammar(), checkpoints: { 1: { best: 12, total: 15 } } }
    const { storage } = storageWith({ grammar })
    render('/grammar', storage)
    expect(screen.getByText(/12\/15/)).toBeInTheDocument()
  })

  test('visiting the checkpoint of an unfinished group goes back to the grammar screen', () => {
    const { storage } = storageWith({ grammar: finishedGrammar(3) })
    render('/grammar/checkpoint/1', storage)
    expect(screen.getByRole('heading', { name: /ngữ pháp/i })).toBeInTheDocument()
  })

  test('a group that does not exist goes back too', () => {
    const { storage } = storageWith()
    render('/grammar/checkpoint/abc', storage)
    expect(screen.getByRole('heading', { name: /ngữ pháp/i })).toBeInTheDocument()
  })

  test('nobody signed in goes back to the picker', () => {
    renderApp(<App />, { route: '/grammar/checkpoint/1', lessons: lessons5, roadmap: [] })
    expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
  })
})

describe('checkpoint', () => {
  test('15 right answers pass, award the group badge and save the best score', async () => {
    const user = userEvent.setup()
    const { storage, profile } = storageWith()
    render('/grammar/checkpoint/1', storage)
    expect(screen.getByText('1/15')).toBeInTheDocument()
    await play(user, 15, 0)
    expect(screen.getByText('15/15')).toBeInTheDocument()
    expect(screen.getByText(/xuất sắc/i)).toBeInTheDocument()
    expect(screen.getByText(/đạt ✅/i)).toBeInTheDocument()
    const saved = savedProgress(storage, profile.id)
    expect(saved.grammar.checkpoints[1]).toEqual({ best: 15, total: 15 })
    expect(saved.badges).toContain('grammar-group-1')
    expect(saved.xp).toBeGreaterThan(0)
  })

  test('11 of 15 is enough to pass', async () => {
    const user = userEvent.setup()
    const { storage, profile } = storageWith()
    render('/grammar/checkpoint/1', storage)
    await play(user, 11, 4)
    expect(screen.getByText('11/15')).toBeInTheDocument()
    expect(screen.getByText(/đạt ✅/i)).toBeInTheDocument()
    expect(savedProgress(storage, profile.id).badges).toContain('grammar-group-1')
  })

  test('10 of 15 does not pass: no badge, a retry link and the weak lessons', async () => {
    const user = userEvent.setup()
    const { storage, profile } = storageWith()
    render('/grammar/checkpoint/1', storage)
    await play(user, 10, 5)
    expect(screen.getByText('10/15')).toBeInTheDocument()
    expect(screen.getByText(/chưa đạt/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /làm lại/i })).toHaveAttribute('href', '/grammar/checkpoint/1')
    expect(screen.getByTestId('weak-lessons')).toBeInTheDocument()
    expect(savedProgress(storage, profile.id).badges).not.toContain('grammar-group-1')
  })

  test('a checkpoint never completes the daily lesson', async () => {
    const user = userEvent.setup()
    const { storage, profile } = storageWith()
    render('/grammar/checkpoint/1', storage)
    await play(user, 15, 0)
    const saved = savedProgress(storage, profile.id)
    expect(saved.daily.goalAwarded).toBe(false)
    expect(saved.plan.step).toBe(0)
  })

  test('with fewer than 10 usable sentences it explains instead of showing an empty test', () => {
    const { storage } = storageWith({ cards: cards(4) })
    render('/grammar/checkpoint/1', storage)
    expect(screen.getByText(/chưa đủ câu để kiểm tra/i)).toBeInTheDocument()
  })
})

describe('general test', () => {
  test('is unavailable with fewer than 10 learned words', () => {
    const { storage } = seededStorage({ progress: { ...emptyProgress(), cards: cards(5) } })
    render('/test', storage)
    expect(screen.getByText(/ít nhất 10 từ/i)).toBeInTheDocument()
    expect(screen.queryByText(/phần 1/i)).toBeNull()
  })

  test('the grammar screen links to the test and Home links to it too', () => {
    const { storage } = storageWith()
    const { unmount } = render('/grammar', storage)
    expect(screen.getByRole('link', { name: /kiểm tra tổng hợp/i })).toHaveAttribute('href', '/test')
    unmount()
    render('/', storage)
    expect(screen.getByRole('link', { name: /^kiểm tra$/i })).toHaveAttribute('href', '/test')
  })

  test('runs 10 vocabulary questions and 10 sentences, then rates the result', async () => {
    const user = userEvent.setup()
    const { storage, profile } = storageWith()
    render('/test', storage)
    expect(screen.getByText(/phần 1\/2/i)).toBeInTheDocument()
    expect(screen.getByText('1/10')).toBeInTheDocument()
    for (let i = 0; i < 10; i++) await answerQuiz(user, true)
    expect(screen.getByText(/phần 2\/2/i)).toBeInTheDocument()
    await play(user, 10, 0)
    expect(screen.getByText('20/20')).toBeInTheDocument()
    expect(screen.getByText(/xuất sắc/i)).toBeInTheDocument()
    const saved = savedProgress(storage, profile.id)
    expect(saved.grammar.tests).toHaveLength(1)
    expect(saved.grammar.tests[0]).toMatchObject({ score: 20, total: 20 })
    expect(saved.badges).toContain('test-90')
  })

  test('wrong answers produce a weak-areas list with the lesson and the word', async () => {
    const user = userEvent.setup()
    const { storage } = storageWith()
    render('/test', storage)
    for (let i = 0; i < 10; i++) await answerQuiz(user, false)
    await play(user, 0, 10)
    expect(screen.getByText(/cần cố gắng thêm/i)).toBeInTheDocument()
    expect(screen.getByTestId('weak-lessons')).toHaveTextContent(/G\d/)
    expect(screen.getByTestId('weak-words')).toHaveTextContent(/word\d+/)
  })

  test('without a studied lesson the whole test is vocabulary', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ progress: { ...emptyProgress(), cards: cards() } })
    render('/test', storage)
    expect(screen.queryByText(/phần 1\/2/i)).toBeNull()
    expect(screen.getByText('1/12')).toBeInTheDocument()
    for (let i = 0; i < 12; i++) await answerQuiz(user, true)
    expect(screen.getByText('12/12')).toBeInTheDocument()
    expect(savedProgress(storage, profile.id).grammar.tests).toHaveLength(1)
  })

  test('a test never completes the daily lesson', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ progress: { ...emptyProgress(), cards: cards() } })
    render('/test', storage)
    for (let i = 0; i < 12; i++) await answerQuiz(user, true)
    const saved = savedProgress(storage, profile.id)
    expect(saved.daily.goalAwarded).toBe(false)
    expect(saved.streak.count).toBe(0)
  })

  test('nobody signed in goes back to the picker', () => {
    renderApp(<App />, { route: '/test', lessons: lessons5, roadmap: [] })
    expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
  })
})
