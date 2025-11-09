import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tools': path.resolve(__dirname, '../tools-registry/src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow access from external devices
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

