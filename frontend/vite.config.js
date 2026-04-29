import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../public/app', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost' } },
})
