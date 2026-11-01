import { useState } from 'react'
import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import SpeakPractice from '../games/SpeakPractice.jsx'

// The daily lesson's speaking step: read a few of today's sentences aloud. `onFinish(correctCount)`.
export default function SpeakStep({ sentences, onFinish, speechRate = 1, voiceName }) {
  const [index, setIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const available = useSpeechAvailable()
  const sentence = sentences[index]
  if (!sentence) return null

  function done({ correct }) {
    const total = correctCount + (correct ? 1 : 0)
    if (index === sentences.length - 1) {
      onFinish(total)
      return
    }
    setCorrectCount(total)
    setIndex(index + 1)
  }

  return (
    <section className="game speak-step">
      <h2>Đọc to nào</h2>
      <p className="progress">{index + 1}/{sentences.length}</p>
      <p className="prompt-text">{sentence.en}</p>
      <p className="translation">{sentence.vi}</p>
      {available && (
        <button type="button" className="speaker" aria-label="Nghe mẫu" onClick={() => speak(sentence.en, { rate: speechRate, voice: voiceName })}>
          🔊
        </button>
      )}
      <SpeakPractice key={index} target={sentence.en} kind="sentence" onDone={done} speechRate={speechRate} voiceName={voiceName} />
    </section>
  )
}
