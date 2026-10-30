import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import Header from './ui/Header.jsx'
import Home from './ui/Home.jsx'
import ProfilePicker from './ui/ProfilePicker.jsx'
import AddProfile from './ui/AddProfile.jsx'
import Topics from './ui/Topics.jsx'
import ModePicker from './ui/ModePicker.jsx'
import Play from './ui/Play.jsx'

export default function App() {
  const { currentProfile } = useApp()
  const signedIn = (element) => (currentProfile ? element : <Navigate to="/" replace />)
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={currentProfile ? <Home /> : <ProfilePicker />} />
        <Route path="/add-profile" element={<AddProfile />} />
        <Route path="/topics" element={signedIn(<Topics />)} />
        <Route path="/topics/:topic" element={signedIn(<ModePicker />)} />
        <Route path="/play/:mode" element={signedIn(<Play />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
