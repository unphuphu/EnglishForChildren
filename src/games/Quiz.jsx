import { useMemo } from 'react'
import ChoiceGame from './ChoiceGame.jsx'
import { buildQuestion } from './quizLogic.js'

export default function Quiz({ words, pool, onFinish }) {
  const questions = useMemo(
    () => words.map((word, i) => buildQuestion(word, pool, i % 2 === 0 ? 'vi2en' : 'en2vi')),
    [words, pool],
  )
  return (
    <ChoiceGame
      words={words}
      questions={questions}
      onFinish={onFinish}
      renderPrompt={(q) => (
        <>
          {q.emoji && <span className="emoji" aria-hidden="true">{q.emoji}</span>}
          <span className="prompt-text">{q.prompt}</span>
        </>
      )}
    />
  )
}
