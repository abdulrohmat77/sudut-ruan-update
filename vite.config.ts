import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker dimatikan saat development untuk mencegah cache basi
      // yang menyebabkan layar blank putih setelah restart dev server.
      // PWA tetap aktif penuh pada build produksi (npm run build).
      devOptions: {
        enabled: false
      },
      // Naikkan limit ukuran file yang di-precache workbox (default 2 MiB).
      // Bundle utama bisa >2 MB sehingga build Netlify gagal tanpa ini.
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MiB
        // Jangan kembalikan app shell (index.html) untuk request file template
        // & PDF di /template_dokument/ atau /uploads/ — biar iframe load HTML asli,
        // bukan dashboard. Tanpa ini, Invoice Builder malah nampilin dashboard nested.
        navigateFallbackDenylist: [/^\/template_dokument\//, /^\/uploads\//, /\.html$/]
      },
      manifest: {
        name: 'Kiro by Sudut Ruang',
        short_name: 'Kiro',
        description: 'Sudut Ruang AI Ecosystem Dashboard',
        theme_color: '#04203a',
        background_color: '#04203a',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true
  }
})
