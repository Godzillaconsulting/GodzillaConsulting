import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/outputs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@ffmpeg')) return 'ffmpeg';
            if (id.includes('lottie-web') || id.includes('lottie-react')) return 'lottie';
            if (id.includes('react-big-calendar') || id.includes('moment')) return 'calendar';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@huggingface') || id.includes('@xenova')) return 'transformers';
            // ── Nuevos splits para romper vendor monolith de 1.35MB ──
            if (id.includes('framer-motion')) return 'framer';
            if (id.includes('gsap')) return 'gsap';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('react-google-charts')) return 'google-charts';
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
            if (id.includes('react-dom')) return 'react-dom';
            if (id.includes('socket.io')) return 'socketio';
            if (id.includes('dompurify') || id.includes('marked')) return 'markdown';
            return 'vendor';
          }
        }
      }
    }
  }
})

