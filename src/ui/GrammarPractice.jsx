import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { LESSON } from '../core/config.js'
import { todayISO } from '../core/date.js'
import { finishSession } from '../core/progress.js'
import { assignTypes, buildExercise, pickSentences } from '../core/sentences.js'
import SentenceExercises from '../games/SentenceExercises.jsx'
import Results from './Results.jsx'
import { NOT_ENOUGH_WORDS_NOTICE } from '../core/lesson.js'

export default function GrammarPractice() {
  const { lessonId } = useParams()
  const { lessons, progress } = useApp()
  const [round, setRound] = useState(0)
  if (!lessons.some((l) => l.id === lessonId)) return <Navigate to="/grammar" replace />
  if ((progress.grammar.lessons[lessonId]?.partsDone ?? 0) < 1) return <Navigate to={`/grammar/${lessonId}`} replace />
  return <PracticeRound key={round} lessonId={lessonId} onAgain={() => setRound((r) => r + 1)} />
}

// Extra practice of one lesson: sentences from every part, only with words the child has learned.
// It earns XP and reviews words but never completes a daily lesson.
function PracticeRound({ lessonId, onAgain }) {
  const { vocab, lessons, progress, currentProfile, saveProgress } = useApp()
  const [today] = useState(() => todayISO())
  const [exercises] = useState(() => {
    const picks = pickSentences({
      lessons, lessonId, part: null, vocab: vocab.all(), progress, today, count: LESSON.SENTENCES,
    })
    if (picks.length < LESSON.MIN_SENTENCES) return []
    const types = assignTypes(picks.map((p) => p.sentence))
    return picks.map((p, i) => buildExercise(p.sentence, p.lessonId, types[i], p.wordIds))
  })
  const [summary, setSummary] = useState(null)

  if (summary) return <Results summary={summary} onAgain={onAgain} />
  if (exercises.length === 0) {
    return (
      <main>
        <p className="notice">{NOT_ENOUGH_WORDS_NOTICE}</p>
        <p>Chưa đủ câu để luyện bài này. Bạn học thêm từ rồi quay lại nhé!</p>
        <Link to={`/grammar/${lessonId}`}>← Về bài học</Link>
      </main>
    )
  }

  return (
    <main>
      <SentenceExercises
        exercises={exercises}
        speechRate={currentProfile.speechRate ?? 1}
        voiceName={currentProfile.voice ?? undefined}
        onFinish={(sentenceResults) => {
          const out = finishSession(progress, { results: [], sentenceResults, today, vocab: vocab.all() })
          saveProgress(out.state)
          setSummary({ xpGained: out.xpGained, newBadges: out.newBadges, lessonDone: false, reviewWords: [] })
        }}
      />
    </main>
  )
}
