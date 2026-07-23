import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/',
  build: {
    // Source maps for production debugging. ~2-3x bundle size but only
    // fetched when DevTools is open (modern browsers gate source map fetches
    // on the DevTools toggle, not on the bundle itself).
    sourcemap: true,
  },
  server: { port: 5173, host: true },
})
