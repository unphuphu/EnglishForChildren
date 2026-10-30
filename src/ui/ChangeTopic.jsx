import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { suggestToday } from '../core/plan.js'
import { prettyTopic } from './modes.js'

// Lets the child pick another vocabulary topic for today's lesson. The grammar lesson stays
// the same: only the new words change.
export default function ChangeTopic() {
  const { vocab, lessons, roadmap, progress } = useApp()
  const suggested = suggestToday({ roadmap, lessons, vocab: vocab.all(), progress }).topic
  return (
    <main>
      <h1>Đổi chủ đề</h1>
      <p>Chọn chủ đề từ vựng cho buổi học hôm nay:</p>
      <div className="topic-grid">
        {vocab.topics().map(({ topic, count }) => (
          <Link key={topic} to={`/lesson?topic=${topic}`} className="topic-card">
            <span>{prettyTopic(topic)}</span>
            <br />
            <span className="topic-progress">{count} từ</span>
            {topic === suggested && <span className="tag"> ⭐ Gợi ý</span>}
          </Link>
        ))}
      </div>
    </main>
  )
}
