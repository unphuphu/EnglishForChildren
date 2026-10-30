import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function Header() {
  const { currentProfile, switchProfile, storage } = useApp()
  const navigate = useNavigate()
  if (!currentProfile) return null

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">English For Children</Link>
        <button
          type="button"
          className="header-avatar"
          aria-label="Đổi người dùng"
          onClick={() => {
            switchProfile(null)
            navigate('/')
          }}
        >
          {currentProfile.avatar}
        </button>
      </header>
      {!storage.isPersistent() && (
        <p role="status" className="notice">
          ⚠️ Tiến độ sẽ không được lưu khi đóng trình duyệt (trình duyệt đang chặn lưu dữ liệu).
        </p>
      )}
    </>
  )
}
