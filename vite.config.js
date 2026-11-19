import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths, so the built site works at any address
  // (e.g. GitHub Pages at /<repo-name>/, even if the repo is renamed).
  base: './',
})
