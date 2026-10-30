import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { isMastered } from '../core/srs.js'
import { prettyTopic } from './modes.js'

export default function Topics() {
  const { vocab, progress } = useApp()
  return (
    <main>
      <h1>Chọn chủ đề</h1>
      <div className="topic-grid">
        {vocab.topics().map(({ topic, count }) => {
          const mastered = vocab.byTopic(topic).filter((w) => progress.cards[w.id] && isMastered(progress.cards[w.id])).length
          return (
            <Link key={topic} to={`/topics/${topic}`} className="topic-card">
              <span>{prettyTopic(topic)}</span>
              <br />
              <span className="topic-progress">{mastered}/{count}</span>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
