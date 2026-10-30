import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { MAX_PROFILES } from '../core/profiles.js'

export default function ProfilePicker() {
  const { profileList, switchProfile } = useApp()
  return (
    <main className="picker">
      <h1>English For Children</h1>
      <p className="subtitle">Ai đang học?</p>
      <div className="profile-grid">
        {profileList.map((profile) => (
          <button
            key={profile.id}
            type="button"
            data-testid="profile-tile"
            className="profile-tile"
            onClick={() => switchProfile(profile.id)}
          >
            <span className="avatar" aria-hidden="true">{profile.avatar}</span>
            <span className="profile-name">{profile.name}</span>
          </button>
        ))}
        {profileList.length < MAX_PROFILES && (
          <Link to="/add-profile" className="profile-tile add-tile">
            <span className="avatar" aria-hidden="true">➕</span>
            <span className="profile-name">Thêm hồ sơ</span>
          </Link>
        )}
      </div>
    </main>
  )
}
