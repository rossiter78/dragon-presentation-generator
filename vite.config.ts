import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exportPdf } from './vite-plugin-export-pdf.ts'

export default defineConfig({
  // exportPdf serves the endpoint behind the deck's export button. It is
  // `apply: 'serve'`, so it exists while you are authoring or presenting
  // locally and never ships in dist/.
  plugins: [react(), exportPdf()],
  // Relative base so the built `dist/` runs from a file:// path or any
  // subdirectory — you present from a local copy, not a web root.
  base: './',
  build: { assetsInlineLimit: 0 },
})
