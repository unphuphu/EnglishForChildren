import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => true }))

import App from '../App.jsx'
import { renderApp, seededStorage, savedProgress, fixtureWords, fixtureLessons } from '../test/utils.jsx'
import { answerExercisesRight } from '../test/exerciseHelpers.js'
import { emptyProgress } from '../core/progress.js'

const allCards = Object.fromEntries(fixtureWords.map((w) => [w.id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01' }]))
const withParts = (partsDone, extra = {}) => ({
  ...emptyProgress(),
  grammar: { ...emptyProgress().grammar, lessons: { basics: { partsDone, correct: 0, wrong: 0 } } },
  ...extra,
})

describe('grammar list', () => {
  test.each([
    [0, 'Chưa học'],
    [1, 'Đang học'],
    [2, 'Đã học'],
  ])('with %i finished parts the lesson is "%s"', (partsDone, label) => {
    const { storage } = seededStorage({ progress: withParts(partsDone) })
    renderApp(<App />, { route: '/grammar', storage })
    const item = screen.getByRole('link', { name: /basics/i })
    expect(within(item).getByText(label)).toBeInTheDocument()
  })

  test('a lesson with no recorded progress is "Chưa học"', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar', storage })
    expect(screen.getByText('Chưa học')).toBeInTheDocument()
  })

  test('lessons are listed in lesson order and link to their page', () => {
    const second = { ...fixtureLessons[0], id: 'second', title: 'Second', order: 2 }
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar', storage, lessons: [second, fixtureLessons[0]] })
    const links = screen.getAllByRole('link', { name: /basics|second/i })
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/grammar/basics', '/grammar/second'])
  })

  test('with no lessons it explains there is nothing yet', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar', storage, lessons: [], roadmap: [] })
    expect(screen.getByText(/chưa có bài ngữ pháp/i)).toBeInTheDocument()
  })

  test('Home links to the grammar screen', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { storage })
    expect(screen.getByRole('link', { name: /ngữ pháp/i })).toHaveAttribute('href', '/grammar')
  })

  test('nobody signed in goes back to the picker', () => {
    renderApp(<App />, { route: '/grammar' })
    expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
  })
})

describe('lesson page', () => {
  test('shows every explanation block with listenable examples', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar/basics', storage })
    expect(screen.getByText('Khối giải thích một.')).toBeInTheDocument()
    expect(screen.getByText('Khối giải thích hai.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^nghe:/i })).toHaveLength(4)
  })

  test('practice is disabled before the first part is finished', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar/basics', storage })
    expect(screen.getByRole('button', { name: /luyện thêm/i })).toBeDisabled()
    expect(screen.queryByRole('link', { name: /luyện thêm/i })).toBeNull()
  })

  test('practice is a link once a part is finished', () => {
    const { storage } = seededStorage({ progress: withParts(1) })
    renderApp(<App />, { route: '/grammar/basics', storage })
    expect(screen.getByRole('link', { name: /luyện thêm/i })).toHaveAttribute('href', '/grammar/basics/practice')
  })

  test('an unknown lesson goes back to the list', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar/ghost', storage })
    expect(screen.getByRole('heading', { name: /ngữ pháp/i })).toBeInTheDocument()
  })
})

describe('practice', () => {
  test('plays 8 sentences and saves XP, word reviews and sentence statistics without finishing a lesson', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ progress: withParts(1, { cards: allCards }) })
    renderApp(<App />, { route: '/grammar/basics/practice', storage })
    expect(screen.getByText('1/8')).toBeInTheDocument()
    await answerExercisesRight(user, 8)
    expect(screen.getByText('+100 XP')).toBeInTheDocument()
    const saved = savedProgress(storage, profile.id)
    const seen = Object.values(saved.grammar.sentences).reduce((n, s) => n + s.seen, 0)
    expect(seen).toBe(8)
    expect(saved.daily.goalAwarded).toBe(false)
    expect(saved.plan.step).toBe(0)
    expect(saved.streak.count).toBe(0)
    expect(saved.grammar.lessons.basics.partsDone).toBe(1)
    expect(saved.grammar.lessons.basics.correct).toBe(8)
  })

  test('practice draws from every part of the lesson', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ progress: withParts(2, { cards: allCards }) })
    renderApp(<App />, { route: '/grammar/basics/practice', storage })
    await answerExercisesRight(user, 8)
    const ids = Object.keys(savedProgress(storage, profile.id).grammar.sentences)
    expect(ids.some((id) => id.startsWith('basics-s1'))).toBe(true)
    expect(ids.some((id) => id.startsWith('basics-s2'))).toBe(true)
  })

  test('Chơi tiếp starts another round', async () => {
    const user = userEvent.setup()
    const { storage } = seededStorage({ progress: withParts(1, { cards: allCards }) })
    renderApp(<App />, { route: '/grammar/basics/practice', storage })
    await answerExercisesRight(user, 8)
    await user.click(screen.getByRole('button', { name: /chơi tiếp/i }))
    expect(screen.getByText('1/8')).toBeInTheDocument()
  })

  test('with too few eligible sentences it shows a notice instead of an empty screen', () => {
    const { storage } = seededStorage({ progress: withParts(1) })
    renderApp(<App />, { route: '/grammar/basics/practice', storage })
    expect(screen.getByText(/học thêm từ nhé/i)).toBeInTheDocument()
    expect(screen.queryByText('1/8')).toBeNull()
  })

  test('practice before the first part is finished goes to the lesson page', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar/basics/practice', storage })
    expect(screen.getByRole('heading', { name: /basics/i })).toBeInTheDocument()
  })

  test('an unknown lesson goes back to the list', () => {
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/grammar/ghost/practice', storage })
    expect(screen.getByRole('heading', { name: /ngữ pháp/i })).toBeInTheDocument()
  })
})
