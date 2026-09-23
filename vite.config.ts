import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Read package.json once at config-load time so the value is inlined
// at build time (no runtime fetch, no extra http request). The dev
// server picks this up on restart, which is fine — bumping the
// version always means rebuilding.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
)
const APP_VERSION = JSON.stringify(pkg.version)

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  base: '/',
  build: {
    // Production source maps expose the full client source tree to anyone
    // who can fetch the asset. Keep them disabled for the public build.
    sourcemap: false,
  },
  server: { port: 5173, host: true },
  define: {
    // Inlined into the bundle as a string literal. Use `import.meta.env.VITE_APP_VERSION`
    // in source code (typed by vite/client) to read it. Reading package.json directly
    // from src/ would require a Vite JSON import + tsconfig allowJsonImports; this
    // is simpler and works in every environment.
    'import.meta.env.VITE_APP_VERSION': APP_VERSION,
  },
})