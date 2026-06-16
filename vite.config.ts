import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

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
        // Jangan precache file Command Center (app statis terpisah di /commandcenter).
        globIgnores: ['**/commandcenter/**'],
        // Jangan kembalikan app shell (index.html) untuk request file template
        // & PDF di /template_dokument/ atau /uploads/ — biar iframe load HTML asli,
        // bukan dashboard. Tanpa ini, Invoice Builder malah nampilin dashboard nested.
        navigateFallbackDenylist: [/^\/template_dokument\//, /^\/uploads\//, /^\/commandcenter/, /\.html$/]
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
    }),
    // ── Plugin: serve /commandcenter/* dari public/commandcenter/ ──────────────
    // Vite SPA mode normalnya fallback semua navigation ke index.html (dashboard).
    // Plugin ini intercept request ke /commandcenter/* SEBELUM SPA fallback
    // dan serve file statis Command Center yang benar.
    {
      name: 'serve-commandcenter',
      apply: 'serve',
      enforce: 'pre',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '/'
          if (!url.startsWith('/commandcenter')) return next()

          // Strip query string
          const urlPath = url.split('?')[0]
          const publicDir = path.resolve(__dirname, 'public')

          // Coba serve file persis (untuk .js, .css, .png, dll)
          let filePath = path.join(publicDir, urlPath)

          // Kalau path adalah folder atau tidak ada ext → serve index.html-nya
          if (!path.extname(filePath) || urlPath === '/commandcenter/' || urlPath === '/commandcenter') {
            filePath = path.join(publicDir, 'commandcenter', 'index.html')
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const mime: Record<string, string> = {
              '.html': 'text/html; charset=utf-8',
              '.js': 'application/javascript',
              '.css': 'text/css',
              '.png': 'image/png',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.json': 'application/json',
              '.txt': 'text/plain',
            }
            res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            fs.createReadStream(filePath).pipe(res as any)
            return
          }
          next()
        })
      }
    }
  ],
  server: {
    port: 3000,
    host: true,
    fs: {
      strict: false,
    },
  },
  appType: 'spa',
})
