import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => true, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => true }))

import App from '../App.jsx'
import { renderApp, seededStorage, memoryBackend } from '../test/utils.jsx'
import { createProfiles, AVATARS } from '../core/profiles.js'
import { createProgressStore, emptyProgress } from '../core/progress.js'
import { exportProfile } from '../core/exportImport.js'
import { createStorage } from '../core/storage.js'
import { speak } from '../core/speech.js'

const profileOf = (storage, id) => createProfiles(storage).list().find((p) => p.id === id)

test('the goal control offers 5, 10, 15, 20 and 30 plus a custom field', () => {
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/settings', storage })
  const group = screen.getByRole('group', { name: /số từ mới mỗi buổi/i })
  expect(within(group).getAllByRole('radio').map((r) => r.value)).toEqual(['5', '10', '15', '20', '30'])
  expect(within(group).getByLabelText(/tự chọn/i)).toBeInTheDocument()
})

test('changing the goal is saved to the profile', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage({ dailyGoal: 10 })
  renderApp(<App />, { route: '/settings', storage })
  await user.click(screen.getByRole('radio', { name: '20' }))
  expect(profileOf(storage, profile.id).dailyGoal).toBe(20)
})

test('a custom goal such as 35 is saved to the profile', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage({ dailyGoal: 10 })
  renderApp(<App />, { route: '/settings', storage })
  await user.type(screen.getByLabelText(/tự chọn/i), '35{Enter}')
  expect(profileOf(storage, profile.id).dailyGoal).toBe(35)
})

test('renaming a profile is saved', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage({ name: 'Bin' })
  renderApp(<App />, { route: '/settings', storage })
  const input = screen.getByLabelText(/^tên/i)
  await user.clear(input)
  await user.type(input, 'Binh')
  await user.click(screen.getByRole('button', { name: /lưu tên/i }))
  expect(profileOf(storage, profile.id).name).toBe('Binh')
})

test('the speech rate slider saves and the test button speaks at that rate', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  renderApp(<App />, { route: '/settings', storage })
  const slider = screen.getByLabelText(/tốc độ/i)
  fireEvent.change(slider, { target: { value: '0.8' } })
  const saved = profileOf(storage, profile.id).speechRate
  expect(saved).toBe(0.8)
  await user.click(screen.getByRole('button', { name: /thử nghe/i }))
  expect(speak).toHaveBeenCalledWith('Hello', expect.objectContaining({ rate: saved }))
})

test('deleting needs a second confirmation and leaves other profiles intact', async () => {
  const user = userEvent.setup()
  const { storage } = seededStorage({ name: 'Bin' })
  const other = createProfiles(storage).add({ name: 'Mai', avatar: AVATARS[1] })
  createProgressStore(storage, other.id).save({ ...emptyProgress(), xp: 77 })
  renderApp(<App />, { route: '/settings', storage })
  await user.click(screen.getByRole('button', { name: /xóa hồ sơ/i }))
  expect(createProfiles(storage).list()).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: /xác nhận xóa/i }))
  expect(createProfiles(storage).list().map((p) => p.id)).toEqual([other.id])
  expect(createProgressStore(storage, other.id).load().xp).toBe(77)
  expect(screen.getByText(/ai đang học/i)).toBeInTheDocument()
})

test('cancelling the deletion keeps the profile', async () => {
  const user = userEvent.setup()
  const { storage } = seededStorage()
  renderApp(<App />, { route: '/settings', storage })
  await user.click(screen.getByRole('button', { name: /xóa hồ sơ/i }))
  await user.click(screen.getByRole('button', { name: /không xóa/i }))
  expect(createProfiles(storage).list()).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /xác nhận xóa/i })).toBeNull()
})

test('the export link downloads this profile as JSON', () => {
  const { storage } = seededStorage({ name: 'Bin' })
  renderApp(<App />, { route: '/settings', storage })
  const link = screen.getByRole('link', { name: /xuất tiến độ/i })
  expect(link).toHaveAttribute('download')
  const json = decodeURIComponent(link.getAttribute('href').split(',').slice(1).join(','))
  expect(JSON.parse(json)).toMatchObject({ app: 'english-for-children', profile: { name: 'Bin' } })
})

test('importing a valid file adds a profile and an invalid file shows a message', async () => {
  const user = userEvent.setup()
  const source = seededStorage({ name: 'Lan' })
  const json = exportProfile(source.storage, source.profile.id)
  const target = createStorage(memoryBackend())
  const profiles = createProfiles(target)
  const me = profiles.add({ name: 'Bin', avatar: AVATARS[3] })
  profiles.setCurrentId(me.id)
  renderApp(<App />, { route: '/settings', storage: target })
  const input = screen.getByLabelText(/nhập tiến độ/i)
  await user.upload(input, new File(['not json'], 'bad.json', { type: 'application/json' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/không hợp lệ/i)
  await user.upload(input, new File([json], 'lan.json', { type: 'application/json' }))
  expect(await screen.findByText(/đã nhập hồ sơ lan/i)).toBeInTheDocument()
  expect(profiles.list()).toHaveLength(2)
})

test('the profile screen shows level, mastered count and earned versus locked badges', () => {
  const progress = { ...emptyProgress(), xp: 60, badges: ['first-perfect'] }
  progress.cards.x = { box: 3, correct: 3, wrong: 0, due: '2030-01-01' }
  const { storage } = seededStorage({ progress })
  renderApp(<App />, { route: '/profile', storage })
  expect(screen.getByText(/cấp 2/i)).toBeInTheDocument()
  expect(screen.getByText(/đã thuộc 1 từ/i)).toBeInTheDocument()
  expect(screen.getByTestId('badge-first-perfect')).not.toHaveClass('locked')
  expect(screen.getByTestId('badge-streak-7')).toHaveClass('locked')
})

test('the microphone checkbox is on by default and is saved to the profile', async () => {
  const user = userEvent.setup()
  const { storage, profile } = seededStorage()
  renderApp(<App />, { route: '/settings', storage })
  const box = screen.getByRole('checkbox', { name: /dùng micro/i })
  expect(box).toBeChecked()
  await user.click(box)
  expect(profileOf(storage, profile.id).micEnabled).toBe(false)
  await user.click(screen.getByRole('checkbox', { name: /dùng micro/i }))
  expect(profileOf(storage, profile.id).micEnabled).toBe(true)
})

describe('AI conversation settings', () => {
  test('AI is on by default and the switch is saved to the profile', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage()
    renderApp(<App />, { route: '/settings', storage })
    const box = screen.getByRole('checkbox', { name: /dùng ai/i })
    expect(box).toBeChecked()
    await user.click(box)
    expect(profileOf(storage, profile.id).aiEnabled).toBe(false)
  })

  test('the model name defaults to qwen2.5-3b-instruct and a new name is saved when leaving the field', async () => {
    const user = userEvent.setup()
    const { storage, profile } = seededStorage()
    renderApp(<App />, { route: '/settings', storage })
    const input = screen.getByLabelText(/model ai/i)
    expect(input).toHaveValue('qwen2.5-3b-instruct')
    await user.clear(input)
    await user.type(input, 'llama-3.2-3b-instruct')
    await user.tab()
    expect(profileOf(storage, profile.id).aiModel).toBe('llama-3.2-3b-instruct')
  })

  test('Kiểm tra kết nối reports success and failure in Vietnamese', async () => {
    const user = userEvent.setup()
    const { storage } = seededStorage()
    renderApp(<App />, { route: '/settings', storage })
    const original = globalThis.fetch
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [{ id: 'qwen2.5-3b-instruct' }] }) })
      await user.click(screen.getByRole('button', { name: /kiểm tra kết nối/i }))
      expect(await screen.findByText(/kết nối tốt/i)).toBeInTheDocument()
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
      await user.click(screen.getByRole('button', { name: /kiểm tra kết nối/i }))
      expect(await screen.findByText(/chưa kết nối được lm studio/i)).toBeInTheDocument()
    } finally {
      globalThis.fetch = original
    }
  })
})
