import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    ...(mode === 'development' ? [inspectAttr()] : []),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          'ui': ['lucide-react', 'framer-motion', 'recharts'],
          'dashboard': ['./src/pages/OrganizerDashboardPage.jsx'],
        }
      }
    }
  }
}));
