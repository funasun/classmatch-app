import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages のサブパス配信でも動くよう相対パスでビルドする
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
