import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { buildLesson } from '../core/lesson.js'
import { addBonusXp, finishSession } from '../core/progress.js'
import { todayISO } from '../core/date.js'
import Flashcard from '../games/Flashcard.jsx'
import Quiz from '../games/Quiz.jsx'
import SentenceExercises from '../games/SentenceExercises.jsx'
import GrammarExplain from './GrammarExplain.jsx'
import SpeakStep from './SpeakStep.jsx'
import { useMic } from './useMic.js'
import Results from './Results.jsx'

// The steps of a daily lesson, in order. A step with nothing to do is skipped. The speaking step is
// only part of the lesson when the browser can listen (and the profile has not switched it off).
const STEPS = ['new', 'explain', 'exercises', 'review']
const STEPS_WITH_SPEAKING = ['new', 'explain', 'exercises', 'speak', 'review']
const SPEAK_SENTENCES = 3
const XP_PER_SPOKEN_SENTENCE = 5

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
  const mic = useMic()
  const steps = mic ? STEPS_WITH_SPEAKING : STEPS
  const grammar = lesson.lesson ? lessons.find((l) => l.id === lesson.lesson.id) : null

  const stages = steps.filter((step) => {
    if (step === 'new') return lesson.newWords.length > 0
    if (step === 'explain') return grammar !== null
    if (step === 'exercises') return lesson.exercises.length > 0 || lesson.notice !== null
    if (step === 'speak') return lesson.exercises.length > 0
    return lesson.reviewWords.length > 0
  })
  const [position, setPosition] = useState(0)
  const [summary, setSummary] = useState(null)
  // Every finished step is saved at once, so leaving half way keeps it; only the last step also
  // completes the lesson (goal bonus, streak, grammar part, next roadmap step).
  const saved = useRef(progress)
  const earned = useRef({ xp: 0, badges: [], wrongWordIds: new Set() })

  if (summary) return <Results summary={summary} onAgain={onAgain} />
  if (stages.length === 0) {
    return (
      <main>
        <p>Chưa có gì để học hôm nay.</p>
        <Link to="/">Về trang chủ</Link>
      </main>
    )
  }

  const isLast = position === stages.length - 1

  function commit(results, sentenceResults) {
    const out = finishSession(saved.current, {
      results,
      sentenceResults,
      today,
      vocab: vocab.all(),
      completesLesson: isLast,
      grammarRef: isLast
        ? { lessonId: lesson.lesson?.id ?? null, part: lesson.lesson?.part ?? null, advancePlan: lesson.lesson !== null }
        : null,
    })
    saved.current = out.state
    saveProgress(out.state)
    earned.current.xp += out.xpGained
    earned.current.badges.push(...out.newBadges.filter((id) => !earned.current.badges.includes(id)))
    for (const r of results) if (!r.correct) earned.current.wrongWordIds.add(r.wordId)

    if (!isLast) {
      setPosition(position + 1)
      return
    }
    setSummary({
      xpGained: earned.current.xp,
      newBadges: earned.current.badges,
      lessonDone: true,
      reviewWords: [...earned.current.wrongWordIds].map((id) => vocab.get(id)).filter(Boolean),
    })
  }

  function commitSpoken(correctCount) {
    const bonus = correctCount * XP_PER_SPOKEN_SENTENCE
    saved.current = addBonusXp(saved.current, bonus)
    earned.current.xp += bonus
    commit([], [])
  }

  const stage = stages[position]
  const speech = { speechRate: currentProfile.speechRate ?? 1, voiceName: currentProfile.voice ?? undefined }
  let body
  if (stage === 'new') {
    body = <Flashcard words={lesson.newWords} pool={vocab.all()} onFinish={(res) => commit(res, [])} {...speech} />
  } else if (stage === 'explain') {
    body = <GrammarExplain lesson={grammar} short={lesson.lesson.short} autoRead onDone={() => commit([], [])} {...speech} />
  } else if (stage === 'exercises') {
    body = lesson.exercises.length > 0 ? (
      <SentenceExercises exercises={lesson.exercises} onFinish={(res) => commit([], res)} {...speech} />
    ) : (
      <section className="game">
        <p className="notice">{lesson.notice}</p>
        <p>Hôm nay chưa đủ câu để luyện tập. Bạn học thêm từ rồi mình luyện câu nhé!</p>
        <button type="button" className="primary" onClick={() => commit([], [])}>Tiếp tục</button>
      </section>
    )
  } else if (stage === 'speak') {
    body = <SpeakStep sentences={lesson.exercises.slice(0, SPEAK_SENTENCES)} onFinish={commitSpoken} {...speech} />
  } else {
    body = <Quiz words={lesson.reviewWords} pool={vocab.all()} onFinish={(res) => commit(res, [])} {...speech} />
  }

  return (
    <main>
      <p className="stage">Bước {steps.indexOf(stage) + 1}/{steps.length}</p>
      {body}
    </main>
  )
}
