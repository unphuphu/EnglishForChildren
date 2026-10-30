import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import { currentStreak, levelForXp, xpForLevel } from '../core/progress.js'
import { suggestToday } from '../core/plan.js'
import { todayISO } from '../core/date.js'
import { MODE_LABELS, prettyTopic } from './modes.js'

const GAME_ICONS = { flashcard: '🗂️', quiz: '❓', listen: '🎧', scramble: '🔤', match: '🃏' }

export default function Home() {
  const { currentProfile, progress, vocab, lessons, roadmap } = useApp()
  const speechAvailable = useSpeechAvailable()
  const [noteDismissed, setNoteDismissed] = useState(false)
  const today = todayISO()
  const level = levelForXp(progress.xp)
  const low = xpForLevel(level)
  const high = xpForLevel(level + 1)
  const suggestion = suggestToday({ roadmap, lessons, vocab: vocab.all(), progress })
  const doneToday = progress.daily.date === today && progress.daily.goalAwarded

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

      <section className="today-card">
        <h2>Buổi học hôm nay</h2>
        <p className="today-plan">
          {suggestion.topic
            ? `Hôm nay: chủ đề ${prettyTopic(suggestion.topic)} + ${
              suggestion.lessonId
                ? `bài ${suggestion.lessonTitle} (buổi ${suggestion.part}/${suggestion.sessions})`
                : 'ôn ngữ pháp'}`
            : 'Hôm nay chưa có chủ đề nào.'}
        </p>
        <p className="today-status">{doneToday ? 'Đã xong ✅' : 'Chưa làm'}</p>
        <Link to="/lesson" className="primary big">Bắt đầu</Link>
        <Link to="/lesson/topic" className="change-topic">Đổi chủ đề</Link>
      </section>

      <Link to="/play/daily" className="topic-card quick-review">⚡ Ôn nhanh</Link>

      <h2>Chơi game</h2>
      <div className="game-grid">
        {Object.entries(MODE_LABELS).map(([mode, label]) => (
          <Link key={mode} to={`/games/${mode}`} className="topic-card">
            <span className="game-icon" aria-hidden="true">{GAME_ICONS[mode]}</span>
            <br />
            {label}
          </Link>
        ))}
      </div>
      <nav className="home-links">
        <Link to="/topics">Chủ đề</Link>
        <Link to="/profile">Hồ sơ &amp; huy hiệu</Link>
        <Link to="/settings">Cài đặt</Link>
      </nav>
    </main>
  )
}
