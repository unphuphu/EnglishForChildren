import { useEffect } from 'react'
import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'

// Reads `text` aloud once each time it changes to a new non-empty value.
// Pass null to stay silent (for example while the answer must stay hidden).
export function useAutoSpeak(text, { rate = 1, voice } = {}) {
  const available = useSpeechAvailable()
  useEffect(() => {
    if (available && text) speak(text, { rate, voice })
  }, [text, available, rate, voice])
}
