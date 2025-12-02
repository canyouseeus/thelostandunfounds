import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync } from 'fs'

// Check if tools-registry exists (for local development)
// Try multiple possible paths
const possiblePaths = [
  path.resolve(__dirname, '../tools-registry/src'),
  path.resolve(process.cwd(), '../tools-registry/src'),
  path.resolve(process.cwd(), 'tools-registry/src'),
]
const toolsRegistryPath = possiblePaths.find(p => existsSync(p))
const hasToolsRegistry = !!toolsRegistryPath

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Only add @tools alias if tools-registry exists (local dev)
      // In production builds, these imports are handled gracefully with try-catch
      ...(hasToolsRegistry && toolsRegistryPath && {
        '@tools': toolsRegistryPath,
      }),
    },
  },
  server: {
    port: 3000,
    open: false,
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
      // Externalize @scot33/tools-registry - it's optional and loaded dynamically
      external: ['@scot33/tools-registry'],
      output: {
        manualChunks(id) {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // React and React DOM
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Other vendor libraries
            return 'vendor';
          }
        },
        chunkSizeWarningLimit: 1000, // Increase limit to 1MB per chunk
      },
      // Handle @tools imports gracefully - they're optional dependencies
      // wrapped in try-catch blocks, so Rollup warnings are expected
      onwarn(warning, warn) {
        // Suppress warnings for @tools imports - they're handled at runtime
        if (warning.message && (warning.message.includes('@tools') || warning.message.includes('@scot33/tools-registry'))) {
          return;
        }
        warn(warning);
      },
    },
  },
})


