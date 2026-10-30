import { useEffect, useState } from 'react'
import { isSpeechAvailable } from './speech.js'

// Browsers load voices asynchronously, so availability can change after first render.
export function useSpeechAvailable() {
  const [available, setAvailable] = useState(() => isSpeechAvailable())
  useEffect(() => {
    const synth = globalThis.speechSynthesis
    if (!synth?.addEventListener) return undefined
    const update = () => setAvailable(isSpeechAvailable())
    synth.addEventListener('voiceschanged', update)
    return () => synth.removeEventListener('voiceschanged', update)
  }, [])
  return available
}
