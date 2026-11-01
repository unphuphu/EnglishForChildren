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
import ChangeTopic from './ui/ChangeTopic.jsx'
import GrammarList from './ui/GrammarList.jsx'
import GrammarLesson from './ui/GrammarLesson.jsx'
import GrammarPractice from './ui/GrammarPractice.jsx'
import Checkpoint from './ui/Checkpoint.jsx'
import GeneralTest from './ui/GeneralTest.jsx'
import ProfileScreen from './ui/ProfileScreen.jsx'
import Settings from './ui/Settings.jsx'
import Conversation from './ui/Conversation.jsx'
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
        <Route path="/grammar" element={signedIn(<GrammarList />)} />
        <Route path="/grammar/checkpoint/:group" element={signedIn(<Checkpoint />)} />
        <Route path="/test" element={signedIn(<GeneralTest />)} />
        <Route path="/grammar/:lessonId" element={signedIn(<GrammarLesson />)} />
        <Route path="/grammar/:lessonId/practice" element={signedIn(<GrammarPractice />)} />
        <Route path="/lesson" element={signedIn(<Lesson />)} />
        <Route path="/lesson/topic" element={signedIn(<ChangeTopic />)} />
        <Route path="/games/:mode" element={signedIn(<GameTopics />)} />
        <Route path="/play/:mode" element={signedIn(<Play />)} />
        <Route path="/chat" element={signedIn(<Conversation />)} />
        <Route path="/profile" element={signedIn(<ProfileScreen />)} />
        <Route path="/settings" element={signedIn(<Settings />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
