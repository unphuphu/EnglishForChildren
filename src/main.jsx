import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import { createStorage } from './core/storage.js'
import { cleanOldData } from './core/dataVersion.js'
import './styles.css'

const storage = createStorage()
cleanOldData(storage)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary storage={storage}>
      <BrowserRouter>
        <AppProvider storage={storage}>
          <App />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
