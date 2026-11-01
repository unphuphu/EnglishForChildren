import { useEffect, useState } from 'react'
import { isSpeechAvailable } from './speech.js'

const RECHECK_MS = 500
const SETTLE_MS = 2000

// Browsers load voices asynchronously, so availability can change after first render. Some
// browsers never fire `voiceschanged` for voices that are already installed, so the list is
// also re-read while the page is settling.
export function useSpeechAvailable() {
  const [available, setAvailable] = useState(() => isSpeechAvailable())
  useEffect(() => {
    const update = () => setAvailable(isSpeechAvailable())
    const synth = globalThis.speechSynthesis
    synth?.addEventListener?.('voiceschanged', update)
    const timer = setInterval(update, RECHECK_MS)
    const stop = setTimeout(() => clearInterval(timer), SETTLE_MS)
    update()
    return () => {
      synth?.removeEventListener?.('voiceschanged', update)
      clearInterval(timer)
      clearTimeout(stop)
    }
  }, [])
  return available
}
