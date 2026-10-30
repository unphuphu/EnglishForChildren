import { useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { todayISO } from '../core/date.js'
import { finishSession } from '../core/progress.js'
import {
  buildCheckpoint, isGroupComplete, passedCheckpoint, rateScore, recordAssessment, weakAreas,
} from '../core/assessment.js'
import SentenceExercises from '../games/SentenceExercises.jsx'
import AssessmentResults from './AssessmentResults.jsx'

export default function Checkpoint() {
  const { group } = useParams()
  const location = useLocation()
  const { lessons, progress } = useApp()
  const n = Number(group)
  if (!Number.isInteger(n) || n < 1 || !isGroupComplete({ group: n, lessons, progress })) {
    return <Navigate to="/grammar" replace />
  }
  // A new location key (the retry link) starts a fresh test.
  return <CheckpointRound key={location.key} group={n} />
}

function CheckpointRound({ group }) {
  const { vocab, lessons, progress, currentProfile, saveProgress } = useApp()
  const [today] = useState(() => todayISO())
  const [exercises] = useState(() => buildCheckpoint({ group, lessons, vocab: vocab.all(), progress, today }))
  const [summary, setSummary] = useState(null)

  if (summary) return <AssessmentResults summary={summary} retryHref={`/grammar/checkpoint/${group}`} />
  if (exercises.length === 0) {
    return (
      <main>
        <p>Chưa đủ câu để kiểm tra. Bạn luyện thêm các bài trong nhóm rồi quay lại nhé!</p>
        <Link to="/grammar">← Ngữ pháp</Link>
      </main>
    )
  }

  function finish(sentenceResults) {
    const score = sentenceResults.filter((r) => r.correct).length
    const total = sentenceResults.length
    const out = finishSession(progress, { results: [], sentenceResults, today, vocab: vocab.all() })
    const recorded = recordAssessment(out.state, { kind: 'checkpoint', group, score, total, date: today })
    saveProgress(recorded.state)
    setSummary({
      kind: 'checkpoint',
      score,
      total,
      rating: rateScore(score, total),
      passed: passedCheckpoint(score, total),
      xpGained: out.xpGained,
      newBadges: [...out.newBadges, ...recorded.newBadges],
      weak: weakAreas({ vocabResults: [], sentenceResults, lessons, vocab: vocab.all() }),
    })
  }

  return (
    <main>
      <SentenceExercises
        exercises={exercises}
        onFinish={finish}
        speechRate={currentProfile.speechRate ?? 1}
        voiceName={currentProfile.voice ?? undefined}
      />
    </main>
  )
}
