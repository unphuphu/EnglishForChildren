import { useMemo } from 'react'
import ChoiceGame from './ChoiceGame.jsx'
import { buildQuestion } from './quizLogic.js'

// Even questions ask for the English word from its meaning (the word is read after answering,
// so it does not give the answer away); odd questions show the English word, which is read at once.
const asksForEnglish = (index) => index % 2 === 0

export default function Quiz({ words, pool, onFinish, speechRate, voiceName }) {
  const questions = useMemo(
    () => words.map((word, i) => buildQuestion(word, pool, asksForEnglish(i) ? 'vi2en' : 'en2vi')),
    [words, pool],
  )
  return (
    <ChoiceGame
      words={words}
      questions={questions}
      onFinish={onFinish}
      speechRate={speechRate}
      voiceName={voiceName}
      getSpeech={({ word, answered, index }) => (asksForEnglish(index) && !answered ? null : word.word)}
      renderPrompt={(q) => (
        <>
          {q.emoji && <span className="emoji" aria-hidden="true">{q.emoji}</span>}
          <span className="prompt-text">{q.prompt}</span>
        </>
      )}
    />
  )
}
