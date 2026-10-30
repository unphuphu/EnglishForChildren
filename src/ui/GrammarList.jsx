import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export const lessonStatus = (partsDone, sessions) => {
  if (partsDone >= sessions) return 'Đã học'
  return partsDone > 0 ? 'Đang học' : 'Chưa học'
}

export default function GrammarList() {
  const { lessons, progress } = useApp()
  const ordered = [...lessons].sort((a, b) => a.order - b.order)
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
    </main>
  )
}
