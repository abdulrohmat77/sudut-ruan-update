import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AIConfigService } from './services/supabaseClient'
import { n8nService } from './services/n8nWebhookService'

// Saat development: bersihkan service worker + cache PWA yang mungkin tersisa
// dari sesi sebelumnya. SW dev yang basi adalah penyebab umum layar blank putih
// setelah restart dev server. Di produksi blok ini tidak berjalan.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister())
  })
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
  }
}

// Boot-load webhook_url dari Supabase ai_config supaya semua page pakai URL terkini.
// Tidak perlu await — fire-and-forget. Default URL akan dipakai sampai config tiba.
;(async () => {
  try {
    const url = await AIConfigService.get('webhook_url')
    if (url) n8nService.setBaseUrl(url)
  } catch (err) {
    // Silent fail — Supabase mungkin belum di-setup, default URL tetap dipakai
    console.warn('[boot] failed to load webhook_url from ai_config:', err)
  }
})()

// Set favicon dari logo Sudut Ruang (company_logo) yang tersimpan di Supabase.
;(async () => {
  try {
    const logo = await AIConfigService.get('company_logo')
    if (logo) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      // hapus type svg agar browser pakai data URL gambar (jpeg/png)
      link.removeAttribute('type')
      link.href = logo

      const apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")
      if (apple) apple.href = logo
    }
  } catch (err) {
    console.warn('[boot] failed to load company_logo for favicon:', err)
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
