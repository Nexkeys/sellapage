// tools/screenshots/vite.config.mjs
//
// A separate Vite setup for the screenshot sandbox. It serves the REAL
// dashboard components, but swaps the Firebase packages for fakes, so nothing
// rendered here can read from or write to the live database.
//
// It is never part of the production build: Vercel runs the root vite.config,
// and nothing in the app imports from tools/.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')

const FAKES = {
  'firebase/firestore': path.join(HERE, 'shims', 'firestore.js'),
  'firebase/app': path.join(HERE, 'shims', 'firebase-other.js'),
  'firebase/auth': path.join(HERE, 'shims', 'firebase-other.js'),
  'firebase/messaging': path.join(HERE, 'shims', 'firebase-other.js'),
}

export default defineConfig({
  root: ROOT,
  // The app's .env is deliberately NOT loaded: the sandbox needs no keys, and
  // having none means a mistake here cannot reach a real service.
  envDir: HERE,
  plugins: [
    {
      name: 'sellapage-sandbox-fakes',
      enforce: 'pre',
      resolveId(source) {
        return FAKES[source] || null
      },
    },
    react(),
  ],
  server: { port: 5199, strictPort: true, open: false },
  optimizeDeps: { exclude: ['firebase'] },
})
