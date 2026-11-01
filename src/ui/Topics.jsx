import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { prettyTopic } from './modes.js'

export default function Topics() {
  const { vocab, progress } = useApp()
  const topics = vocab.topics().map(({ topic, count }) => ({
    topic,
    count,
    learned: vocab.byTopic(topic).filter((w) => progress.cards[w.id]).length,
  }))
  const totalLearned = topics.reduce((sum, t) => sum + t.learned, 0)
  const total = topics.reduce((sum, t) => sum + t.count, 0)
  return (
    <main>
      <h1>Chọn chủ đề</h1>
      <p className="topic-total">Đã học tổng cộng: <strong>{totalLearned}/{total}</strong> từ</p>
      <div className="topic-grid">
        {topics.map(({ topic, count, learned }) => (
          <Link key={topic} to={`/topics/${topic}`} className="topic-card">
            <span>{prettyTopic(topic)}</span>
            <br />
            <span className="topic-progress" title="Số từ đã học">{learned}/{count}</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
