import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { isMastered } from '../core/srs.js'
import { prettyTopic } from './modes.js'

export default function Topics() {
  const { vocab, progress } = useApp()
  const topics = vocab.topics().map(({ topic, count }) => {
    const seen = vocab.byTopic(topic).filter((w) => progress.cards[w.id])
    return { topic, count, learned: seen.length, mastered: seen.filter((w) => isMastered(progress.cards[w.id])).length }
  })
  const sum = (key) => topics.reduce((total, t) => total + t[key], 0)
  return (
    <main>
      <h1>Chọn chủ đề</h1>
      <p className="topic-total">
        Đã học: <strong>{sum('learned')}/{sum('count')}</strong> từ · Đã thuộc: <strong>{sum('mastered')}</strong>
      </p>
      <div className="topic-grid">
        {topics.map(({ topic, count, learned, mastered }) => (
          <Link key={topic} to={`/topics/${topic}`} className="topic-card">
            <span>{prettyTopic(topic)}</span>
            <br />
            <span className="topic-progress" title="Số từ đã học">Đã học {learned}/{count}</span>
            <span className="topic-progress" title="Số từ đã thuộc">Đã thuộc {mastered}</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
