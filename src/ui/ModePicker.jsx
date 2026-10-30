import { Link, useParams } from 'react-router-dom'
import { MODE_LABELS, prettyTopic } from './modes.js'

export default function ModePicker() {
  const { topic } = useParams()
  return (
    <main>
      <h1>{prettyTopic(topic)}</h1>
      <p>Chọn cách chơi:</p>
      <div className="topic-grid">
        {Object.entries(MODE_LABELS).map(([mode, label]) => (
          <Link key={mode} to={`/play/${mode}?topic=${topic}`} className="topic-card">{label}</Link>
        ))}
      </div>
      <p><Link to="/topics">← Các chủ đề</Link></p>
    </main>
  )
}
