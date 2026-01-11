import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GameProvider } from './context/GameContext'
import { UserProvider } from './context/UserContext'
import { CampaignProvider } from './context/CampaignContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <CampaignProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </CampaignProvider>
    </UserProvider>
  </StrictMode>,
)
