import { useEffect, useMemo, useRef, useState } from 'react'
import { buildMatchBoard } from './matchLogic.js'
import { speak } from '../core/speech.js'

const MISMATCH_DELAY_MS = 800

export default function Match({ words, onFinish, rng = Math.random, speechRate = 1, voiceName }) {
  const board = useMemo(() => buildMatchBoard(words, rng), [words, rng])
  const wordIds = useMemo(() => {
    const onBoard = new Set(board.map((c) => c.wordId))
    return words.filter((w) => onBoard.has(w.id)).map((w) => w.id)
  }, [words, board])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [mistakes, setMistakes] = useState([])
  const [seconds, setSeconds] = useState(0)
  const finished = useRef(false)
  const allMatched = wordIds.length > 0 && matched.length === wordIds.length

  useEffect(() => {
    if (allMatched) return undefined
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [allMatched])

  useEffect(() => {
    if (flipped.length !== 2) return undefined
    const [first, second] = flipped.map((id) => board.find((c) => c.id === id))
    if (first.wordId === second.wordId) {
      setMatched((m) => [...m, first.wordId])
      setFlipped([])
      return undefined
    }
    setMistakes((m) => [...new Set([...m, first.wordId, second.wordId])])
    const timer = setTimeout(() => setFlipped([]), MISMATCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [flipped, board])

  useEffect(() => {
    if (!allMatched || finished.current) return
    finished.current = true
    onFinish(wordIds.map((wordId) => ({ wordId, correct: !mistakes.includes(wordId) })))
  }, [allMatched, wordIds, mistakes, onFinish])

  function flip(card) {
    if (flipped.length >= 2 || flipped.includes(card.id) || matched.includes(card.wordId)) return
    setFlipped([...flipped, card.id])
    if (card.kind === 'en') speak(card.text, { rate: speechRate, voice: voiceName })
  }

  return (
    <section className="game match">
      <p className="timer">⏱ {seconds}s</p>
      <div className="board">
        {board.map((card) => {
          const faceUp = flipped.includes(card.id) || matched.includes(card.wordId)
          return (
            <button
              key={card.id}
              type="button"
              data-testid={`card-${card.wordId}-${card.kind}`}
              className={`match-card ${faceUp ? 'up' : 'down'} ${matched.includes(card.wordId) ? 'matched' : ''}`}
              onClick={() => flip(card)}
            >
              {faceUp ? card.text : '❓'}
            </button>
          )
        })}
      </div>
    </section>
  )
}
