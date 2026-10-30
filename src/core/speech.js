const defaultSynth = () => globalThis.speechSynthesis ?? null

function englishVoices(synth) {
  return synth ? synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en')) : []
}

export function listEnglishVoices(synth = defaultSynth()) {
  return englishVoices(synth).map(({ name, lang }) => ({ name, lang }))
}

export function isSpeechAvailable(synth = defaultSynth()) {
  return englishVoices(synth).length > 0
}

// `voice` is the name of a voice picked in Settings; when it is missing or no longer an
// English voice of this browser, the automatic choice (en-US first) is used instead.
export function speak(text, { rate = 1, voice, synth = defaultSynth() } = {}) {
  const voices = englishVoices(synth)
  if (voices.length === 0) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voices.find((v) => v.name === voice)
    ?? voices.find((v) => v.lang.toLowerCase() === 'en-us')
    ?? voices[0]
  utterance.lang = utterance.voice.lang
  utterance.rate = rate
  synth.cancel()
  synth.speak(utterance)
}
