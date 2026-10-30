import { Link } from 'react-router-dom'
import { badgeInfo } from './Results.jsx'

// Result of a checkpoint or general test: score, rating, badges and the weak areas to revisit.
export default function AssessmentResults({ summary, retryHref }) {
  const { kind, score, total, rating, passed, xpGained, newBadges, weak } = summary
  return (
    <main className="results">
      <h1>Kết quả</h1>
      <p className="big-xp">{score}/{total}</p>
      <p className="rating">{rating}</p>
      {kind === 'checkpoint' && <p>{passed ? 'Đạt ✅' : 'Chưa đạt, cố gắng làm lại nhé!'}</p>}
      <p>+{xpGained} XP</p>
      {newBadges.length > 0 && (
        <>
          <h2>Huy hiệu mới</h2>
          <ul className="badge-list">
            {newBadges.map((id) => {
              const { title, emoji } = badgeInfo(id)
              return (
                <li key={id} className="badge">
                  <span className="badge-emoji">{emoji}</span>
                  {title}
                </li>
              )
            })}
          </ul>
        </>
      )}
      {weak.lessons.length > 0 && (
        <>
          <h2>Bài ngữ pháp cần ôn lại</h2>
          <ul data-testid="weak-lessons">
            {weak.lessons.map((lesson) => (
              <li key={lesson.id}><Link to={`/grammar/${lesson.id}`}>{lesson.title}</Link></li>
            ))}
          </ul>
        </>
      )}
      {weak.words.length > 0 && (
        <>
          <h2>Từ cần ôn lại</h2>
          <ul data-testid="weak-words">
            {weak.words.map((word) => (
              <li key={word.id}>{word.word} — {word.vi}</li>
            ))}
          </ul>
        </>
      )}
      {(kind === 'test' || !passed) && <p><Link to={retryHref} className="primary">Làm lại</Link></p>}
      <p><Link to="/grammar">Về màn Ngữ pháp</Link></p>
    </main>
  )
}
