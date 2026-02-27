import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({ include: ['buffer'] }),
    react(),
    tailwindcss(),
    sentryVitePlugin({
      org: "mabel-code",
      project: "borafut"
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'sentry-vendor': ['@sentry/react'],
          'query-vendor': ['@tanstack/react-query'],
          'lucide-vendor': ['lucide-react']
        }
      }
    }
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})