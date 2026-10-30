import { Link, Navigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import GrammarExplain from './GrammarExplain.jsx'

export default function GrammarLesson() {
  const { lessonId } = useParams()
  const { lessons, progress, currentProfile } = useApp()
  const lesson = lessons.find((l) => l.id === lessonId)
  if (!lesson) return <Navigate to="/grammar" replace />
  const canPractice = (progress.grammar.lessons[lesson.id]?.partsDone ?? 0) >= 1

  return (
    <main>
      <GrammarExplain lesson={lesson} speechRate={currentProfile.speechRate ?? 1} voiceName={currentProfile.voice ?? undefined} />
      {canPractice ? (
        <Link to={`/grammar/${lesson.id}/practice`} className="primary">Luyện thêm</Link>
      ) : (
        <>
          <button type="button" className="primary" disabled>Luyện thêm</button>
          <p className="hint">Học xong buổi đầu tiên của bài này để luyện thêm nhé.</p>
        </>
      )}
      <p><Link to="/grammar">← Các bài ngữ pháp</Link></p>
    </main>
  )
}
