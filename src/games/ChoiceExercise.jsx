import { useRef, useState } from 'react'
import SentenceFeedback from './SentenceFeedback.jsx'

// Blank and choose exercises: the child taps one option; there is a single answer per sentence.
export default function ChoiceExercise({ exercise, onAnswer, speechRate = 1, voiceName }) {
  const [picked, setPicked] = useState(null)
  const reported = useRef(false)
  const answered = picked !== null
  const correct = picked === exercise.answer

  function next() {
    if (reported.current) return
    reported.current = true
    onAnswer({
      sentenceId: exercise.sentenceId,
      lessonId: exercise.lessonId,
      wordIds: exercise.wordIds,
      correct,
    })
  }

  return (
    <section className="game choice-exercise">
      {exercise.type === 'blank' ? (
        <>
          <p className="instruction">Điền từ vào chỗ trống:</p>
          <p className="prompt-text">{exercise.text}</p>
        </>
      ) : (
        <p className="instruction">Chọn câu đúng:</p>
      )}
      <div role="group" aria-label="Đáp án" className="choices">
        {exercise.options.map((option) => {
          const state = !answered ? '' : option === exercise.answer ? 'correct' : option === picked ? 'wrong' : ''
          return (
            <button key={option} type="button" className={`choice ${state}`} disabled={answered} onClick={() => setPicked(option)}>
              {option}
            </button>
          )
        })}
      </div>
      {answered && (
        <>
          <SentenceFeedback correct={correct} en={exercise.en} vi={exercise.vi} speechRate={speechRate} voiceName={voiceName} />
          <button type="button" className="primary" onClick={next}>Tiếp tục</button>
        </>
      )}
    </section>
  )
}
