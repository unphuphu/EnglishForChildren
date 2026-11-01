import { useId, useState } from 'react'
import { MAX_DAILY_GOAL, MIN_DAILY_GOAL } from '../core/profiles.js'

export const GOAL_OPTIONS = [5, 10, 15, 20, 30]

const parseGoal = (text) => {
  const n = Number(text)
  return text.trim() !== '' && Number.isInteger(n) && n >= MIN_DAILY_GOAL && n <= MAX_DAILY_GOAL ? n : null
}

// Preset sizes as radio buttons plus a free number field. A typed goal is applied on blur or Enter
// and only when valid, so a half-typed "3" on the way to "30" never reaches the profile.
export default function GoalPicker({ value, onChange, name = 'goal' }) {
  const customId = useId()
  const isPreset = GOAL_OPTIONS.includes(value)
  const [custom, setCustom] = useState(isPreset ? '' : String(value))
  const invalid = custom !== '' && parseGoal(custom) === null

  function commitCustom() {
    const goal = parseGoal(custom)
    if (goal !== null) onChange(goal)
    else setCustom(isPreset ? '' : String(value))
  }

  return (
    <div className="goal-picker">
      {GOAL_OPTIONS.map((goal) => (
        <label key={goal} className="goal-option">
          <input
            type="radio"
            name={name}
            value={goal}
            checked={value === goal}
            onChange={() => { setCustom(''); onChange(goal) }}
          />
          {goal}
        </label>
      ))}
      <label className="goal-option goal-custom" htmlFor={customId}>
        Tự chọn
        <input
          id={customId}
          type="number"
          inputMode="numeric"
          min={MIN_DAILY_GOAL}
          max={MAX_DAILY_GOAL}
          value={custom}
          aria-invalid={invalid}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            commitCustom()
          }}
        />
      </label>
      {invalid && <p role="alert" className="error">Nhập từ {MIN_DAILY_GOAL} đến {MAX_DAILY_GOAL} từ.</p>}
    </div>
  )
}
