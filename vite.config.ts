import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages のサブパス配信でも動くよう相対パスでビルドする
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // API はポーリングで常に最新を取るのでキャッシュしない（アプリ本体のみ）
        navigateFallbackDenylist: [/state\.php/, /wbgt\.php/],
      },
      manifest: {
        name: '夏季クラスマッチ2026 ディスプレイ',
        short_name: 'クラスマッチ',
        display: 'fullscreen',
        background_color: '#1e3a8a',
        theme_color: '#1e3a8a',
        lang: 'ja',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
