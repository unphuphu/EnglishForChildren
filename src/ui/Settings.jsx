import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import { AVATARS } from '../core/profiles.js'
import { exportProfile, importProfile } from '../core/exportImport.js'
import { GOAL_OPTIONS } from './AddProfile.jsx'

const IMPORT_ERRORS = {
  INVALID_FILE: 'Tệp không hợp lệ.',
  MAX_PROFILES: 'Đã đủ 4 hồ sơ, hãy xóa bớt một hồ sơ trước.',
}

export default function Settings() {
  const { storage, profiles, profileList, currentProfile, refresh } = useApp()
  const navigate = useNavigate()
  const speechAvailable = useSpeechAvailable()
  const [name, setName] = useState(currentProfile.name)
  const [confirming, setConfirming] = useState(false)
  const [importMessage, setImportMessage] = useState(null)
  const [importError, setImportError] = useState(null)
  const [nameError, setNameError] = useState(null)
  const takenByOthers = new Set(profileList.filter((p) => p.id !== currentProfile.id).map((p) => p.avatar))
  const rate = currentProfile.speechRate ?? 1

  function update(patch) {
    profiles.update(currentProfile.id, patch)
    refresh()
  }

  function saveName() {
    try {
      update({ name })
      setNameError(null)
    } catch {
      setNameError('Hãy nhập tên của bạn.')
    }
  }

  async function handleImport(event) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    setImportMessage(null)
    setImportError(null)
    try {
      const created = importProfile(storage, await file.text())
      setImportMessage(`Đã nhập hồ sơ ${created.name}`)
      refresh()
    } catch (e) {
      setImportError(IMPORT_ERRORS[e.message] ?? IMPORT_ERRORS.INVALID_FILE)
    }
    input.value = ''
  }

  function remove() {
    profiles.remove(currentProfile.id)
    refresh()
    navigate('/')
  }

  const exportHref = `data:application/json;charset=utf-8,${encodeURIComponent(exportProfile(storage, currentProfile.id))}`

  return (
    <main className="settings">
      <h1>Cài đặt</h1>

      <section>
        <label className="field">
          Tên
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </label>
        <button type="button" className="primary" onClick={saveName}>Lưu tên</button>
        {nameError && <p role="alert" className="error">{nameError}</p>}
        <div className="avatar-grid" role="group" aria-label="Ảnh đại diện">
          {AVATARS.map((a) => (
            <button key={a} type="button" className={`avatar-option ${currentProfile.avatar === a ? 'selected' : ''}`}
              aria-pressed={currentProfile.avatar === a} disabled={takenByOthers.has(a)} onClick={() => update({ avatar: a })}>
              {a}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="field">
          Mục tiêu mỗi ngày (số từ)
          <select value={currentProfile.dailyGoal} onChange={(e) => update({ dailyGoal: Number(e.target.value) })}>
            {GOAL_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
      </section>

      {speechAvailable && (
        <section>
          <label className="field">
            Tốc độ đọc
            <input type="range" min="0.6" max="1.2" step="0.1" value={rate}
              onChange={(e) => update({ speechRate: Number(e.target.value) })} />
          </label>
          <button type="button" className="primary" onClick={() => speak('Hello', { rate })}>Thử nghe</button>
        </section>
      )}

      <section>
        <h2>Sao lưu</h2>
        <a className="primary" href={exportHref} download={`english-${currentProfile.name}.json`}>Xuất tiến độ</a>
        <label className="field">
          Nhập tiến độ
          <input type="file" accept="application/json" onChange={handleImport} />
        </label>
        {importMessage && <p role="status">{importMessage}</p>}
        {importError && <p role="alert" className="error">{importError}</p>}
      </section>

      <section>
        {!confirming ? (
          <button type="button" className="danger" onClick={() => setConfirming(true)}>Xóa hồ sơ</button>
        ) : (
          <div>
            <p className="error">Xóa hồ sơ {currentProfile.name} và toàn bộ tiến độ? Không thể hoàn tác.</p>
            <button type="button" className="danger" onClick={remove}>Xác nhận xóa</button>{' '}
            <button type="button" className="primary" onClick={() => setConfirming(false)}>Không xóa</button>
          </div>
        )}
      </section>
    </main>
  )
}
