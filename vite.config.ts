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
