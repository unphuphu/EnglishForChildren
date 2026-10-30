import { useApp } from '../context/AppContext.jsx'
import { BADGES } from '../core/config.js'
import { currentStreak, levelForXp } from '../core/progress.js'
import { isMastered } from '../core/srs.js'
import { todayISO } from '../core/date.js'
import { badgeInfo } from './Results.jsx'

export default function ProfileScreen() {
  const { currentProfile, progress } = useApp()
  const mastered = Object.values(progress.cards).filter(isMastered).length
  const earnedTopics = progress.badges.filter((id) => id.startsWith('topic-complete:'))

  return (
    <main className="profile-screen">
      <h1>
        <span aria-hidden="true">{currentProfile.avatar}</span> {currentProfile.name}
      </h1>
      <p>Cấp {levelForXp(progress.xp)}</p>
      <p>{progress.xp} XP</p>
      <p>Đã thuộc {mastered} từ</p>
      <p>Chuỗi ngày: 🔥 {currentStreak(progress, todayISO())}</p>
      <h2>Huy hiệu</h2>
      <ul className="badge-list">
        {BADGES.map((b) => (
          <li key={b.id} data-testid={`badge-${b.id}`} className={`badge ${progress.badges.includes(b.id) ? '' : 'locked'}`}>
            <span className="badge-emoji">{b.emoji}</span>
            {b.title}
          </li>
        ))}
        {earnedTopics.map((id) => {
          const { title, emoji } = badgeInfo(id)
          return (
            <li key={id} data-testid={`badge-${id}`} className="badge">
              <span className="badge-emoji">{emoji}</span>
              {title}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
