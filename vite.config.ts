import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync } from 'fs'

// Check if tools-registry exists (for local development)
const toolsRegistryPath = path.resolve(__dirname, '../tools-registry/src')
const hasToolsRegistry = existsSync(toolsRegistryPath)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Only add @tools alias if tools-registry exists (local dev)
      ...(hasToolsRegistry && {
        '@tools': toolsRegistryPath,
      }),
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
    rollupOptions: {
      external: (id) => {
        // Mark @tools imports as external (optional dependency)
        // This prevents build errors when tools-registry is not available
        return id === '@tools/index' || id.startsWith('@tools/');
      },
    },
  },
})


