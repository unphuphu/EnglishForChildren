import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { todayISO } from '../core/date.js'
import { finishSession } from '../core/progress.js'
import { buildGeneralTest, rateScore, recordAssessment, weakAreas } from '../core/assessment.js'
import Quiz from '../games/Quiz.jsx'
import SentenceExercises from '../games/SentenceExercises.jsx'
import AssessmentResults from './AssessmentResults.jsx'

export default function GeneralTest() {
  const location = useLocation()
  // A new location key (the retry link) starts a fresh test.
  return <GeneralTestRound key={location.key} />
}

function GeneralTestRound() {
  const { vocab, lessons, progress, currentProfile, saveProgress } = useApp()
  const [today] = useState(() => todayISO())
  const [test] = useState(() => buildGeneralTest({ lessons, vocab: vocab.all(), progress, today }))
  const [position, setPosition] = useState(0)
  const [vocabResults, setVocabResults] = useState([])
  const [summary, setSummary] = useState(null)

  if (summary) return <AssessmentResults summary={summary} retryHref="/test" />
  if (test === null) {
    return (
      <main>
        <h1>Kiểm tra tổng hợp</h1>
        <p>Cần học ít nhất 10 từ để làm bài kiểm tra tổng hợp.</p>
        <Link to="/">Về trang chủ</Link>
      </main>
    )
  }

  const stages = [
    ...(test.vocabWords.length > 0 ? ['vocab'] : []),
    ...(test.exercises.length > 0 ? ['grammar'] : []),
  ]

  function finish(vocabDone, sentenceResults) {
    const all = [...vocabDone, ...sentenceResults]
    const score = all.filter((r) => r.correct).length
    const total = all.length
    const out = finishSession(progress, { results: vocabDone, sentenceResults, today, vocab: vocab.all() })
    const recorded = recordAssessment(out.state, { kind: 'test', score, total, date: today })
    saveProgress(recorded.state)
    setSummary({
      kind: 'test',
      score,
      total,
      rating: rateScore(score, total),
      passed: null,
      xpGained: out.xpGained,
      newBadges: [...out.newBadges, ...recorded.newBadges],
      weak: weakAreas({ vocabResults: vocabDone, sentenceResults, lessons, vocab: vocab.all() }),
    })
  }

  const speech = { speechRate: currentProfile.speechRate ?? 1, voiceName: currentProfile.voice ?? undefined }
  const stage = stages[position]
  const isLast = position === stages.length - 1
  return (
    <main>
      {stages.length > 1 && <p className="stage">Phần {position + 1}/{stages.length}: {stage === 'vocab' ? 'Từ vựng' : 'Ngữ pháp'}</p>}
      {stage === 'vocab' ? (
        <Quiz
          words={test.vocabWords}
          pool={vocab.all()}
          {...speech}
          onFinish={(res) => {
            if (isLast) finish(res, [])
            else {
              setVocabResults(res)
              setPosition(position + 1)
            }
          }}
        />
      ) : (
        <SentenceExercises exercises={test.exercises} {...speech} onFinish={(res) => finish(vocabResults, res)} />
      )}
    </main>
  )
}
