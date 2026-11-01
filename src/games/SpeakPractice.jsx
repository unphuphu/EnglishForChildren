import { useState } from 'react'
import { speak } from '../core/speech.js'
import { listen } from '../core/speechRecognition.js'
import { scoreSentence, scoreWord } from '../core/pronunciation.js'

const MAX_TRIES = 3

// The child reads `target` aloud; the browser listens and the words are compared. A miss never blocks:
// up to 3 tries, then the parent's `onDone` (when given) offers to move on. `onDone({ correct, tries, skipped })`.
export default function SpeakPractice({ target, kind = 'word', onDone, speechRate = 1, voiceName }) {
  const [status, setStatus] = useState('idle')
  const [tries, setTries] = useState(0)
  const [detail, setDetail] = useState(null)

  async function start() {
    setStatus('listening')
    const heard = await listen()
    setTries(tries + 1)
    if (!heard.ok) {
      setDetail({ reason: heard.reason })
      setStatus(heard.reason === 'denied' ? 'denied' : 'miss')
      return
    }
    const score = kind === 'sentence' ? scoreSentence(target, heard.alternatives) : scoreWord(target, heard.alternatives)
    if (score.ok) {
      setDetail(null)
      setStatus('right')
      return
    }
    setDetail({ heard: score.heard, missing: kind === 'sentence' ? score.missing : [] })
    setStatus('miss')
    speak(target, { rate: speechRate, voice: voiceName })
  }

  const finish = (skipped) => onDone?.({ correct: status === 'right', tries, skipped })
  const canRetry = status === 'miss' && tries < MAX_TRIES
  const spent = status === 'miss' && tries >= MAX_TRIES

  return (
    <div className="speak-practice">
      {(status === 'idle' || status === 'listening') && (
        <button type="button" className="mic" disabled={status === 'listening'} onClick={start}>
          {status === 'listening' ? '🎙️ Đang nghe...' : '🎤 Nói'}
        </button>
      )}
      <div role="status" className="speak-result">
        {status === 'right' && <p className="feedback">Đúng rồi! 🎉</p>}
        {status === 'denied' && (
          <p className="error">Chưa cho phép dùng micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang để cho phép.</p>
        )}
        {status === 'miss' && detail?.reason && <p>Mình chưa nghe thấy gì, thử lại nhé.</p>}
        {status === 'miss' && detail?.heard && <p>Mình nghe được: “{detail.heard}”</p>}
        {status === 'miss' && detail?.missing?.length > 0 && <p>Chưa nghe thấy: {detail.missing.join(', ')}</p>}
        {spent && <p>Đã thử {MAX_TRIES} lần rồi, mình đi tiếp nhé.</p>}
      </div>
      {canRetry && (
        <button type="button" className="mic" onClick={start}>🎤 Thử lại</button>
      )}
      {onDone && (status === 'right' || spent || status === 'denied') && (
        <button type="button" className="primary" onClick={() => finish(false)}>Tiếp tục</button>
      )}
      {onDone && (status === 'miss' || status === 'idle') && !spent && (
        <button type="button" className="skip" onClick={() => finish(true)}>Bỏ qua</button>
      )}
    </div>
  )
}
