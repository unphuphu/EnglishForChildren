import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import { useAutoSpeak } from './useAutoSpeak.js'

// Shown after a sentence exercise is answered: the verdict, the correct sentence with its
// translation, and the correct English sentence read aloud once (never before the answer).
export default function SentenceFeedback({ correct, en, vi, speechRate = 1, voiceName }) {
  const available = useSpeechAvailable()
  useAutoSpeak(en, { rate: speechRate, voice: voiceName })
  return (
    <div className="sentence-feedback">
      <p role="status" className="feedback">
        {correct ? 'Đúng rồi! 🎉' : `Chưa đúng. Câu đúng: ${en}`}
      </p>
      <p className="translation">{vi}</p>
      {available && (
        <button type="button" className="speaker" aria-label="Nghe lại" onClick={() => speak(en, { rate: speechRate, voice: voiceName })}>
          🔊
        </button>
      )}
    </div>
  )
}
