import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { buildLesson } from '../core/lesson.js'
import { finishSession } from '../core/progress.js'
import { todayISO } from '../core/date.js'
import Flashcard from '../games/Flashcard.jsx'
import Quiz from '../games/Quiz.jsx'
import SentenceExercises from '../games/SentenceExercises.jsx'
import GrammarExplain from './GrammarExplain.jsx'
import Results from './Results.jsx'

// The four steps of a daily lesson, in order. A step with nothing to do is skipped.
const STEPS = ['new', 'explain', 'exercises', 'review']

export default function Lesson() {
  const [search] = useSearchParams()
  const [round, setRound] = useState(0)
  return <LessonRound key={round} topic={search.get('topic')} onAgain={() => setRound((r) => r + 1)} />
}

function LessonRound({ topic, onAgain }) {
  const { vocab, lessons, roadmap, progress, currentProfile, saveProgress } = useApp()
  const [today] = useState(() => todayISO())
  const [lesson] = useState(() => buildLesson({
    roadmap, lessons, vocab: vocab.all(), progress, today, goal: currentProfile.dailyGoal, topic,
  }))
  const grammar = lesson.lesson ? lessons.find((l) => l.id === lesson.lesson.id) : null

  const stages = STEPS.filter((step) => {
    if (step === 'new') return lesson.newWords.length > 0
    if (step === 'explain') return grammar !== null
    if (step === 'exercises') return lesson.exercises.length > 0 || lesson.notice !== null
    return lesson.reviewWords.length > 0
  })
  const [position, setPosition] = useState(0)
  const [collected, setCollected] = useState({ words: [], sentences: [] })
  const [summary, setSummary] = useState(null)

  if (summary) return <Results summary={summary} onAgain={onAgain} />
  if (stages.length === 0) {
    return (
      <main>
        <p>Chưa có gì để học hôm nay.</p>
        <Link to="/">Về trang chủ</Link>
      </main>
    )
  }

  function complete(next) {
    if (position < stages.length - 1) {
      setCollected(next)
      setPosition(position + 1)
      return
    }
    const out = finishSession(progress, {
      results: next.words,
      sentenceResults: next.sentences,
      today,
      vocab: vocab.all(),
      completesLesson: true,
      grammarRef: { lessonId: lesson.lesson?.id ?? null, part: lesson.lesson?.part ?? null, advancePlan: lesson.lesson !== null },
    })
    saveProgress(out.state)
    const wrongIds = new Set(next.words.filter((r) => !r.correct).map((r) => r.wordId))
    setSummary({
      xpGained: out.xpGained,
      newBadges: out.newBadges,
      lessonDone: true,
      reviewWords: [...wrongIds].map((id) => vocab.get(id)).filter(Boolean),
    })
  }

  const stage = stages[position]
  const speech = { speechRate: currentProfile.speechRate ?? 1, voiceName: currentProfile.voice ?? undefined }
  let body
  if (stage === 'new') {
    body = (
      <Flashcard
        words={lesson.newWords}
        pool={vocab.all()}
        onFinish={(res) => complete({ ...collected, words: [...collected.words, ...res] })}
        {...speech}
      />
    )
  } else if (stage === 'explain') {
    body = (
      <GrammarExplain lesson={grammar} short={lesson.lesson.short} autoRead onDone={() => complete(collected)} {...speech} />
    )
  } else if (stage === 'exercises') {
    body = lesson.exercises.length > 0 ? (
      <SentenceExercises
        exercises={lesson.exercises}
        onFinish={(res) => complete({ ...collected, sentences: res })}
        {...speech}
      />
    ) : (
      <section className="game">
        <p className="notice">{lesson.notice}</p>
        <p>Hôm nay chưa đủ câu để luyện tập. Bạn học thêm từ rồi mình luyện câu nhé!</p>
        <button type="button" className="primary" onClick={() => complete(collected)}>Tiếp tục</button>
      </section>
    )
  } else {
    body = (
      <Quiz
        words={lesson.reviewWords}
        pool={vocab.all()}
        onFinish={(res) => complete({ ...collected, words: [...collected.words, ...res] })}
        {...speech}
      />
    )
  }

  return (
    <main>
      <p className="stage">Bước {STEPS.indexOf(stage) + 1}/4</p>
      {body}
    </main>
  )
}
