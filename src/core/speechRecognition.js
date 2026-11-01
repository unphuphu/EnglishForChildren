const defaultRecognition = () => globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition ?? null

export const isRecognitionSupported = (Recognition = defaultRecognition()) => typeof Recognition === 'function'

const DENIED = new Set(['not-allowed', 'service-not-allowed'])

// Listens once. Resolves (never rejects) to `{ ok: true, alternatives }` or `{ ok: false, reason }` with reason
// `unsupported | denied | no-speech | error`.
export function listen({ lang = 'en-US', maxAlternatives = 5, timeoutMs = 10000, Recognition = defaultRecognition() } = {}) {
  return new Promise((resolve) => {
    if (!isRecognitionSupported(Recognition)) {
      resolve({ ok: false, reason: 'unsupported' })
      return
    }
    let settled = false
    let timer = null
    const recognition = new Recognition()
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    recognition.lang = lang
    recognition.maxAlternatives = maxAlternatives
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event) => {
      const alternatives = Array.from(event.results[0] ?? [], (a) => a.transcript).filter(Boolean)
      finish(alternatives.length > 0 ? { ok: true, alternatives } : { ok: false, reason: 'no-speech' })
    }
    recognition.onerror = (event) => {
      if (DENIED.has(event.error)) finish({ ok: false, reason: 'denied' })
      else finish({ ok: false, reason: event.error === 'no-speech' ? 'no-speech' : 'error' })
    }
    recognition.onend = () => finish({ ok: false, reason: 'no-speech' })
    timer = setTimeout(() => {
      try { recognition.stop() } catch { /* already stopped */ }
      finish({ ok: false, reason: 'no-speech' })
    }, timeoutMs)
    try {
      recognition.start()
    } catch {
      finish({ ok: false, reason: 'error' })
    }
  })
}
