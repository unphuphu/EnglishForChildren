import { screen } from '@testing-library/react'
import App from '../App.jsx'
import { renderApp, memoryBackend, fixtureWords } from '../test/utils.jsx'
import { createStorage } from '../core/storage.js'
import { createProfiles, AVATARS } from '../core/profiles.js'
import { createProgressStore, emptyProgress } from '../core/progress.js'
import { todayISO } from '../core/date.js'

function homeStorage(progress) {
  const storage = createStorage(memoryBackend())
  const profiles = createProfiles(storage)
  const p = profiles.add({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 10 })
  profiles.setCurrentId(p.id)
  if (progress) createProgressStore(storage, p.id).save(progress)
  return storage
}

const withStep = (step, extra = {}) => ({ ...emptyProgress(), plan: { step }, ...extra })

describe("today's lesson card", () => {
  test('a new profile is offered the first roadmap step', () => {
    renderApp(<App />, { storage: homeStorage() })
    expect(screen.getByText(/hôm nay: chủ đề animals \+ bài basics \(buổi 1\/2\)/i)).toBeInTheDocument()
  })

  test('after one finished step it offers the second part', () => {
    renderApp(<App />, { storage: homeStorage(withStep(1)) })
    expect(screen.getByText(/buổi 2\/2/i)).toBeInTheDocument()
  })

  test('past the roadmap it offers a topic and grammar review without a part number', () => {
    renderApp(<App />, { storage: homeStorage(withStep(5)) })
    expect(screen.getByText(/chủ đề animals \+ ôn ngữ pháp/i)).toBeInTheDocument()
    expect(screen.queryByText(/buổi \d/i)).toBeNull()
  })

  test('with no roadmap at all the card still shows a topic', () => {
    renderApp(<App />, { storage: homeStorage(), roadmap: [], lessons: [] })
    expect(screen.getByText(/chủ đề animals \+ ôn ngữ pháp/i)).toBeInTheDocument()
  })

  test('Bắt đầu goes to the lesson and Đổi chủ đề to the topic list', () => {
    renderApp(<App />, { storage: homeStorage() })
    expect(screen.getByRole('link', { name: /bắt đầu/i })).toHaveAttribute('href', '/lesson')
    expect(screen.getByRole('link', { name: /đổi chủ đề/i })).toHaveAttribute('href', '/lesson/topic')
  })

  test('the quick review keeps the old daily session under a new name', () => {
    renderApp(<App />, { storage: homeStorage() })
    expect(screen.getByRole('link', { name: /ôn nhanh/i })).toHaveAttribute('href', '/play/daily')
    expect(screen.queryByRole('link', { name: /học hôm nay/i })).toBeNull()
  })
})

describe('status of today', () => {
  test('a new profile has not done today\'s lesson', () => {
    renderApp(<App />, { storage: homeStorage() })
    expect(screen.getByText('Chưa làm')).toBeInTheDocument()
  })

  test('a lesson completed today shows as done', () => {
    const daily = { date: todayISO(), correctIds: [], goalAwarded: true }
    renderApp(<App />, { storage: homeStorage(withStep(1, { daily })) })
    expect(screen.getByText(/đã xong ✅/i)).toBeInTheDocument()
  })

  test('a lesson completed yesterday does not count for today', () => {
    const daily = { date: '2000-01-01', correctIds: [], goalAwarded: true }
    renderApp(<App />, { storage: homeStorage(withStep(1, { daily })) })
    expect(screen.getByText('Chưa làm')).toBeInTheDocument()
  })

  test('the old words-per-day ring is gone', () => {
    const daily = { date: todayISO(), correctIds: fixtureWords.slice(0, 4).map((w) => w.id), goalAwarded: false }
    renderApp(<App />, { storage: homeStorage(withStep(0, { daily })) })
    expect(screen.queryByText('4/10')).toBeNull()
    expect(screen.queryByText('0/10')).toBeNull()
  })
})

describe('profile summary', () => {
  test('shows level 1 and a streak of 0 for a new profile', () => {
    renderApp(<App />, { storage: homeStorage() })
    expect(screen.getByText(/cấp 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/chuỗi ngày/i)).toHaveTextContent('0')
  })
})

describe('change topic screen', () => {
  test('lists every topic as a link that starts the lesson with it', () => {
    renderApp(<App />, { route: '/lesson/topic', storage: homeStorage() })
    expect(screen.getByRole('link', { name: /animals/i })).toHaveAttribute('href', '/lesson?topic=animals')
  })

  test('marks the suggested topic', () => {
    renderApp(<App />, { route: '/lesson/topic', storage: homeStorage() })
    expect(screen.getByText(/gợi ý/i)).toBeInTheDocument()
  })

  test('goes back to the picker when nobody is signed in', () => {
    renderApp(<App />, { route: '/lesson/topic' })
    expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
  })
})
