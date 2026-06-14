import { useState } from 'react'
import { T } from './AcosUI'

/**
 * Launcher dashboard ke-2: "Project Command Center" (app terpisah, satu domain).
 * - Tombol nempel di tepi kanan layar.
 * - Klik → buka Command Center di TAB YANG SAMA (pindah halaman penuh).
 * - Default ke path /commandcenter (di-proxy Netlify ke deploy Command Center),
 *   jadi terasa satu dashboard satu domain. Bisa di-override (mis. tes lokal).
 */

const URL_KEY = 'pmis_command_center_url'
// Path default: file statis Command Center ada di public/commandcenter/ (satu deploy).
const DEFAULT_URL = '/commandcenter/'

export default function CommandCenterLauncher() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [url, setUrl] = useState<string>(() => localStorage.getItem(URL_KEY) || DEFAULT_URL)
  const [draftUrl, setDraftUrl] = useState<string>(url)

  const saveUrl = () => {
    const clean = draftUrl.trim().replace(/\/+$/, '') || DEFAULT_URL
    setUrl(clean)
    setDraftUrl(clean)
    localStorage.setItem(URL_KEY, clean)
  }

  const openCommandCenter = () => {
    // Buka di tab yang sama (pindah halaman penuh).
    window.location.href = url
  }

  return (
    <>
      {/* Tombol tepi kanan */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Buka Project Command Center"
        title="Project Command Center"
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '12px 8px',
          writingMode: 'vertical-rl',
          background: T.bright,
          color: '#fff',
          border: 'none',
          borderRadius: '10px 0 0 10px',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 0.5,
          boxShadow: '-4px 0 16px rgba(0,0,0,0.3)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(90deg)' }}>
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        Command Center
      </button>

      {/* Drawer kanan */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 'min(380px, 90vw)',
              background: T.panel,
              borderLeft: `1px solid ${T.line}`,
              boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: T.txt, fontSize: 16, fontWeight: 800 }}>Dashboard Lain</h3>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: T.sub, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: T.txt, fontSize: 14 }}>Project Command Center</div>
              <div style={{ fontSize: 12, color: T.dim, marginTop: 4, lineHeight: 1.5 }}>
                Dashboard manajemen proyek (PMIS). Dibuka di tab yang sama, data di Supabase yang sama.
              </div>

              <button
                onClick={openCommandCenter}
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: '10px 14px',
                  background: T.sky,
                  color: '#03203a',
                  border: 'none',
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Buka Command Center
              </button>
            </div>

            {/* Pengaturan URL (opsional, buat tes lokal) */}
            <div>
              <label style={{ fontSize: 11, color: T.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                URL Command Center
              </label>
              <input
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder={DEFAULT_URL}
                style={{
                  marginTop: 6,
                  width: '100%',
                  padding: '9px 12px',
                  background: T.inset,
                  border: `1px solid ${T.line}`,
                  borderRadius: 9,
                  color: T.txt,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={saveUrl}
                style={{
                  marginTop: 8,
                  padding: '7px 14px',
                  background: 'transparent',
                  color: T.sky,
                  border: `1px solid ${T.line}`,
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Simpan URL
              </button>
              <div style={{ fontSize: 10.5, color: T.dim, marginTop: 8, lineHeight: 1.5 }}>
                Default <code>{DEFAULT_URL}</code> (satu domain via proxy Netlify). Untuk tes lokal isi <code>http://localhost:5174</code>.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
