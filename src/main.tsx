import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { AppWrapper } from './components/AppWrapper'
import './styles/terminal.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  </StrictMode>,
)
