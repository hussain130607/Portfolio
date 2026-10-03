import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Builds straight into the site root: ../index.html and ../assets/app/.
// The images in ../assets and the demos in ../demos are referenced by relative path, not bundled.
export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), tailwindcss()],
  build: { outDir: '..', assetsDir: 'assets/app', emptyOutDir: false },
})
