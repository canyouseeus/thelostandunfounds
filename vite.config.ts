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
    open: true,
    proxy: {
      '/api/tiktok': {
        target: 'https://tiktok-downloader-production-ab40.up.railway.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => '/api' + path.replace(/^\/api\/tiktok/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.error('Proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})


