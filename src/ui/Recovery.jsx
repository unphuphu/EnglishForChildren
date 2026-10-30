import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Recovery() {
  const { currentProfile, hasBackup, recoverProgress, resetProgress } = useApp()
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="recovery">
      <h1>Dữ liệu học bị hỏng</h1>
      <p>
        Không đọc được tiến độ của {currentProfile.name}. Dữ liệu cũ vẫn được giữ nguyên, chưa bị xóa.
        Nhờ phụ huynh chọn một cách bên dưới.
      </p>
      {hasBackup && (
        <button type="button" className="primary" onClick={recoverProgress}>Khôi phục bản sao lưu</button>
      )}
      {!confirming ? (
        <p>
          <button type="button" className="danger" onClick={() => setConfirming(true)}>Bắt đầu lại từ đầu</button>
        </p>
      ) : (
        <div>
          <p className="error">Tiến độ hiện tại sẽ được thay bằng tiến độ trống. Bạn chắc chứ?</p>
          <button type="button" className="danger" onClick={resetProgress}>Xác nhận bắt đầu lại</button>{' '}
          <button type="button" className="primary" onClick={() => setConfirming(false)}>Quay lại</button>
        </div>
      )}
    </main>
  )
}
