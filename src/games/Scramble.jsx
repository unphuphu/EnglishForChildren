import { useMemo, useState } from 'react'
import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import { assemble, lettersOf, scramble } from './scrambleLogic.js'

const MAX_ATTEMPTS = 2

export default function Scramble({ words, onFinish, rng = Math.random, speechRate = 1, voiceName }) {
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState([])
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState('playing')
  const [results, setResults] = useState([])
  const available = useSpeechAvailable()
  const word = words[index]
  const tiles = useMemo(
    () => (word ? scramble(word.word, rng).map((ch, id) => ({ id, ch })) : []),
    [word, rng],
  )
  if (!word) return null

  const total = lettersOf(word.word).length
  const done = status === 'right' || status === 'revealed'
  const isLast = index === words.length - 1

  function pick(tile) {
    const next = [...chosen, tile.id]
    setChosen(next)
    if (next.length < total) return
    const guess = assemble(word.word, next.map((id) => tiles[id].ch))
    if (guess.toLowerCase() === word.word.toLowerCase()) {
      setStatus('right')
      setResults([...results, { wordId: word.id, correct: true }])
    } else if (attempts + 1 >= MAX_ATTEMPTS) {
      setAttempts(attempts + 1)
      setStatus('revealed')
      setResults([...results, { wordId: word.id, correct: false }])
    } else {
      setAttempts(attempts + 1)
      setStatus('retry')
      setChosen([])
    }
  }

  function next() {
    if (isLast) {
      onFinish(results)
      return
    }
    setIndex(index + 1)
    setChosen([])
    setAttempts(0)
    setStatus('playing')
  }

  let slot = 0
  const answerLine = [...word.word].map((ch, i) => {
    if (ch === ' ' || ch === '-') return <span key={i} className="sep">{ch === ' ' ? '\u00A0' : '-'}</span>
    const tileId = chosen[slot]
    slot += 1
    if (tileId === undefined) return <span key={i} className="slot">_</span>
    const letter = tiles[tileId].ch
    return (
      <button key={i} type="button" className="slot filled" aria-label={`bỏ ${letter}`} disabled={done}
        onClick={() => setChosen(chosen.filter((id) => id !== tileId))}>
        {letter}
      </button>
    )
  })

  return (
    <section className="game scramble">
      <p className="progress">{index + 1}/{words.length}</p>
      <div className="prompt">
        {word.emoji && <span className="emoji" aria-hidden="true">{word.emoji}</span>}
        <span className="prompt-text">{word.vi}</span>
        {available && (
          <button type="button" className="speaker" aria-label="Nghe phát âm" onClick={() => speak(word.word, { rate: speechRate, voice: voiceName })}>
            🔊
          </button>
        )}
      </div>
      <div className="answer-line">{answerLine}</div>
      <div className="tiles">
        {tiles.map((tile) => (
          <button key={tile.id} type="button" className="tile" disabled={done || chosen.includes(tile.id)} onClick={() => pick(tile)}>
            {tile.ch}
          </button>
        ))}
      </div>
      {status !== 'playing' && (
        <p role="status" className="feedback">
          {status === 'right' && 'Đúng rồi! 🎉'}
          {status === 'retry' && 'Chưa đúng, thử lại nhé!'}
          {status === 'revealed' && `Đáp án: ${word.word}`}
        </p>
      )}
      {done && (
        <button type="button" className="primary" onClick={next}>
          {isLast ? 'Xem kết quả' : 'Tiếp tục'}
        </button>
      )}
    </section>
  )
}
