import { useEffect, useState } from 'react'
import { listEnglishVoices } from './speech.js'

// Voices load asynchronously in browsers, so the list is refreshed on `voiceschanged`.
export function useEnglishVoices() {
  const [voices, setVoices] = useState(() => listEnglishVoices())
  useEffect(() => {
    const synth = globalThis.speechSynthesis
    if (!synth?.addEventListener) return undefined
    const update = () => setVoices(listEnglishVoices())
    synth.addEventListener('voiceschanged', update)
    return () => synth.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}
