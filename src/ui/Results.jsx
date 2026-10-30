import { Link } from 'react-router-dom'
import { BADGES } from '../core/config.js'
import { prettyTopic } from './modes.js'

export function badgeInfo(id) {
  const known = BADGES.find((b) => b.id === id)
  if (known) return { title: known.title, emoji: known.emoji }
  if (id.startsWith('topic-complete:')) {
    return { title: `Hoàn thành chủ đề ${prettyTopic(id.slice('topic-complete:'.length))}`, emoji: '🏆' }
  }
  return { title: id, emoji: '🏅' }
}

export default function Results({ summary, onAgain }) {
  const { xpGained, newBadges, lessonDone, reviewWords } = summary
  return (
    <main className="results">
      <h1>Hoàn thành! 🎉</h1>
      <p className="big-xp">+{xpGained} XP</p>
      {lessonDone && <p>Buổi học hôm nay đã xong ✅</p>}
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
      {reviewWords.length > 0 && (
        <>
          <h2>Cần ôn lại</h2>
          <ul data-testid="review-list">
            {reviewWords.map((w) => (
              <li key={w.id}>{w.word} — {w.vi}</li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="primary" onClick={onAgain}>Chơi tiếp</button>
      <p><Link to="/">Về trang chủ</Link></p>
    </main>
  )
}
