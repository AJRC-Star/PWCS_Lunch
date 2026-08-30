import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Drive the deploy base path from an environment variable so the same build
  // can target the GitHub Pages sub-path, a custom domain root, or any other
  // location without source edits.  Defaults to the current repo path.
  base: process.env.VITE_BASE_PATH ?? '/PWCS_Lunch/',
  build: {
    // Keep the no-school hero artwork as external files instead of letting Vite
    // base64 them into the entry chunk.
    //
    // Under the default 4KB inline limit both illustrations became data URIs,
    // adding ~5.3KB to a bundle that every visitor downloads on every load.  The
    // states they belong to — summer break and a fully cancelled week — are the
    // rare case; on an ordinary school day the artwork never renders.  As
    // external files the browser fetches them only when an <img> actually mounts,
    // so the common path pays nothing and the break path pays one small request.
    assetsInlineLimit: (filePath) => (/[\\/]assets[\\/]hero[\\/]/.test(filePath) ? false : undefined),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
