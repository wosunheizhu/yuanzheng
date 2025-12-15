import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3847,
    open: true
  },
  build: {
    outDir: 'dist'
  }
})
