import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  define: {
    __DEV__: mode === 'development'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: resolve(__dirname, 'options.html'),
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/content.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep background and content scripts at root level
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js'
          }
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'options.css' || assetInfo.name === 'popup.css') {
            return 'assets/[name][extname]'
          }
          return 'assets/[name][extname]'
        }
      }
    }
  }
}))
