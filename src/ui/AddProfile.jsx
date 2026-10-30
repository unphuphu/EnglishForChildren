import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { AVATARS, DEFAULT_DAILY_GOAL } from '../core/profiles.js'

export const GOAL_OPTIONS = [5, 10, 15, 20]

const ERRORS = {
  MAX_PROFILES: 'Đã đủ 4 hồ sơ rồi.',
  AVATAR_TAKEN: 'Ảnh này đã có người chọn.',
  NAME_REQUIRED: 'Hãy nhập tên của bạn.',
  GOAL_TOO_LOW: 'Mục tiêu mỗi ngày ít nhất là 5 từ.',
  INVALID_AVATAR: 'Hãy chọn một ảnh đại diện.',
}

export default function AddProfile() {
  const { profiles, profileList, switchProfile } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL)
  const [error, setError] = useState(null)
  const taken = new Set(profileList.map((p) => p.avatar))

  function submit(event) {
    event.preventDefault()
    try {
      const profile = profiles.add({ name, avatar, dailyGoal })
      switchProfile(profile.id)
      navigate('/')
    } catch (e) {
      setError(ERRORS[e.message] ?? 'Có lỗi xảy ra, thử lại nhé.')
    }
  }

  return (
    <main className="add-profile">
      <h1>Hồ sơ mới</h1>
      <form onSubmit={submit}>
        <label className="field">
          Tên của bạn
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </label>
        <div className="avatar-grid" role="group" aria-label="Chọn ảnh đại diện">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={`avatar-option ${avatar === a ? 'selected' : ''}`}
              aria-pressed={avatar === a}
              disabled={taken.has(a)}
              onClick={() => setAvatar(a)}
            >
              {a}
            </button>
          ))}
        </div>
        <fieldset className="goal-chooser">
          <legend>Mỗi ngày học bao nhiêu từ?</legend>
          {GOAL_OPTIONS.map((goal) => (
            <label key={goal} className="goal-option">
              <input type="radio" name="goal" value={goal} checked={dailyGoal === goal} onChange={() => setDailyGoal(goal)} />
              {goal}
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" className="primary">Tạo hồ sơ</button>
      </form>
    </main>
  )
}
