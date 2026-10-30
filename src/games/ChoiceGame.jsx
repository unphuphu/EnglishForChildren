import { useState } from 'react'

export default function ChoiceGame({ words, questions, renderPrompt, onFinish }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [results, setResults] = useState([])
  const question = questions[index]
  if (!question) return null

  const answered = picked !== null
  const isLast = index === questions.length - 1

  function choose(option) {
    if (answered) return
    setPicked(option)
    setResults([...results, { wordId: words[index].id, correct: option === question.answer }])
  }

  function next() {
    if (isLast) {
      onFinish(results)
      return
    }
    setIndex(index + 1)
    setPicked(null)
  }

  return (
    <section className="game">
      <p className="progress">{index + 1}/{questions.length}</p>
      <div className="prompt" key={index}>{renderPrompt(question, words[index])}</div>
      <div role="group" aria-label="Đáp án" className="choices">
        {question.options.map((option) => {
          const state = !answered ? '' : option === question.answer ? 'correct' : option === picked ? 'wrong' : ''
          return (
            <button key={option} type="button" className={`choice ${state}`} disabled={answered} onClick={() => choose(option)}>
              {option}
            </button>
          )
        })}
      </div>
      {answered && (
        <p role="status" className="feedback">
          {picked === question.answer ? 'Đúng rồi! 🎉' : `Chưa đúng. Đáp án: ${question.answer}`}
        </p>
      )}
      {answered && (
        <button type="button" className="primary" onClick={next}>
          {isLast ? 'Xem kết quả' : 'Tiếp tục'}
        </button>
      )}
    </section>
  )
}
