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
            if (id.includes('lottie-web')) return 'lottie';
            if (id.includes('react-big-calendar') || id.includes('moment')) return 'calendar';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@huggingface') || id.includes('@xenova')) return 'transformers';
            return 'vendor';
          }
        }
      }
    }
  }
})

