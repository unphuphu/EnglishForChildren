import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import Header from './ui/Header.jsx'
import Home from './ui/Home.jsx'
import ProfilePicker from './ui/ProfilePicker.jsx'
import AddProfile from './ui/AddProfile.jsx'
import Topics from './ui/Topics.jsx'
import ModePicker from './ui/ModePicker.jsx'
import Play from './ui/Play.jsx'
import GameTopics from './ui/GameTopics.jsx'
import Lesson from './ui/Lesson.jsx'
import ProfileScreen from './ui/ProfileScreen.jsx'
import Settings from './ui/Settings.jsx'
import Recovery from './ui/Recovery.jsx'

export default function App() {
  const { currentProfile, progressProblem } = useApp()
  if (currentProfile && progressProblem) {
    return (
      <>
        <Header />
        <Recovery />
      </>
    )
  }
  const signedIn = (element) => (currentProfile ? element : <Navigate to="/" replace />)
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={currentProfile ? <Home /> : <ProfilePicker />} />
        <Route path="/add-profile" element={<AddProfile />} />
        <Route path="/topics" element={signedIn(<Topics />)} />
        <Route path="/topics/:topic" element={signedIn(<ModePicker />)} />
        <Route path="/lesson" element={signedIn(<Lesson />)} />
        <Route path="/games/:mode" element={signedIn(<GameTopics />)} />
        <Route path="/play/:mode" element={signedIn(<Play />)} />
        <Route path="/profile" element={signedIn(<ProfileScreen />)} />
        <Route path="/settings" element={signedIn(<Settings />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
