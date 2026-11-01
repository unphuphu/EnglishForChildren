import { isRecognitionSupported, listen } from './speechRecognition.js'

function fakeRecognition(script) {
  return class {
    start() {
      this.started = true
      script(this)
    }

    stop() { this.stopped = true }
  }
}
const result = (...texts) => ({ results: [texts.map((transcript) => ({ transcript }))] })

test('support follows the presence of a recogniser class', () => {
  expect(isRecognitionSupported(null)).toBe(false)
  expect(isRecognitionSupported(fakeRecognition(() => {}))).toBe(true)
})

test('without a recogniser listen resolves unsupported', async () => {
  expect(await listen({ Recognition: null })).toEqual({ ok: false, reason: 'unsupported' })
})

test('a result resolves with all alternatives and sets the options', async () => {
  let instance
  const Recognition = fakeRecognition((r) => {
    instance = r
    r.onresult(result('good morning', 'good mourning'))
  })
  expect(await listen({ Recognition })).toEqual({ ok: true, alternatives: ['good morning', 'good mourning'] })
  expect(instance).toMatchObject({ lang: 'en-US', maxAlternatives: 5, interimResults: false })
})

test('permission errors resolve denied, silence resolves no-speech, others error', async () => {
  const failing = (error) => fakeRecognition((r) => r.onerror({ error }))
  expect(await listen({ Recognition: failing('not-allowed') })).toEqual({ ok: false, reason: 'denied' })
  expect(await listen({ Recognition: failing('service-not-allowed') })).toEqual({ ok: false, reason: 'denied' })
  expect(await listen({ Recognition: failing('no-speech') })).toEqual({ ok: false, reason: 'no-speech' })
  expect(await listen({ Recognition: failing('network') })).toEqual({ ok: false, reason: 'error' })
})

test('ending without a result is no-speech and only the first outcome counts', async () => {
  const Recognition = fakeRecognition((r) => {
    r.onend()
    r.onresult(result('late'))
  })
  expect(await listen({ Recognition })).toEqual({ ok: false, reason: 'no-speech' })
})

test('a recogniser that never answers times out', async () => {
  let instance
  const Recognition = fakeRecognition((r) => { instance = r })
  expect(await listen({ Recognition, timeoutMs: 20 })).toEqual({ ok: false, reason: 'no-speech' })
  expect(instance.stopped).toBe(true)
})

test('a recogniser that throws on start resolves error', async () => {
  const Recognition = fakeRecognition(() => { throw new Error('busy') })
  expect(await listen({ Recognition })).toEqual({ ok: false, reason: 'error' })
})
