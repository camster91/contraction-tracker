import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ShareView from './components/ShareView.tsx'
import { CapacitorInit } from './components/CapacitorInit.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// If the URL has `?share=CODE`, render the read-only share view instead of
// the full app. Single-device mode today; multi-device realtime sync would
// require a backend relay (the data model is shaped for that).
const shareCode = new URLSearchParams(window.location.search).get('share')

// Preload the most critical fonts so the browser fetches them in parallel
// with the JS bundle instead of discovering them only after CSS parses.
// The CSS @import in index.css still owns the @font-face declarations and
// font-display strategy; this just primes the cache earlier.
// (Closes audit #30: fonts are loaded via CSS @import, not <link rel="preload">.)
const CRITICAL_FONTS: string[] = [
  // Inter 400 — the body text font. Used everywhere.
  new URL('@fontsource/inter/files/inter-latin-400-normal.woff2', import.meta.url).href,
  // Fraunces 400 — the display font for headings + timer numerals.
  new URL('@fontsource/fraunces/files/fraunces-latin-400-normal.woff2', import.meta.url).href,
  // Inter 600 — used for buttons, labels, and the active timer.
  new URL('@fontsource/inter/files/inter-latin-600-normal.woff2', import.meta.url).href,
]
for (const href of CRITICAL_FONTS) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CapacitorInit />
      {shareCode ? <ShareView code={shareCode} /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
