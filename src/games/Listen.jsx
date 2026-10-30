import { useEffect, useMemo } from 'react'
import ChoiceGame from './ChoiceGame.jsx'
import { buildQuestion } from './quizLogic.js'
import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'

function AudioPrompt({ word, question, rate }) {
  const available = useSpeechAvailable()
  useEffect(() => {
    if (available) speak(word.word, { rate })
  }, [available, word.word, rate])

  if (!available) {
    return (
      <>
        {question.emoji && <span className="emoji" aria-hidden="true">{question.emoji}</span>}
        <span className="prompt-text">{question.prompt}</span>
      </>
    )
  }
  return (
    <button type="button" className="speaker" aria-label="Nghe lại" onClick={() => speak(word.word, { rate })}>
      🔊
    </button>
  )
}

export default function Listen({ words, pool, onFinish, speechRate = 1 }) {
  const questions = useMemo(() => words.map((word) => buildQuestion(word, pool, 'vi2en')), [words, pool])
  return (
    <ChoiceGame
      words={words}
      questions={questions}
      onFinish={onFinish}
      renderPrompt={(q, word) => <AudioPrompt word={word} question={q} rate={speechRate} />}
    />
  )
}
