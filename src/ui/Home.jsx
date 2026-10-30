import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import { currentStreak, dailyCount, levelForXp, xpForLevel } from '../core/progress.js'
import { todayISO } from '../core/date.js'

export default function Home() {
  const { currentProfile, progress } = useApp()
  const speechAvailable = useSpeechAvailable()
  const [noteDismissed, setNoteDismissed] = useState(false)
  const today = todayISO()
  const level = levelForXp(progress.xp)
  const low = xpForLevel(level)
  const high = xpForLevel(level + 1)
  const count = dailyCount(progress, today)
  const goal = currentProfile.dailyGoal

  return (
    <main className="home">
      {!speechAvailable && !noteDismissed && (
        <p className="notice">
          Máy này chưa có giọng đọc tiếng Anh nên chưa nghe được phát âm. Bạn vẫn học được bằng chữ và hình.{' '}
          <button type="button" onClick={() => setNoteDismissed(true)}>Đóng</button>
        </p>
      )}
      {progress.streak.count > 0 && currentStreak(progress, today) === 0 && (
        <p className="notice">Chuỗi ngày đã bị ngắt. Hôm nay bắt đầu lại nào! 💪</p>
      )}
      <h1>Xin chào, {currentProfile.name}!</h1>
      <div className="stats">
        <span className="streak" aria-label="Chuỗi ngày">🔥 {currentStreak(progress, today)}</span>
        <span className="level">Cấp {level}</span>
      </div>
      <progress className="xp-bar" max={high - low} value={progress.xp - low} aria-label="Điểm kinh nghiệm" />
      <p className="xp-text">{progress.xp - low}/{high - low} XP</p>
      <div className="goal">
        <p>Mục tiêu hôm nay</p>
        <progress max={goal} value={Math.min(count, goal)} aria-label="Tiến độ mục tiêu" />
        <span className="goal-count">{count}/{goal}</span>
      </div>
      <Link to="/play/daily" className="primary big">Học hôm nay</Link>
      <nav className="home-links">
        <Link to="/topics">Chủ đề</Link>
        <Link to="/profile">Hồ sơ &amp; huy hiệu</Link>
        <Link to="/settings">Cài đặt</Link>
      </nav>
    </main>
  )
}
