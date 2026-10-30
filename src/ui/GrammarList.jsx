import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { ASSESSMENT } from '../core/config.js'
import { groupOf, isGroupComplete } from '../core/assessment.js'

export const lessonStatus = (partsDone, sessions) => {
  if (partsDone >= sessions) return 'Đã học'
  return partsDone > 0 ? 'Đang học' : 'Chưa học'
}

export default function GrammarList() {
  const { lessons, progress, vocab } = useApp()
  const ordered = [...lessons].sort((a, b) => a.order - b.order)
  const groups = [...new Set(ordered.map((l) => groupOf(l.order)))]
    .filter((group) => isGroupComplete({ group, lessons, progress }))
  const learnedWords = vocab.all().filter((w) => progress.cards[w.id]).length
  const canTest = learnedWords >= ASSESSMENT.TEST_MIN_WORDS

  return (
    <main>
      <h1>Ngữ pháp</h1>
      {ordered.length === 0 ? (
        <p>Chưa có bài ngữ pháp nào.</p>
      ) : (
        <div className="topic-grid">
          {ordered.map((lesson) => (
            <Link key={lesson.id} to={`/grammar/${lesson.id}`} className="topic-card">
              <span>{lesson.order}. {lesson.title}</span>
              <br />
              <span className="topic-progress">
                {lessonStatus(progress.grammar.lessons[lesson.id]?.partsDone ?? 0, lesson.sessions)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <h2>Kiểm tra</h2>
      <div className="topic-grid">
        {groups.map((group) => {
          const best = progress.grammar.checkpoints[group]
          return (
            <Link key={group} to={`/grammar/checkpoint/${group}`} className="topic-card">
              <span>Kiểm tra nhóm {group}</span>
              {best && (
                <>
                  <br />
                  <span className="topic-progress">Điểm tốt nhất: {best.best}/{best.total}</span>
                </>
              )}
            </Link>
          )
        })}
        {canTest ? (
          <Link to="/test" className="topic-card">Kiểm tra tổng hợp</Link>
        ) : (
          <div className="topic-card disabled">
            <span>Kiểm tra tổng hợp</span>
            <br />
            <span className="topic-progress">Cần học ít nhất {ASSESSMENT.TEST_MIN_WORDS} từ</span>
          </div>
        )}
      </div>
    </main>
  )
}
