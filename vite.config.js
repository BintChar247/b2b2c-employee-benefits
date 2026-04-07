import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: '/b2b2c-employee-benefits/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:  __dirname + 'src/index.html',
        admin: __dirname + 'src/admin.html',
      }
    }
  },
  server: {
    port: 5173,
    base: '/',
  },
})
