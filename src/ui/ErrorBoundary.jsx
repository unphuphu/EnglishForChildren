import { Component } from 'react'
import { createStorage } from '../core/storage.js'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  reload = () => (this.props.onReload ?? (() => window.location.reload()))()

  switchUser = () => {
    const storage = this.props.storage ?? createStorage()
    storage.remove('currentProfile')
    this.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="recovery">
        <h1>Có lỗi xảy ra</h1>
        <p>Ứng dụng gặp sự cố. Dữ liệu của bạn không bị xóa.</p>
        <button type="button" className="primary" onClick={this.reload}>Tải lại</button>{' '}
        <button type="button" className="primary" onClick={this.switchUser}>Đổi người dùng</button>
      </main>
    )
  }
}
