import { useMemo, useRef, useState } from 'react'
import SentenceFeedback from './SentenceFeedback.jsx'

// Order and translate exercises: the child taps word tiles to build a sentence, then checks once.
export default function TileExercise({ exercise, onAnswer, speechRate = 1, voiceName }) {
  const tiles = useMemo(() => exercise.tokens.map((text, id) => ({ id, text })), [exercise])
  const [placed, setPlaced] = useState([])
  const [result, setResult] = useState(null)
  const reported = useRef(false)

  const needsAllTiles = exercise.type === 'order'
  const canCheck = needsAllTiles ? placed.length === tiles.length : placed.length > 0

  function check() {
    const built = placed.map((id) => tiles[id].text).join(' ')
    setResult({ correct: built === exercise.en })
  }

  function next() {
    if (reported.current) return
    reported.current = true
    onAnswer({
      sentenceId: exercise.sentenceId,
      lessonId: exercise.lessonId,
      wordIds: exercise.wordIds,
      correct: result.correct,
    })
  }

  return (
    <section className="game tile-exercise">
      <p className="instruction">
        {exercise.type === 'translate' ? 'Dịch sang tiếng Anh:' : 'Sắp xếp các từ thành câu đúng:'}
      </p>
      {exercise.type === 'translate' && <p className="prompt-text">{exercise.prompt}</p>}
      <div className="answer-line" aria-label="Câu của bạn">
        {placed.map((id) => (
          <button
            key={id}
            type="button"
            className="slot filled"
            aria-label={`bỏ ${tiles[id].text}`}
            disabled={result !== null}
            onClick={() => setPlaced(placed.filter((p) => p !== id))}
          >
            {tiles[id].text}
          </button>
        ))}
      </div>
      <div className="tiles">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="tile word-tile"
            disabled={result !== null || placed.includes(tile.id)}
            onClick={() => setPlaced([...placed, tile.id])}
          >
            {tile.text}
          </button>
        ))}
      </div>
      {result === null ? (
        <button type="button" className="primary" disabled={!canCheck} onClick={check}>Kiểm tra</button>
      ) : (
        <>
          <SentenceFeedback correct={result.correct} en={exercise.en} vi={exercise.vi} speechRate={speechRate} voiceName={voiceName} />
          <button type="button" className="primary" onClick={next}>Tiếp tục</button>
        </>
      )}
    </section>
  )
}
