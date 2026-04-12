import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/PWCS_Lunch/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
