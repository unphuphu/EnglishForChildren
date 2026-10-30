import { isSpeechAvailable, speak } from './speech.js'

class FakeUtterance {
  constructor(text) {
    this.text = text
  }
}

function fakeSynth(voices) {
  const calls = []
  return {
    calls,
    getVoices: () => voices,
    cancel: () => calls.push(['cancel']),
    speak: (u) => calls.push(['speak', u]),
  }
}

beforeEach(() => {
  globalThis.SpeechSynthesisUtterance = FakeUtterance
})

test('available only when an English voice exists', () => {
  expect(isSpeechAvailable(fakeSynth([{ lang: 'vi-VN' }]))).toBe(false)
  expect(isSpeechAvailable(fakeSynth([{ lang: 'vi-VN' }, { lang: 'en-GB' }]))).toBe(true)
})

test('unavailable when there is no speech synthesis at all', () => {
  expect(isSpeechAvailable(null)).toBe(false)
})

test('speak cancels first, then speaks the text at the given rate', () => {
  const synth = fakeSynth([{ lang: 'en-US', name: 'US' }])
  speak('dog', { rate: 0.8, synth })
  expect(synth.calls[0]).toEqual(['cancel'])
  const utterance = synth.calls[1][1]
  expect(utterance.text).toBe('dog')
  expect(utterance.rate).toBe(0.8)
})

test('speak prefers an en-US voice and falls back to any English voice', () => {
  const us = { lang: 'en-US', name: 'US' }
  const gb = { lang: 'en-GB', name: 'GB' }
  const both = fakeSynth([gb, us])
  speak('cat', { synth: both })
  expect(both.calls[1][1].voice).toBe(us)
  const onlyGb = fakeSynth([gb])
  speak('cat', { synth: onlyGb })
  expect(onlyGb.calls[1][1].voice).toBe(gb)
})

test('speak is a silent no-op without an English voice', () => {
  const synth = fakeSynth([{ lang: 'vi-VN' }])
  expect(() => speak('dog', { synth })).not.toThrow()
  expect(synth.calls).toEqual([])
})

test('speak does not throw when synthesis is missing', () => {
  expect(() => speak('dog', { synth: null })).not.toThrow()
})
