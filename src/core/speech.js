const defaultSynth = () => globalThis.speechSynthesis ?? null

function englishVoices(synth) {
  return synth ? synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en')) : []
}

export function isSpeechAvailable(synth = defaultSynth()) {
  return englishVoices(synth).length > 0
}

export function speak(text, { rate = 1, synth = defaultSynth() } = {}) {
  const voices = englishVoices(synth)
  if (voices.length === 0) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voices.find((v) => v.lang.toLowerCase() === 'en-us') ?? voices[0]
  utterance.lang = utterance.voice.lang
  utterance.rate = rate
  synth.cancel()
  synth.speak(utterance)
}
