import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Drive the deploy base path from an environment variable so the same build
  // can target the GitHub Pages sub-path, a custom domain root, or any other
  // location without source edits.  Defaults to the current repo path.
  base: process.env.VITE_BASE_PATH ?? '/PWCS_Lunch/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
