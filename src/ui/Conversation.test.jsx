import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../core/speech.js', () => ({ speak: vi.fn(), isSpeechAvailable: () => false, listEnglishVoices: () => [] }))
vi.mock('../core/useSpeechAvailable.js', () => ({ useSpeechAvailable: () => false }))
const checkAi = vi.fn()
const chatCompletion = vi.fn()
vi.mock('../core/aiChat.js', async (importOriginal) => ({
  ...(await importOriginal()),
  checkAi: (...a) => checkAi(...a),
  chatCompletion: (...a) => chatCompletion(...a),
}))

import App from '../App.jsx'
import { renderApp, seededStorage, savedProgress } from '../test/utils.jsx'
import { createProfiles } from '../core/profiles.js'

beforeEach(() => {
  checkAi.mockReset().mockResolvedValue({ ok: true })
  chatCompletion.mockReset()
})

function withProfile(patch = {}) {
  const seeded = seededStorage()
  if (Object.keys(patch).length) createProfiles(seeded.storage).update(seeded.profile.id, patch)
  return seeded
}

async function open(user, storage, title = /gọi món/i) {
  renderApp(<App />, { route: '/chat', storage })
  await user.click(screen.getByRole('button', { name: title }))
}

test('Home links to the conversation page that lists the six scenarios', async () => {
  const user = userEvent.setup()
  renderApp(<App />, { storage: seededStorage().storage })
  await user.click(screen.getByRole('link', { name: /trò chuyện/i }))
  expect(screen.getByRole('heading', { name: /trò chuyện/i })).toBeInTheDocument()
  expect(screen.getAllByRole('button').filter((b) => b.classList.contains('topic-card'))).toHaveLength(6)
})

describe('scripted mode (AI switched off)', () => {
  test('the child taps answers through the dialogue and earns 20 XP once', async () => {
    const user = userEvent.setup()
    const { storage, profile } = withProfile({ aiEnabled: false })
    await open(user, storage)
    expect(checkAi).not.toHaveBeenCalled()
    expect(screen.getByText(/what would you like to eat/i)).toBeInTheDocument()

    for (let turn = 0; turn < 4; turn++) {
      const group = screen.getByRole('group', { name: /chọn câu trả lời/i })
      await user.click(within(group).getAllByRole('button')[0])
    }
    expect(screen.getByText(/giỏi lắm/i)).toBeInTheDocument()
    expect(screen.getByText('+20 XP')).toBeInTheDocument()
    expect(savedProgress(storage, profile.id).xp).toBe(20)
    await user.click(screen.getByRole('button', { name: /chọn tình huống khác/i }))
    expect(screen.getByRole('heading', { name: /trò chuyện/i })).toBeInTheDocument()
  })

  test('ending early with fewer than 3 turns earns no XP', async () => {
    const user = userEvent.setup()
    const { storage, profile } = withProfile({ aiEnabled: false })
    await open(user, storage)
    const group = screen.getByRole('group', { name: /chọn câu trả lời/i })
    await user.click(within(group).getAllByRole('button')[0])
    await user.click(screen.getByRole('button', { name: /kết thúc/i }))
    expect(screen.getByText(/ít nhất 3 lượt/i)).toBeInTheDocument()
    expect(savedProgress(storage, profile.id).xp).toBe(0)
  })
})

describe('when the AI cannot be used', () => {
  test('the reason is shown and the scripted dialogue runs', async () => {
    const user = userEvent.setup()
    checkAi.mockResolvedValue({ ok: false, reason: 'unreachable' })
    await open(user, seededStorage().storage)
    expect(await screen.findByText(/chưa kết nối được lm studio/i)).toBeInTheDocument()
    expect(screen.getByText(/bài hội thoại soạn sẵn/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /chọn câu trả lời/i })).toBeInTheDocument()
  })

  test('a missing model is explained', async () => {
    const user = userEvent.setup()
    checkAi.mockResolvedValue({ ok: false, reason: 'model-missing', models: [] })
    await open(user, seededStorage().storage)
    expect(await screen.findByText(/chưa nạp model/i)).toBeInTheDocument()
  })
})

describe('AI mode', () => {
  test('the child types, the AI answers with a cleaned one-line reply and the model name comes from the profile', async () => {
    const user = userEvent.setup()
    chatCompletion.mockResolvedValue('Anna: Good choice! 🍕 Do you want a drink?\nChild: yes')
    const { storage } = withProfile({ aiModel: 'my-model' })
    await open(user, storage)
    expect(await screen.findByLabelText(/câu của bạn/i)).toBeInTheDocument()
    expect(checkAi).toHaveBeenCalledWith({ model: 'my-model' })
    await user.type(screen.getByLabelText(/câu của bạn/i), 'I want a pizza.')
    await user.click(screen.getByRole('button', { name: /gửi/i }))
    expect(await screen.findByText('Good choice! Do you want a drink?')).toBeInTheDocument()
    expect(screen.getByText('I want a pizza.')).toBeInTheDocument()
    const call = chatCompletion.mock.calls[0][0]
    expect(call.model).toBe('my-model')
    expect(call.messages.map((m) => m.role)).toEqual(['system', 'assistant', 'user'])
    expect(call.messages[2].content).toBe('I want a pizza.')
  })

  test('Gợi ý sửa shows the corrected sentence with the changed word marked', async () => {
    const user = userEvent.setup()
    chatCompletion
      .mockResolvedValueOnce('Sure! What kind?')
      .mockResolvedValueOnce('I want a pizzas please.')
    const { storage } = withProfile()
    await open(user, storage)
    await user.type(await screen.findByLabelText(/câu của bạn/i), 'I want pizza please.')
    await user.click(screen.getByRole('button', { name: /gửi/i }))
    await screen.findByText('Sure! What kind?')
    await user.click(screen.getByRole('button', { name: /gợi ý sửa/i }))
    expect(await screen.findByText(/thử viết/i)).toBeInTheDocument()
    expect(screen.getByText('pizzas')).toHaveProperty('tagName', 'MARK')
    expect(screen.getByText(/có thể chưa đúng/i)).toBeInTheDocument()
    expect(chatCompletion.mock.calls[1][0].messages[1].content).toBe('I want pizza please.')
  })

  test('a sentence the model calls OK gets a friendly note', async () => {
    const user = userEvent.setup()
    chatCompletion.mockResolvedValueOnce('Nice!').mockResolvedValueOnce('OK')
    await open(user, withProfile().storage)
    await user.type(await screen.findByLabelText(/câu của bạn/i), 'I like pizza.')
    await user.click(screen.getByRole('button', { name: /gửi/i }))
    await screen.findByText('Nice!')
    await user.click(screen.getByRole('button', { name: /gợi ý sửa/i }))
    expect(await screen.findByText(/ổn rồi/i)).toBeInTheDocument()
  })

  test('a failed answer keeps the message and Thử lại asks again', async () => {
    const user = userEvent.setup()
    chatCompletion.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('Hello again!')
    await open(user, withProfile().storage)
    await user.type(await screen.findByLabelText(/câu của bạn/i), 'Hello.')
    await user.click(screen.getByRole('button', { name: /gửi/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/chưa nhận được câu trả lời/i)
    expect(screen.getByText('Hello.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /thử lại/i }))
    expect(await screen.findByText('Hello again!')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('after enough turns Kết thúc awards 20 XP', async () => {
    const user = userEvent.setup()
    chatCompletion.mockResolvedValue('Okay. Tell me more?')
    const { storage, profile } = withProfile()
    await open(user, storage)
    for (let i = 0; i < 3; i++) {
      await user.type(await screen.findByLabelText(/câu của bạn/i), `Message ${i}.`)
      await user.click(screen.getByRole('button', { name: /gửi/i }))
      await screen.findAllByText('Okay. Tell me more?')
    }
    await user.click(screen.getByRole('button', { name: /kết thúc/i }))
    expect(screen.getByText('+20 XP')).toBeInTheDocument()
    expect(savedProgress(storage, profile.id).xp).toBe(20)
  })
})
