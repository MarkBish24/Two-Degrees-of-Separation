import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves this repo at /DSC106-Project4/, so built files need that prefix.
  // The dev server keeps using "/" so localhost:5173 still works as before.
  base: command === 'build' ? '/DSC106-Project4/' : '/',
}))
