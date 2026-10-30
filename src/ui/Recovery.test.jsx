import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))

import App from '../App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { render } from '@testing-library/react'
import { renderApp, seededStorage, memoryBackend } from '../test/utils.jsx'
import { createProgressStore, emptyProgress } from '../core/progress.js'
import { createStorage } from '../core/storage.js'
import { todayISO, addDays } from '../core/date.js'

function corruptedWithBackup() {
  const { storage, profile } = seededStorage({ progress: { ...emptyProgress(), xp: 100 } })
  createProgressStore(storage, profile.id).save({ ...emptyProgress(), xp: 200 })
  storage.set(`progress:${profile.id}`, 'garbage')
  return { storage, profile }
}

test('damaged progress shows the recovery screen instead of crashing', () => {
  const { storage } = corruptedWithBackup()
  renderApp(<App />, { storage })
  expect(screen.getByRole('heading', { name: /dữ liệu học bị hỏng/i })).toBeInTheDocument()
})

test('data from a newer version is treated as damaged, not as a crash', () => {
  const { storage, profile } = seededStorage()
  storage.set(`progress:${profile.id}`, { version: 9, xp: 1, cards: {} })
  renderApp(<App />, { storage })
  expect(screen.getByRole('heading', { name: /dữ liệu học bị hỏng/i })).toBeInTheDocument()
})

test('restoring the backup brings back the last good progress', async () => {
  const user = userEvent.setup()
  const { storage } = corruptedWithBackup()
  renderApp(<App />, { storage })
  await user.click(screen.getByRole('button', { name: /khôi phục bản sao lưu/i }))
  expect(screen.getByText(/cấp 3/i)).toBeInTheDocument()
})

test('without a backup the restore button is absent and a reset needs two clicks', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  storage.set(`progress:${profile.id}`, 'garbage')
  renderApp(<App />, { storage })
  expect(screen.queryByRole('button', { name: /khôi phục bản sao lưu/i })).toBeNull()
  await user.click(screen.getByRole('button', { name: /bắt đầu lại từ đầu/i }))
  expect(screen.getByRole('heading', { name: /dữ liệu học bị hỏng/i })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /xác nhận bắt đầu lại/i }))
  expect(screen.getByText(/cấp 1/i)).toBeInTheDocument()
})

test('a missed day shows an encouraging message', () => {
  const progress = { ...emptyProgress(), streak: { count: 5, lastDate: addDays(todayISO(), -3) } }
  const { storage } = seededStorage({ progress })
  renderApp(<App />, { storage })
  expect(screen.getByText(/bắt đầu lại nào/i)).toBeInTheDocument()
})

test('no encouragement message while the streak is alive', () => {
  const progress = { ...emptyProgress(), streak: { count: 5, lastDate: addDays(todayISO(), -1) } }
  const { storage } = seededStorage({ progress })
  renderApp(<App />, { storage })
  expect(screen.queryByText(/bắt đầu lại nào/i)).toBeNull()
})

describe('ErrorBoundary', () => {
  function Boom() {
    throw new Error('boom')
  }

  test('shows a friendly message with a way out instead of a blank page', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary storage={createStorage(memoryBackend())} onReload={() => {}}><Boom /></ErrorBoundary>)
    expect(screen.getByText(/có lỗi xảy ra/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tải lại/i })).toBeInTheDocument()
    spy.mockRestore()
  })

  test('"Đổi người dùng" clears the remembered profile and reloads', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const storage = createStorage(memoryBackend())
    storage.set('currentProfile', 'abc')
    const onReload = vi.fn()
    render(<ErrorBoundary storage={storage} onReload={onReload}><Boom /></ErrorBoundary>)
    await user.click(screen.getByRole('button', { name: /đổi người dùng/i }))
    expect(storage.get('currentProfile')).toBeNull()
    expect(onReload).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('renders children normally when nothing fails', () => {
    render(<ErrorBoundary storage={createStorage(memoryBackend())}><p>ok</p></ErrorBoundary>)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
