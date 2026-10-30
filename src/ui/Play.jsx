import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { buildDailySession, buildTopicSession } from '../core/session.js'
import { dailyCount, finishSession } from '../core/progress.js'
import { todayISO } from '../core/date.js'
import Flashcard from '../games/Flashcard.jsx'
import Quiz from '../games/Quiz.jsx'
import Listen from '../games/Listen.jsx'
import Scramble from '../games/Scramble.jsx'
import Match from '../games/Match.jsx'
import Results from './Results.jsx'

const GAMES = { flashcard: Flashcard, quiz: Quiz, listen: Listen, scramble: Scramble, match: Match }

export default function Play() {
  const { mode } = useParams()
  const [search] = useSearchParams()
  const [round, setRound] = useState(0)
  const topic = search.get('topic')
  if (mode !== 'daily' && !GAMES[mode]) return <Navigate to="/" replace />
  if (mode !== 'daily' && !topic) return <Navigate to="/topics" replace />
  return <PlayRound key={round} mode={mode} topic={topic} onAgain={() => setRound((r) => r + 1)} />
}

function PlayRound({ mode, topic, onAgain }) {
  const { vocab, progress, currentProfile, saveProgress } = useApp()
  const [today] = useState(() => todayISO())
  const [session] = useState(() => {
    const all = vocab.all()
    if (mode === 'daily') return buildDailySession({ vocab: all, progress, today })
    const built = buildTopicSession({ vocab: all, topic, progress, today })
    return { ...built, steps: built.steps.filter((s) => s.mode === mode) }
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [collected, setCollected] = useState([])
  const [summary, setSummary] = useState(null)

  if (summary) return <Results summary={summary} onAgain={onAgain} />
  if (session.steps.length === 0 || session.words.length === 0) {
    return (
      <main>
        <p>Chưa có từ nào để học ở đây.</p>
        <Link to="/">Về trang chủ</Link>
      </main>
    )
  }

  function handleStepDone(stepResults) {
    const results = [...collected, ...stepResults]
    if (stepIndex < session.steps.length - 1) {
      setCollected(results)
      setStepIndex(stepIndex + 1)
      return
    }
    const goal = currentProfile.dailyGoal
    const out = finishSession(progress, { results, goal, today, vocab: vocab.all() })
    saveProgress(out.state)
    const wrongIds = new Set(results.filter((r) => !r.correct).map((r) => r.wordId))
    setSummary({
      xpGained: out.xpGained,
      newBadges: out.newBadges,
      goalReachedNow: out.goalReachedNow,
      reviewWords: session.words.filter((w) => wrongIds.has(w.id)),
      count: dailyCount(out.state, today),
      goal,
    })
  }

  const step = session.steps[stepIndex]
  const Game = GAMES[step.mode]
  return (
    <main>
      <Game
        key={stepIndex}
        words={step.words}
        pool={vocab.all()}
        onFinish={handleStepDone}
        speechRate={currentProfile.speechRate ?? 1}
      />
    </main>
  )
}
