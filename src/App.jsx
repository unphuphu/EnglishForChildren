import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import Header from './ui/Header.jsx'
import Home from './ui/Home.jsx'
import ProfilePicker from './ui/ProfilePicker.jsx'
import AddProfile from './ui/AddProfile.jsx'

export default function App() {
  const { currentProfile } = useApp()
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={currentProfile ? <Home /> : <ProfilePicker />} />
        <Route path="/add-profile" element={<AddProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
