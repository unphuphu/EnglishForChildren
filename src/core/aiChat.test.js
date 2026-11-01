import { AiError, checkAi, chatCompletion } from './aiChat.js'

const json = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })
const reply = (content) => json({ choices: [{ message: { content } }] })

test('chatCompletion posts the messages and returns the trimmed text', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(reply('  Hello there!  '))
  const text = await chatCompletion({
    messages: [{ role: 'user', content: 'Hi' }], model: 'm1', maxTokens: 40, stop: ['\n'], fetchImpl,
  })
  expect(text).toBe('Hello there!')
  const [url, options] = fetchImpl.mock.calls[0]
  expect(url).toBe('/lmstudio/v1/chat/completions')
  expect(options.method).toBe('POST')
  expect(JSON.parse(options.body)).toMatchObject({
    model: 'm1', max_tokens: 40, stop: ['\n'], messages: [{ role: 'user', content: 'Hi' }],
  })
})

test('network failures and HTTP errors are unreachable', async () => {
  await expect(chatCompletion({ messages: [], fetchImpl: vi.fn().mockRejectedValue(new TypeError('fetch failed')) }))
    .rejects.toMatchObject({ reason: 'unreachable' })
  await expect(chatCompletion({ messages: [], fetchImpl: vi.fn().mockResolvedValue(json({}, false, 500)) }))
    .rejects.toMatchObject({ reason: 'unreachable' })
})

test('an empty or malformed reply is a bad-response', async () => {
  await expect(chatCompletion({ messages: [], fetchImpl: vi.fn().mockResolvedValue(reply('   ')) }))
    .rejects.toBeInstanceOf(AiError)
  await expect(chatCompletion({ messages: [], fetchImpl: vi.fn().mockResolvedValue(json({ nope: 1 })) }))
    .rejects.toMatchObject({ reason: 'bad-response' })
  const broken = { ok: true, status: 200, json: async () => { throw new SyntaxError('bad json') } }
  await expect(chatCompletion({ messages: [], fetchImpl: vi.fn().mockResolvedValue(broken) }))
    .rejects.toMatchObject({ reason: 'bad-response' })
})

test('a request that takes too long times out', async () => {
  const fetchImpl = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
  })
  await expect(chatCompletion({ messages: [], fetchImpl, timeoutMs: 20 })).rejects.toMatchObject({ reason: 'timeout' })
})

test('a cancelled request is rethrown as an abort, not an AI problem', async () => {
  const controller = new AbortController()
  const fetchImpl = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
  })
  const pending = chatCompletion({ messages: [], fetchImpl, signal: controller.signal })
  controller.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
})

test('checkAi is ok when the model is listed', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(json({ data: [{ id: 'a' }, { id: 'qwen2.5-3b-instruct' }] }))
  expect(await checkAi({ fetchImpl })).toEqual({ ok: true })
  expect(fetchImpl.mock.calls[0][0]).toBe('/lmstudio/v1/models')
})

test('checkAi reports a missing model with the available ones', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(json({ data: [{ id: 'a' }] }))
  expect(await checkAi({ model: 'b', fetchImpl })).toEqual({ ok: false, reason: 'model-missing', models: ['a'] })
})

test('checkAi reports unreachable and bad responses without throwing', async () => {
  expect(await checkAi({ fetchImpl: vi.fn().mockRejectedValue(new TypeError('x')) }))
    .toEqual({ ok: false, reason: 'unreachable' })
  expect(await checkAi({ fetchImpl: vi.fn().mockResolvedValue(json({ weird: true })) }))
    .toEqual({ ok: false, reason: 'bad-response' })
})
