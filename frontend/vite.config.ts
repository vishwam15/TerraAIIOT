import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1606,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:1607',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:1607',
        ws: true,
      }
    }
  }
})
