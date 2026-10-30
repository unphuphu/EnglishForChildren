import { listEnglishVoices, speak } from './speech.js'
import { createStorage } from './storage.js'
import { createProfiles, AVATARS } from './profiles.js'
import { exportProfile, importProfile } from './exportImport.js'

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

const US = { name: 'Google US English', lang: 'en-US' }
const UK = { name: 'Microsoft Libby', lang: 'en-GB' }
const VI = { name: 'Microsoft An', lang: 'vi-VN' }

beforeEach(() => {
  globalThis.SpeechSynthesisUtterance = FakeUtterance
})

test('listEnglishVoices returns only English voices with name and lang', () => {
  expect(listEnglishVoices(fakeSynth([VI, UK, US]))).toEqual([
    { name: 'Microsoft Libby', lang: 'en-GB' },
    { name: 'Google US English', lang: 'en-US' },
  ])
})

test('listEnglishVoices is empty without synthesis or voices', () => {
  expect(listEnglishVoices(null)).toEqual([])
  expect(listEnglishVoices(fakeSynth([VI]))).toEqual([])
})

test('speak uses the voice chosen by name', () => {
  const synth = fakeSynth([US, UK])
  speak('dog', { synth, voice: 'Microsoft Libby' })
  expect(synth.calls[1][1].voice).toBe(UK)
  expect(synth.calls[1][1].lang).toBe('en-GB')
})

test('speak falls back to the automatic voice when the chosen one is gone', () => {
  const synth = fakeSynth([UK, US])
  speak('dog', { synth, voice: 'Removed Voice' })
  expect(synth.calls[1][1].voice).toBe(US)
})

test('speak ignores a chosen voice that is not English', () => {
  const synth = fakeSynth([US, VI])
  speak('dog', { synth, voice: 'Microsoft An' })
  expect(synth.calls[1][1].voice).toBe(US)
})

test('the chosen voice is carried by export and import', () => {
  const backend = () => {
    const map = new Map()
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) }
  }
  const source = createStorage(backend())
  const profiles = createProfiles(source)
  const p = profiles.add({ name: 'Bin', avatar: AVATARS[0] })
  profiles.update(p.id, { voice: 'Microsoft Libby' })
  const target = createStorage(backend())
  const imported = importProfile(target, exportProfile(source, p.id))
  expect(imported.voice).toBe('Microsoft Libby')
})
