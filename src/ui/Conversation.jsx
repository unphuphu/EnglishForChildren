import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { AI_PROBLEMS, checkAi, DEFAULT_MODEL } from '../core/aiChat.js'
import scenarios from '../data/scenarios.json'
import ChatSession from './ChatSession.jsx'

// Scenario list, then one conversation. With AI on (the default) the local model is checked first; if it
// cannot be used the same scenario runs as a scripted dialogue and the reason is shown.
export default function Conversation() {
  const { currentProfile } = useApp()
  const [chosen, setChosen] = useState(null)
  const [round, setRound] = useState(0)
  const [problem, setProblem] = useState(null)
  const [checking, setChecking] = useState(false)
  const [mode, setMode] = useState('scripted')
  const aiOn = currentProfile.aiEnabled !== false

  useEffect(() => {
    if (!chosen) return undefined
    if (!aiOn) {
      setMode('scripted')
      setProblem(null)
      return undefined
    }
    let live = true
    setChecking(true)
    checkAi({ model: currentProfile.aiModel || DEFAULT_MODEL }).then((status) => {
      if (!live) return
      setMode(status.ok ? 'ai' : 'scripted')
      setProblem(status.ok ? null : AI_PROBLEMS[status.reason] ?? AI_PROBLEMS.unreachable)
      setChecking(false)
    })
    return () => { live = false }
  }, [chosen, round, aiOn, currentProfile.aiModel])

  if (chosen) {
    if (checking) return <main className="chat-page"><p role="status">Đang kết nối AI...</p></main>
    return (
      <main className="chat-page">
        {problem && (
          <p className="notice" role="status">
            {problem} Mình dùng bài hội thoại soạn sẵn nhé.
          </p>
        )}
        <ChatSession
          key={`${chosen.id}-${round}-${mode}`}
          scenario={chosen}
          mode={mode}
          onExit={() => { setChosen(null); setRound((r) => r + 1) }}
        />
      </main>
    )
  }

  return (
    <main className="chat-page">
      <h1>Trò chuyện</h1>
      <p className="subtitle">
        {aiOn ? 'Chọn một tình huống và nói chuyện với AI bằng tiếng Anh.' : 'Chọn một tình huống để luyện nói theo bài soạn sẵn.'}
      </p>
      <div className="topic-grid">
        {scenarios.map((scenario) => (
          <button key={scenario.id} type="button" className="topic-card" onClick={() => setChosen(scenario)}>
            <span className="game-icon" aria-hidden="true">{scenario.emoji}</span>
            <br />
            {scenario.title}
          </button>
        ))}
      </div>
    </main>
  )
}
