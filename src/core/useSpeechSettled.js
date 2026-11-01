import { useEffect, useState } from 'react'
// Longer than the time useSpeechAvailable keeps re-reading the voice list.
const SETTLE_MS = 2500

// False for the first moments after mount, so a "no voice" note is not shown while the voice
// list is still loading.
export function useSpeechSettled() {
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [])
  return settled
}
