import { useEffect, useRef, useState } from 'react'
import ChoiceExercise from './ChoiceExercise.jsx'
import TileExercise from './TileExercise.jsx'

// Runs a list of exercises one after another and reports one result per sentence.
export default function SentenceExercises({ exercises, onFinish, speechRate = 1, voiceName }) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState([])
  const finishedEmpty = useRef(false)

  useEffect(() => {
    if (exercises.length === 0 && !finishedEmpty.current) {
      finishedEmpty.current = true
      onFinish([])
    }
  }, [exercises, onFinish])

  const exercise = exercises[index]
  if (!exercise) return null

  function handleAnswer(result) {
    const all = [...results, result]
    if (index === exercises.length - 1) {
      onFinish(all)
      return
    }
    setResults(all)
    setIndex(index + 1)
  }

  const Component = exercise.type === 'order' || exercise.type === 'translate' ? TileExercise : ChoiceExercise
  return (
    <>
      <p className="progress">{index + 1}/{exercises.length}</p>
      <Component key={index} exercise={exercise} onAnswer={handleAnswer} speechRate={speechRate} voiceName={voiceName} />
    </>
  )
}
