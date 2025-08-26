import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE:
// If deploying to GitHub Pages under a repo like https://username.github.io/repo/
// set base: '/repo/' below or set VITE_BASE env and use base: process.env.VITE_BASE
export default defineConfig({
  plugins: [react()],
  // base: '/your-repo-name/',
})
