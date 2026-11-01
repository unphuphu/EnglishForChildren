import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { addBonusXp } from '../core/progress.js'
import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import { listen } from '../core/speechRecognition.js'
import { chatCompletion, DEFAULT_MODEL } from '../core/aiChat.js'
import {
  buildMessages, childTurns, cleanReply, CONVERSATION_XP, MAX_INPUT, MAX_TURNS, MIN_TURNS_FOR_XP, STOP,
} from '../core/conversation.js'
import { buildCheckMessages, parseCorrection } from '../core/correction.js'
import { useAutoSpeak } from '../games/useAutoSpeak.js'
import { useMic } from './useMic.js'

// One conversation. `mode` is 'ai' (local model) or 'scripted' (fixed dialogue with tappable answers).
export default function ChatSession({ scenario, mode, onExit }) {
  const { currentProfile, progress, saveProgress, vocab } = useApp()
  const speechAvailable = useSpeechAvailable()
  const mic = useMic()
  const rate = currentProfile.speechRate ?? 1
  const voice = currentProfile.voice ?? undefined
  const model = currentProfile.aiModel || DEFAULT_MODEL

  const [history, setHistory] = useState([{ role: 'ai', text: scenario.opening }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hints, setHints] = useState({})
  const [listening, setListening] = useState(false)
  const [finished, setFinished] = useState(false)
  const awarded = useRef(false)
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])

  const lastAi = [...history].reverse().find((turn) => turn.role === 'ai')
  useAutoSpeak(finished ? null : lastAi?.text, { rate, voice })

  const turns = childTurns(history)
  const limit = mode === 'ai' ? MAX_TURNS : scenario.script.length
  const knownWords = vocab.all()
    .filter((w) => w.topic === scenario.topic && progress.cards[w.id])
    .map((w) => w.word)

  function finish(nextHistory) {
    setFinished(true)
    if (!awarded.current && childTurns(nextHistory) >= MIN_TURNS_FOR_XP) {
      awarded.current = true
      saveProgress(addBonusXp(progress, CONVERSATION_XP))
    }
  }

  async function askAi(nextHistory) {
    controller.current?.abort()
    controller.current = new AbortController()
    setBusy(true)
    setFailed(false)
    try {
      const text = await chatCompletion({
        messages: buildMessages({ scenario, knownWords, history: nextHistory }),
        model,
        stop: STOP,
        signal: controller.current.signal,
      })
      const reply = cleanReply(text)
      if (!reply) throw new Error('empty')
      const withReply = [...nextHistory, { role: 'ai', text: reply }]
      setHistory(withReply)
      if (childTurns(withReply) >= MAX_TURNS) finish(withReply)
    } catch (error) {
      if (error?.name !== 'AbortError') setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  function send(event) {
    event.preventDefault()
    const text = input.trim().slice(0, MAX_INPUT)
    if (!text || busy) return
    const next = [...history, { role: 'child', text }]
    setHistory(next)
    setInput('')
    askAi(next)
  }

  function choose(option) {
    const reply = scenario.script[turns].reply
    const next = [...history, { role: 'child', text: option }, { role: 'ai', text: reply }]
    setHistory(next)
    if (turns + 1 >= limit) finish(next)
  }

  async function dictate() {
    setListening(true)
    const heard = await listen()
    setListening(false)
    if (heard.ok) setInput(heard.alternatives[0].slice(0, MAX_INPUT))
  }

  async function askHint(index) {
    setHints((h) => ({ ...h, [index]: { status: 'loading' } }))
    try {
      const out = await chatCompletion({
        messages: buildCheckMessages(history[index].text),
        model,
        temperature: 0.1,
        maxTokens: 50,
        stop: ['\n'],
      })
      const fix = parseCorrection(history[index].text, out)
      setHints((h) => ({ ...h, [index]: fix ? { status: 'fix', fix } : { status: 'ok' } }))
    } catch {
      setHints((h) => ({ ...h, [index]: { status: 'error' } }))
    }
  }

  if (finished) {
    const earned = awarded.current
    return (
      <section className="game chat-end">
        <h2>Giỏi lắm!</h2>
        <p>Bạn đã trò chuyện {turns} lượt.</p>
        {earned
          ? <p className="big-xp">+{CONVERSATION_XP} XP</p>
          : <p>Trò chuyện ít nhất {MIN_TURNS_FOR_XP} lượt để nhận XP nhé.</p>}
        <button type="button" className="primary" onClick={onExit}>Chọn tình huống khác</button>
      </section>
    )
  }

  const options = mode === 'scripted' ? scenario.script[turns]?.options ?? [] : []
  return (
    <section className="chat">
      <h2>{scenario.emoji} {scenario.title}</h2>
      <p className="progress">Lượt {Math.min(turns + 1, limit)}/{limit}</p>
      <ol className="bubbles" aria-label="Cuộc trò chuyện">
        {history.map((turn, index) => (
          <li key={index} className={`bubble ${turn.role}`}>
            <span>{turn.text}</span>
            {turn.role === 'ai' && speechAvailable && (
              <button type="button" className="speaker small" aria-label={`Nghe: ${turn.text}`}
                onClick={() => speak(turn.text, { rate, voice })}>🔊</button>
            )}
            {turn.role === 'child' && mode === 'ai' && (
              <div className="hint-area">
                {!hints[index] && <button type="button" className="skip" onClick={() => askHint(index)}>Gợi ý sửa</button>}
                {hints[index]?.status === 'loading' && <span>Đang xem câu của bạn...</span>}
                {hints[index]?.status === 'ok' && <span>Câu của bạn ổn rồi 👍</span>}
                {hints[index]?.status === 'error' && <span>Chưa xem được câu này, thử lại sau nhé.</span>}
                {hints[index]?.status === 'fix' && (
                  <span className="hint-fix">
                    Thử viết:{' '}
                    {hints[index].fix.parts.map((part, i) => (
                      <span key={i}>{part.changed ? <mark>{part.text}</mark> : part.text}{' '}</span>
                    ))}
                    <small>AI gợi ý, có thể chưa đúng</small>
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
        {busy && <li className="bubble ai thinking" role="status">AI đang nghĩ...</li>}
      </ol>

      {failed && (
        <p role="alert" className="error">
          Chưa nhận được câu trả lời.{' '}
          <button type="button" className="skip" onClick={() => askAi(history)}>Thử lại</button>
        </p>
      )}

      {mode === 'ai' ? (
        <form className="chat-input" onSubmit={send}>
          <input
            aria-label="Câu của bạn"
            value={input}
            maxLength={MAX_INPUT}
            placeholder="Gõ câu tiếng Anh của bạn"
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          {mic && (
            <button type="button" className="mic" onClick={dictate} disabled={busy || listening}>
              {listening ? '🎙️ Đang nghe...' : '🎤 Nói'}
            </button>
          )}
          <button type="submit" className="primary" disabled={busy || input.trim() === ''}>Gửi</button>
        </form>
      ) : (
        <div className="choices" role="group" aria-label="Chọn câu trả lời">
          {options.map((option) => (
            <button key={option} type="button" className="choice" onClick={() => choose(option)}>{option}</button>
          ))}
        </div>
      )}
      <button type="button" className="skip" onClick={() => finish(history)}>Kết thúc</button>
    </section>
  )
}
