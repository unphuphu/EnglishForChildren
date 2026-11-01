// Talks to the local model server (LM Studio) through the `/lmstudio` proxy set up in vite.config.js,
// which avoids the browser's cross-origin rules. Nothing leaves this PC.
const BASE = '/lmstudio/v1'
export const DEFAULT_MODEL = 'qwen2.5-3b-instruct'

export class AiError extends Error {
  // reason: unreachable | model-missing | timeout | bad-response
  constructor(reason, detail) {
    super(reason)
    this.reason = reason
    this.detail = detail
  }
}

async function request(path, { body, signal, timeoutMs, fetchImpl }) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  signal?.addEventListener('abort', () => controller.abort())
  try {
    const response = await fetchImpl(`${BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!response.ok) throw new AiError('unreachable', `HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    if (error instanceof AiError) throw error
    if (timedOut) throw new AiError('timeout')
    if (error?.name === 'AbortError') throw error
    if (error instanceof SyntaxError) throw new AiError('bad-response')
    throw new AiError('unreachable')
  } finally {
    clearTimeout(timer)
  }
}

// Returns the text of one reply. The first call can take a while because the model has to load.
export async function chatCompletion({
  messages, model = DEFAULT_MODEL, maxTokens = 60, temperature = 0.6, stop, signal, timeoutMs = 120000,
  fetchImpl = globalThis.fetch?.bind(globalThis),
}) {
  const data = await request('/chat/completions', {
    body: { model, messages, max_tokens: maxTokens, temperature, ...(stop ? { stop } : {}) },
    signal,
    timeoutMs,
    fetchImpl,
  })
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || text.trim() === '') throw new AiError('bad-response')
  return text.trim()
}

// `{ ok: true }` when the server answers and has the model, else `{ ok: false, reason, models? }`.
export async function checkAi({ model = DEFAULT_MODEL, timeoutMs = 5000, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
  try {
    const data = await request('/models', { timeoutMs, fetchImpl })
    const models = Array.isArray(data?.data) ? data.data.map((m) => m.id) : null
    if (models === null) return { ok: false, reason: 'bad-response' }
    return models.includes(model) ? { ok: true } : { ok: false, reason: 'model-missing', models }
  } catch (error) {
    return { ok: false, reason: error?.reason ?? 'unreachable' }
  }
}

export const AI_PROBLEMS = {
  unreachable: 'Chưa kết nối được LM Studio. Hãy mở LM Studio và bật server (mục Developer).',
  'model-missing': 'LM Studio chưa nạp model này. Hãy nạp model trong LM Studio hoặc sửa tên model trong Cài đặt.',
  timeout: 'AI trả lời quá lâu.',
  'bad-response': 'AI trả lời không đúng định dạng.',
}
