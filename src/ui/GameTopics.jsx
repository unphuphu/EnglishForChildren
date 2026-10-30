import { Link, Navigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { MODE_LABELS, prettyTopic } from './modes.js'

export default function GameTopics() {
  const { mode } = useParams()
  const { vocab } = useApp()
  if (!MODE_LABELS[mode]) return <Navigate to="/" replace />

  return (
    <main>
      <h1>{MODE_LABELS[mode]}</h1>
      <p>Chọn chủ đề để chơi:</p>
      <div className="topic-grid">
        <Link to={`/play/${mode}?topic=all`} className="topic-card">Tất cả chủ đề (trộn)</Link>
        {vocab.topics().map(({ topic, count }) => (
          <Link key={topic} to={`/play/${mode}?topic=${topic}`} className="topic-card">
            <span>{prettyTopic(topic)}</span>
            <br />
            <span className="topic-progress">{count} từ</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
