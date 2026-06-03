import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ShareView from './components/ShareView.tsx'
import { CapacitorInit } from './components/CapacitorInit.tsx'

// If the URL has `?share=CODE`, render the read-only share view instead of
// the full app. Single-device mode today; multi-device realtime sync would
// require a backend relay (the data model is shaped for that).
const shareCode = new URLSearchParams(window.location.search).get('share')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CapacitorInit />
    {shareCode ? <ShareView code={shareCode} /> : <App />}
  </StrictMode>,
)
