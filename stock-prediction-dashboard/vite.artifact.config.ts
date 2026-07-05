import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// One-off config for publishing the app as a single self-contained HTML
// artifact: no code splitting, dynamic imports inlined.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-artifact',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
