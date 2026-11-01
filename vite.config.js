import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The local model server (LM Studio) is reached through this proxy so the browser makes same-origin calls.
const lmStudio = {
  '/lmstudio': { target: 'http://localhost:1234', changeOrigin: true, rewrite: (path) => path.replace(/^\/lmstudio/, '') },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: lmStudio },
  preview: { proxy: lmStudio },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20000,
    setupFiles: './src/test/setup.js',
  },
})
