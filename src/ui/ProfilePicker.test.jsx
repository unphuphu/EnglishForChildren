import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { renderApp, memoryBackend } from '../test/utils.jsx'
import { createStorage } from '../core/storage.js'
import { createProfiles, AVATARS } from '../core/profiles.js'

function storageWith(count) {
  const storage = createStorage(memoryBackend())
  const profiles = createProfiles(storage)
  for (let i = 0; i < count; i++) profiles.add({ name: `Kid${i}`, avatar: AVATARS[i] })
  return storage
}

test('with no profiles only the add tile is shown', () => {
  renderApp(<App />)
  expect(screen.getByRole('link', { name: /thêm hồ sơ/i })).toBeInTheDocument()
  expect(screen.queryAllByTestId('profile-tile')).toHaveLength(0)
})

test('existing profiles are shown with their name and avatar', () => {
  renderApp(<App />, { storage: storageWith(2) })
  const tiles = screen.getAllByTestId('profile-tile')
  expect(tiles).toHaveLength(2)
  expect(within(tiles[0]).getByText('Kid0')).toBeInTheDocument()
  expect(within(tiles[0]).getByText(AVATARS[0])).toBeInTheDocument()
})

test('with 4 profiles the add tile is gone', () => {
  renderApp(<App />, { storage: storageWith(4) })
  expect(screen.queryByRole('link', { name: /thêm hồ sơ/i })).toBeNull()
})

test('choosing a profile opens its Home', async () => {
  const user = userEvent.setup()
  renderApp(<App />, { storage: storageWith(2) })
  await user.click(screen.getAllByTestId('profile-tile')[1])
  expect(screen.getByText(/xin chào, kid1/i)).toBeInTheDocument()
})

test('creating a profile without choosing a goal stores 10 and opens Home', async () => {
  const user = userEvent.setup()
  const { storage } = renderApp(<App />, { route: '/add-profile' })
  await user.type(screen.getByLabelText(/tên/i), 'Bin')
  await user.click(screen.getByRole('button', { name: AVATARS[0] }))
  await user.click(screen.getByRole('button', { name: /tạo hồ sơ/i }))
  expect(screen.getByText(/xin chào, bin/i)).toBeInTheDocument()
  expect(createProfiles(storage).list()[0]).toMatchObject({ name: 'Bin', avatar: AVATARS[0], dailyGoal: 10 })
})

test('the goal chooser offers 5, 10, 15, 20 and 30 with 10 preselected', () => {
  renderApp(<App />, { route: '/add-profile' })
  const radios = screen.getAllByRole('radio')
  expect(radios.map((r) => r.value)).toEqual(['5', '10', '15', '20', '30'])
  expect(screen.getByRole('radio', { name: '10' })).toBeChecked()
})

test('a custom goal can be typed and is stored', async () => {
  const user = userEvent.setup()
  const { storage } = renderApp(<App />, { route: '/add-profile' })
  await user.type(screen.getByLabelText(/tên/i), 'Bin')
  await user.click(screen.getByRole('button', { name: AVATARS[0] }))
  await user.type(screen.getByLabelText(/tự chọn/i), '25')
  await user.click(screen.getByRole('button', { name: /tạo hồ sơ/i }))
  expect(createProfiles(storage).list()[0].dailyGoal).toBe(25)
})

test('a custom goal outside 5 to 50 shows a message and is not applied', async () => {
  const user = userEvent.setup()
  renderApp(<App />, { route: '/add-profile' })
  await user.type(screen.getByLabelText(/tự chọn/i), '80')
  expect(screen.getByRole('alert')).toHaveTextContent(/5 đến 50/)
  await user.tab()
  expect(screen.getByLabelText(/tự chọn/i)).toHaveValue(null)
  expect(screen.getByRole('radio', { name: '10' })).toBeChecked()
})

test('an avatar used by another profile is disabled', () => {
  renderApp(<App />, { route: '/add-profile', storage: storageWith(1) })
  expect(screen.getByRole('button', { name: AVATARS[0] })).toBeDisabled()
  expect(screen.getByRole('button', { name: AVATARS[1] })).toBeEnabled()
})

test('submitting without an avatar or name shows a message and creates nothing', async () => {
  const user = userEvent.setup()
  const { storage } = renderApp(<App />, { route: '/add-profile' })
  await user.click(screen.getByRole('button', { name: /tạo hồ sơ/i }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(createProfiles(storage).list()).toHaveLength(0)
})

test('tapping the header avatar returns to the picker', async () => {
  const user = userEvent.setup()
  renderApp(<App />, { storage: storageWith(2) })
  await user.click(screen.getAllByTestId('profile-tile')[0])
  await user.click(screen.getByRole('button', { name: /đổi người dùng/i }))
  expect(screen.getAllByTestId('profile-tile')).toHaveLength(2)
})
