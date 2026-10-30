import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))
const available = { value: true }
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => available.value }))

import App from '../App.jsx'
import { renderApp, seededStorage, savedProgress, fixtureWords, fixtureLessons } from '../test/utils.jsx'
import { emptyProgress } from '../core/progress.js'
import { speak } from '../core/speech.js'
import { answerQuiz } from '../test/exerciseHelpers.js'

const cardsFor = (ids) => Object.fromEntries(ids.map((id) => [id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01' }]))
const animalIds = (from, to) => fixtureWords.slice(from, to).map((w) => w.id)

beforeEach(() => {
  available.value = true
  speak.mockClear()
})
afterEach(() => vi.useRealTimers())

async function rememberAll(user, count) {
  for (let i = 0; i < count; i++) {
    await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
    await user.click(screen.getByRole('button', { name: /đã nhớ/i }))
  }
}

async function tapTiles(user, words) {
  for (const text of words) {
    await user.click(screen.getAllByRole('button', { name: text }).find((b) => !b.disabled))
  }
}

// Answers whatever sentence exercise is on screen correctly, then moves on.
async function answerExerciseRight(user) {
  const choices = screen.queryByRole('group', { name: /đáp án/i })
  if (choices) {
    const buttons = within(choices).getAllByRole('button')
    const right = buttons.find((b) => b.textContent === 'sees' || /^She sees word\d+ now\.$/.test(b.textContent))
    await user.click(right)
  } else {
    const wordTile = screen.getAllByRole('button').find((b) => /^word\d+$/.test(b.textContent))
    await tapTiles(user, ['She', 'sees', wordTile.textContent, 'now.'])
    await user.click(screen.getByRole('button', { name: /kiểm tra/i }))
  }
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
}

// Quiz questions show either "wordN" (answer: "nghĩa N") or "nghĩa N" (answer: "wordN").
async function answerQuizWrong(user) {
  const prompt = document.querySelector('.prompt-text').textContent
  const n = prompt.match(/\d+/)[0]
  const expected = prompt.startsWith('word') ? `nghĩa ${n}` : `word${n}`
  const options = within(screen.getByRole('group', { name: /đáp án/i })).getAllByRole('button')
  await user.click(options.find((b) => b.textContent !== expected))
  await user.click(screen.getByRole('button', { name: /tiếp tục|xem kết quả/i }))
}

async function finishExercises(user, count) {
  for (let i = 0; i < count; i++) await answerExerciseRight(user)
}

describe('a full lesson', () => {
  test('goes through new words, explanation and sentences, then saves the lesson', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage })

    expect(screen.getByText('Bước 1/4')).toBeInTheDocument()
    await rememberAll(user, 5)

    expect(screen.getByText('Bước 2/4')).toBeInTheDocument()
    expect(screen.getByText('Khối giải thích một.')).toBeInTheDocument()
    expect(screen.getByText('Khối giải thích hai.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /tiếp tục/i }))

    expect(screen.getByText('Bước 3/4')).toBeInTheDocument()
    expect(screen.getByText('1/8')).toBeInTheDocument()
    await finishExercises(user, 8)

    expect(screen.getByText(/buổi học hôm nay đã xong/i)).toBeInTheDocument()
    const saved = savedProgress(storage, profile.id)
    expect(saved.plan.step).toBe(1)
    expect(saved.grammar.lessons.basics.partsDone).toBe(1)
    expect(Object.keys(saved.cards)).toHaveLength(5)
    expect(saved.daily.goalAwarded).toBe(true)
    expect(saved.streak.count).toBe(1)
    expect(saved.badges).toContain('grammar-first-lesson')
  })

  test('the sentence XP and the goal bonus are shown', async () => {
    const user = userEvent.setup()
    const { storage } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage })
    await rememberAll(user, 5)
    await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
    await finishExercises(user, 8)
    expect(screen.getByText('+130 XP')).toBeInTheDocument()
  })

  test('the first new word is read aloud once', () => {
    const { storage } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage })
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak).toHaveBeenCalledWith('word0', expect.anything())
  })

  test('leaving in the middle saves nothing', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    const { unmount } = renderApp(<App />, { route: '/lesson', storage })
    await user.click(screen.getByRole('button', { name: /lật thẻ/i }))
    await user.click(screen.getByRole('button', { name: /đã nhớ/i }))
    unmount()
    const saved = savedProgress(storage, profile.id)
    expect(saved.cards).toEqual({})
    expect(saved.plan.step).toBe(0)
  })
})

describe('leaving a lesson half way keeps what was finished', () => {
  const learnedAll = () => ({
    ...emptyProgress(),
    plan: { step: 2 },
    cards: cardsFor(animalIds(0, 12)),
    grammar: { ...emptyProgress().grammar, lessons: { basics: { partsDone: 2, correct: 5, wrong: 1 } } },
  })

  test('finished flashcards are kept when the child leaves at the explanation', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    const { unmount } = renderApp(<App />, { route: '/lesson', storage })
    await rememberAll(user, 5)
    expect(screen.getByText('Bước 2/4')).toBeInTheDocument()
    unmount()
    const saved = savedProgress(storage, profile.id)
    expect(Object.keys(saved.cards)).toHaveLength(5)
    expect(saved.plan.step).toBe(0)
    expect(saved.daily.goalAwarded).toBe(false)
    expect(saved.streak.count).toBe(0)
    expect(saved.grammar.lessons).toEqual({})
  })

  test('the next start suggests the same lesson part again with new words', async () => {
    const user = userEvent.setup()
    const { storage } = seededStorage({ dailyGoal: 5 })
    const first = renderApp(<App />, { route: '/lesson', storage })
    await rememberAll(user, 5)
    first.unmount()
    renderApp(<App />, { route: '/lesson', storage })
    expect(screen.getByText('word5')).toBeInTheDocument()
    await rememberAll(user, 5)
    expect(screen.getByText('Khối giải thích hai.')).toBeInTheDocument()
  })

  test('finished sentences and their XP are kept when the child leaves during the review', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5, progress: learnedAll() })
    const { unmount } = renderApp(<App />, { route: '/lesson', storage })
    await finishExercises(user, 8)
    expect(screen.getByText('Bước 4/4')).toBeInTheDocument()
    unmount()
    const saved = savedProgress(storage, profile.id)
    const seen = Object.values(saved.grammar.sentences).reduce((n, s) => n + s.seen, 0)
    expect(seen).toBe(8)
    expect(saved.xp).toBe(100)
    expect(saved.plan.step).toBe(2)
    expect(saved.daily.goalAwarded).toBe(false)
    expect(saved.streak.count).toBe(0)
  })

  test('the result adds up the XP of every step and the goal bonus', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5, progress: learnedAll() })
    renderApp(<App />, { route: '/lesson', storage })
    await finishExercises(user, 8)
    for (let i = 0; i < 10; i++) await answerQuiz(user, true)
    expect(screen.getByText('+250 XP')).toBeInTheDocument()
    const saved = savedProgress(storage, profile.id)
    expect(saved.xp).toBe(250)
    expect(saved.daily.goalAwarded).toBe(true)
    expect(saved.streak.count).toBe(1)
  })

  test('the goal bonus and the streak come only from the last step', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    const { unmount } = renderApp(<App />, { route: '/lesson', storage })
    await rememberAll(user, 5)
    await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
    await finishExercises(user, 8)
    expect(screen.getByText(/buổi học hôm nay đã xong/i)).toBeInTheDocument()
    unmount()
    const saved = savedProgress(storage, profile.id)
    expect(saved.plan.step).toBe(1)
    expect(saved.grammar.lessons.basics.partsDone).toBe(1)
    expect(saved.xp).toBe(130)
  })
})

describe('explanation screen', () => {
  test('the first example is read aloud once and every example has a listen button', async () => {
    const user = userEvent.setup()
    const { storage } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage })
    await rememberAll(user, 5)
    expect(screen.getByText('Bước 2/4')).toBeInTheDocument()
    expect(speak.mock.calls.filter((c) => c[0] === 'She sees a dog.')).toHaveLength(1)
    expect(speak.mock.calls.at(-1)[0]).toBe('She sees a dog.')
    expect(screen.getAllByRole('button', { name: /^nghe:/i })).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: /nghe: he sees a cat/i }))
    expect(speak.mock.calls.at(-1)[0]).toBe('He sees a cat.')
  })

  test('a later part shows a short reminder with only the first block', async () => {
    const user = userEvent.setup()
    const progress = { ...emptyProgress(), plan: { step: 1 }, cards: cardsFor(animalIds(0, 5)) }
    const { storage } = seededStorage({ dailyGoal: 5, progress })
    renderApp(<App />, { route: '/lesson', storage })
    await rememberAll(user, 5)
    expect(screen.getByText(/nhắc lại/i)).toBeInTheDocument()
    expect(screen.getByText('Khối giải thích một.')).toBeInTheDocument()
    expect(screen.queryByText('Khối giải thích hai.')).toBeNull()
  })
})

describe('when things are missing', () => {
  test('too few eligible sentences shows a notice and moves on', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    const few = [{ ...fixtureLessons[0], sentences: fixtureLessons[0].sentences.slice(0, 1) }]
    renderApp(<App />, { route: '/lesson', storage, lessons: few })
    await rememberAll(user, 5)
    await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(screen.getByText(/học thêm từ nhé/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
    expect(screen.getByText(/buổi học hôm nay đã xong/i)).toBeInTheDocument()
    expect(savedProgress(storage, profile.id).plan.step).toBe(1)
  })

  test('past the roadmap the lesson still finishes without moving the plan', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage, lessons: [], roadmap: [] })
    expect(screen.queryByText('Bước 2/4')).toBeNull()
    await rememberAll(user, 5)
    expect(screen.getByText(/buổi học hôm nay đã xong/i)).toBeInTheDocument()
    const saved = savedProgress(storage, profile.id)
    expect(saved.plan.step).toBe(0)
    expect(saved.daily.goalAwarded).toBe(true)
  })

  test('with nothing to learn it says so instead of showing an empty lesson', () => {
    const { storage } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage, words: [], lessons: [], roadmap: [] })
    expect(screen.getByText(/chưa có gì để học/i)).toBeInTheDocument()
  })

  test('without a signed-in profile it goes back to the picker', () => {
    renderApp(<App />, { route: '/lesson' })
    expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
  })
})

describe('review step', () => {
  test('learned words are reviewed after the sentences', async () => {
    const user = userEvent.setup()
    const progress = {
      ...emptyProgress(),
      plan: { step: 2 },
      cards: cardsFor(animalIds(0, 12)),
      grammar: { ...emptyProgress().grammar, lessons: { basics: { partsDone: 2, correct: 5, wrong: 1 } } },
    }
    const { storage } = seededStorage({ dailyGoal: 5, progress })
    renderApp(<App />, { route: '/lesson', storage })
    expect(screen.getByText('Bước 3/4')).toBeInTheDocument()
    await finishExercises(user, 8)
    expect(screen.getByText('Bước 4/4')).toBeInTheDocument()
    expect(screen.getByText('1/10')).toBeInTheDocument()
  })
})

describe('clock and repeats', () => {
  test('the lesson counts for the day it started even if midnight passes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 30, 23, 59))
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage, lessons: [], roadmap: [] })
    await rememberAll(user, 2)
    vi.setSystemTime(new Date(2026, 9, 31, 0, 3))
    await rememberAll(user, 3)
    expect(savedProgress(storage, profile.id).daily.date).toBe('2026-10-30')
  })

  test('a second lesson the same day gives no second goal bonus', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson', storage, lessons: [], roadmap: [] })
    await rememberAll(user, 5)
    expect(screen.getByText('+30 XP')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /học tiếp/i }))
    await rememberAll(user, 5)
    expect(screen.getByText('Bước 4/4')).toBeInTheDocument()
    for (let i = 0; i < 5; i++) await answerQuizWrong(user)
    expect(screen.getByText('+0 XP')).toBeInTheDocument()
    const saved = savedProgress(storage, profile.id)
    expect(saved.streak.count).toBe(1)
    expect(saved.xp).toBe(30)
  })
})

describe('topic override', () => {
  test('?topic= chooses the new words', () => {
    const words = [
      ...fixtureWords,
      ...['x', 'y', 'z'].map((c, i) => ({ id: `home-00${i}`, word: `home${c}`, pos: 'noun', vi: 'v', ipa: '/x/', example: 'E.', exampleVi: 'V.', topic: 'home', level: 1 })),
    ]
    const { storage } = seededStorage({ dailyGoal: 5 })
    renderApp(<App />, { route: '/lesson?topic=home', storage, words })
    expect(screen.getByText('homex')).toBeInTheDocument()
  })
})
