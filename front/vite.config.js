import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // 👈 your backend port
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',  // 👈 if you serve images
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true, // 👈 for Socket.io
      }
    }
  }
})
