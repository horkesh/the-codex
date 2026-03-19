import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@vis.gl/react-google-maps')) return 'vendor-maps'
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('@xyflow')) return 'vendor-flow'
            if (id.includes('exifr') || id.includes('html2canvas')) return 'vendor-media'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
          }
        },
      },
    },
  },
})
