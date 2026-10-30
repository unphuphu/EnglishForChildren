import { useState } from 'react'
import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'

export default function Flashcard({ words, onFinish, speechRate = 1 }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([])
  const available = useSpeechAvailable()
  const word = words[index]
  if (!word) return null

  function answer(correct) {
    const next = [...results, { wordId: word.id, correct, selfReported: true }]
    if (index === words.length - 1) {
      onFinish(next)
      return
    }
    setResults(next)
    setIndex(index + 1)
    setFlipped(false)
  }

  return (
    <section className="game flashcard">
      <p className="progress">{index + 1}/{words.length}</p>
      <div className="card">
        {word.emoji && <span className="emoji" aria-hidden="true">{word.emoji}</span>}
        <h2 className="card-word">{word.word}</h2>
        {available && (
          <button type="button" className="speaker" aria-label="Nghe phát âm" onClick={() => speak(word.word, { rate: speechRate })}>
            🔊
          </button>
        )}
        {flipped && (
          <div className="card-back">
            <p className="card-vi">{word.vi}</p>
            <p className="card-ipa">{word.ipa}</p>
            <p className="card-example">{word.example}</p>
            <p className="card-example-vi">{word.exampleVi}</p>
          </div>
        )}
      </div>
      {!flipped ? (
        <button type="button" className="primary" onClick={() => setFlipped(true)}>Lật thẻ</button>
      ) : (
        <div className="self-assess">
          <button type="button" className="choice wrong" onClick={() => answer(false)}>Chưa nhớ</button>
          <button type="button" className="choice correct" onClick={() => answer(true)}>Đã nhớ</button>
        </div>
      )}
    </section>
  )
}
