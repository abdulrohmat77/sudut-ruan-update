import React, { useEffect, useRef, useState } from 'react'
import { AIConfigService, supabase } from '../services/supabaseClient'
import { authService } from '../services/auth'
import PinLock from '../components/PinLock'
import { T, Icon, Panel, Btn, Dot } from '../components/AcosUI'

type ConnState = 'idle' | 'ok' | 'fail'

interface SettingsProps {
  onLogoChange?: (logo: string) => void
  theme?: string
  density?: string
}

const Settings: React.FC<SettingsProps> = ({ onLogoChange, theme: propTheme, density: propDensity }) => {
  const [activeTab, setActiveTab] = useState('Umum')
  const tabs = ['Umum', 'Profil & Branding', 'Akun & Keamanan', 'Integrasi']

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ACOS Umum Settings state
  const theme = propTheme || localStorage.getItem('acos_theme') || 'Gelap'
  const density = propDensity || localStorage.getItem('acos_density') || 'Nyaman'

  const [lang, setLang] = useState(localStorage.getItem('acos_lang') || 'Hybrid')
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem('acos_refresh') !== 'false')
  const [notifSound, setNotifSound] = useState(localStorage.getItem('acos_sound') !== 'false')

  // Kiro Settings state
  const [checking, setChecking] = useState(false)
  const [connSupabase, setConnSupabase] = useState<ConnState>('idle')

  const [companyName, setCompanyName] = useState('Sudut Ruang')
  const [companyEmail, setCompanyEmail] = useState('hello@sudutruang.id')
  const [companyPhone, setCompanyPhone] = useState('+62 812-3456-7890')
  const [logo, setLogo] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookPdfUrl, setWebhookPdfUrl] = useState('')
  const [webhookContentUrl, setWebhookContentUrl] = useState('')

  const [locked, setLocked] = useState(true)

  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const sessionEmail = authService.getSession()?.email || authService.defaultEmail
  const canManagePassword = authService.canManagePassword()

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    localStorage.setItem('acos_lang', lang)
    localStorage.setItem('acos_refresh', autoRefresh.toString())
    localStorage.setItem('acos_sound', notifSound.toString())
  }, [lang, autoRefresh, notifSound])

  const checkConnections = async () => {
    setChecking(true)
    setConnSupabase('idle')
    const ok = await (async () => {
      const { error } = await supabase.from('ai_config').select('key').limit(1)
      return !error
    })()
    setConnSupabase(ok ? 'ok' : 'fail')
    setChecking(false)
  }

  const loadConfig = async () => {
    const cfg = await AIConfigService.getAll()
    if (cfg.company_name) setCompanyName(cfg.company_name)
    if (cfg.company_email) setCompanyEmail(cfg.company_email)
    if (cfg.company_phone) setCompanyPhone(cfg.company_phone)
    if (cfg.company_logo) setLogo(cfg.company_logo)
    if (cfg.webhook_url) setWebhookUrl(cfg.webhook_url)
    if (cfg.webhook_pdf_url) setWebhookPdfUrl(cfg.webhook_pdf_url)
    if (cfg.webhook_content_url) setWebhookContentUrl(cfg.webhook_content_url)
    checkConnections()
  }

  const saveProfile = async () => {
    setSaving(true)
    await Promise.all([
      AIConfigService.set('company_name', companyName),
      AIConfigService.set('company_email', companyEmail),
      AIConfigService.set('company_phone', companyPhone),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveIntegrasi = async () => {
    setSaving(true)
    await Promise.all([
      AIConfigService.set('webhook_url', webhookUrl),
      AIConfigService.set('webhook_pdf_url', webhookPdfUrl),
      AIConfigService.set('webhook_content_url', webhookContentUrl)
    ])
    // Simpan override content webhook ke localStorage agar langsung dipakai n8nService
    try {
      if (webhookContentUrl) localStorage.setItem('n8n_content_url', webhookContentUrl.replace(/\/+$/, ''))
      else localStorage.removeItem('n8n_content_url')
    } catch { /* ignore */ }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const onLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('File harus berupa gambar.')
    if (file.size > 400 * 1024) return alert('Ukuran logo maksimal 400KB. Kompres dulu ya.')

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      setLogo(dataUrl)
      await AIConfigService.set('company_logo', dataUrl)
      onLogoChange?.(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const submitChangePwd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingPwd) return
    setPwdMsg(null)
    if (newPwd !== confirmPwd) return setPwdMsg({ type: 'err', text: 'Konfirmasi password tidak cocok.' })
    setSavingPwd(true)
    const res = await authService.changePassword(curPwd, newPwd)
    setSavingPwd(false)
    if (res.ok) {
      setPwdMsg({ type: 'ok', text: 'Password berhasil diubah.' })
      setCurPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } else {
      setPwdMsg({ type: 'err', text: res.error || 'Gagal mengubah password.' })
    }
  }

  const SegmentedControl = ({ options, value, onChange }: { options: string[], value: string, onChange: (v: string) => void }) => (
    <div style={{ display: "flex", background: T.inset, borderRadius: 8, padding: 4, gap: 4, border: `1px solid ${T.line}` }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{ flex: 1, padding: "6px 12px", border: "none", borderRadius: 6, background: value === o ? T.sky : "transparent", color: value === o ? "#03203a" : T.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}>
          {o}
        </button>
      ))}
    </div>
  )

  const Toggle = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
    <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? T.sky : T.line, position: "relative", cursor: "pointer", transition: "all .2s" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: value ? 18 : 2, transition: "all .2s" }} />
    </div>
  )

  const inputStyle = { width: "100%", padding: "10px 14px", background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 12, outline: "none", fontFamily: T.font }

  return (
    <div style={{ padding: 22, height: "100%", background: T.bgGrad, overflowY: "auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: T.txt, margin: "0 0 4px", letterSpacing: -0.6 }}>Pengaturan</h1>
      <p style={{ fontSize: 13, color: T.dim, margin: "0 0 24px" }}>Kelola akun, profil perusahaan, dan preferensi sistem.</p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${T.line}`, paddingBottom: 12, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "8px 16px", borderRadius: 8, background: activeTab === t ? "rgba(74,179,216,0.15)" : "transparent", border: `1px solid ${activeTab === t ? T.sky : "transparent"}`, color: activeTab === t ? T.sky : T.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'Umum' && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>
          {/* Tampilan */}
          <Panel pad={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Icon name="Palette" size={18} color={T.sky} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.txt }}>Tampilan</div>
                <div style={{ fontSize: 11, color: T.dim }}>Tema & kepadatan antarmuka</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Mode tema</div>
                <div style={{ fontSize: 10, color: T.dim }}>Gelap (mission-control) atau terang</div>
              </div>
              <div style={{ width: 140 }}>
                <SegmentedControl
                  options={['Gelap', 'Terang']}
                  value={theme}
                  onChange={(v) => {
                    localStorage.setItem('acos_theme', v);
                    window.dispatchEvent(new Event('themeChanged'));
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Kepadatan</div>
                <div style={{ fontSize: 10, color: T.dim }}>Jarak antar elemen</div>
              </div>
              <div style={{ width: 140 }}><SegmentedControl options={['Nyaman', 'Padat']} value={density} onChange={(v) => {
                localStorage.setItem('acos_density', v);
                window.dispatchEvent(new Event('themeChanged'));
              }} /></div>
            </div>
          </Panel>

          {/* Bahasa & Wilayah */}
          <Panel pad={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Icon name="Globe" size={18} color={T.sky} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.txt }}>Bahasa & Wilayah</div>
                <div style={{ fontSize: 11, color: T.dim }}>Bahasa antarmuka & format</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Bahasa antarmuka</div>
                <div style={{ fontSize: 10, color: T.dim, maxWidth: 200 }}>Gabungan antara Indonesia dan Inggris (EN terms) atau Full ID</div>
              </div>
              <div style={{ width: 180 }}><SegmentedControl options={['Full ID', 'Hybrid']} value={lang} onChange={setLang} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: `1px solid ${T.line}`, paddingBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Mata uang</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.dim }}>IDR â€¢ Rp</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: `1px solid ${T.line}`, paddingBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Zona waktu</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.dim }}>WIB (GMT+7)</div>
            </div>
          </Panel>

          {/* Preferensi Dashboard */}
          <Panel pad={20} style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Icon name="LayoutDashboard" size={18} color={T.sky} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.txt }}>Preferensi Dashboard</div>
                <div style={{ fontSize: 11, color: T.dim }}>Perilaku umum command center</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Auto-refresh data realtime</div>
                <div style={{ fontSize: 10, color: T.dim }}>Tarik update dari Supabase setiap 30 detik</div>
              </div>
              <Toggle value={autoRefresh} onChange={setAutoRefresh} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Suara notifikasi</div>
                <div style={{ fontSize: 10, color: T.dim }}>Bunyi saat lead/pembayaran masuk</div>
              </div>
              <Toggle value={notifSound} onChange={setNotifSound} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Halaman default saat login</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.txt }}>Command Center</div>
            </div>
          </Panel>
        </div>
      )}

      {activeTab === 'Profil & Branding' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
          <PinLock locked={locked} onChange={setLocked} lockedTitle="Profil Terkunci" lockedDesc="Informasi branding dikunci untuk mencegah perubahan tidak sengaja." />
          <Panel pad={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: T.inset, border: `1px solid ${T.line}`, display: "grid", placeItems: "center", overflow: "hidden" }}>
                {logo ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="Image" size={24} color={T.dim} />}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoSelect} style={{ display: "none" }} disabled={locked} />
                <Btn v="ghost" size="sm" icon="Upload" onClick={() => logoInputRef.current?.click()} disabled={locked}>Unggah</Btn>
                {logo && <Btn v="ghost" size="sm" icon="Trash2" onClick={() => { setLogo(''); AIConfigService.set('company_logo', ''); onLogoChange?.('') }} disabled={locked} style={{ color: T.red }}>Hapus</Btn>}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", marginBottom: 6 }}>Nama Perusahaan</div>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} disabled={locked} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", marginBottom: 6 }}>Email</div>
              <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} style={inputStyle} disabled={locked} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", marginBottom: 6 }}>Telepon</div>
              <input type="text" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} style={inputStyle} disabled={locked} />
            </div>
            <Btn v="primary" onClick={saveProfile} disabled={locked || saving} style={{ width: "100%", justifyContent: "center" }} icon={saved ? "CheckCircle" : "Save"}>
              {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Perubahan'}
            </Btn>
          </Panel>
        </div>
      )}

      {activeTab === 'Akun & Keamanan' && (
        <div style={{ maxWidth: 500 }}>
          <Panel pad={20}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", marginBottom: 6 }}>Email Login</div>
              <div style={{ padding: "10px 14px", background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12, color: T.txt, fontFamily: T.mono }}>{sessionEmail}</div>
            </div>
            <form onSubmit={submitChangePwd}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", marginBottom: 6 }}>Ubah Password</div>
              <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="Password saat ini" disabled={!canManagePassword} style={{ ...inputStyle, marginBottom: 12 }} />
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Password baru" disabled={!canManagePassword} style={{ ...inputStyle, marginBottom: 12 }} />
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Konfirmasi password" disabled={!canManagePassword} style={{ ...inputStyle, marginBottom: 16 }} />
              {pwdMsg && <div style={{ fontSize: 11, fontWeight: 700, color: pwdMsg.type === 'ok' ? T.green : T.red, marginBottom: 12 }}>{pwdMsg.text}</div>}
              <Btn v="primary" onClick={submitChangePwd as any} disabled={!canManagePassword || savingPwd || !curPwd || !newPwd} icon="Key">Ubah Password</Btn>
            </form>
          </Panel>
        </div>
      )}

      {activeTab === 'Integrasi' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <PinLock locked={locked} onChange={setLocked} lockedTitle="Integrasi Terkunci" lockedDesc="Pengaturan integrasi dikunci untuk mencegah perubahan URL secara tidak sengaja." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>
            <Panel pad={20}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.txt }}>Integrasi</div>
                <Btn v="ghost" size="sm" icon="RefreshCcw" onClick={checkConnections} disabled={checking}>PERIKSA ULANG</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { name: 'WhatsApp Business', sub: 'via n8n', icon: 'MessageSquare' },
                  { name: 'Instagram', sub: 'via n8n', icon: 'Instagram' },
                  { name: 'n8n Workflow', sub: 'Webhook engine', icon: 'Workflow' },
                  { name: 'Supabase', sub: 'Database', icon: 'Database' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, border: `1px solid ${T.line}`, display: "grid", placeItems: "center" }}>
                        <Icon name={item.icon as any} size={18} color={T.sky} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.txt }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: T.dim }}>{item.sub}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: connSupabase === 'fail' ? T.dim : T.green }}>
                      <Dot color={connSupabase === 'fail' ? T.dim : T.green} size={6} />
                      {connSupabase === 'fail' ? 'Terputus' : 'Terhubung'}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel pad={20}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.txt }}>n8n Webhook URL</div>
                <Icon name="Lock" size={14} color={T.amber} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Webhook Base URL (Chat/CRM)</div>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://your-n8n.com/webhook"
                  disabled={locked}
                  style={{ ...inputStyle, fontFamily: T.mono, fontSize: 11, color: T.txt, marginBottom: 16 }}
                />
                <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Webhook Generator PDF</div>
                <input
                  type="text"
                  value={webhookPdfUrl}
                  onChange={e => setWebhookPdfUrl(e.target.value)}
                  placeholder="https://your-n8n.com/webhook/pdf-generator"
                  disabled={locked}
                  style={{ ...inputStyle, fontFamily: T.mono, fontSize: 11, color: T.txt, marginBottom: 8 }}
                />
                <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Webhook AI Content Engine</div>
                <input
                  type="text"
                  value={webhookContentUrl}
                  onChange={e => setWebhookContentUrl(e.target.value)}
                  placeholder="https://your-n8n.com/webhook/generate-content"
                  disabled={locked}
                  style={{ ...inputStyle, fontFamily: T.mono, fontSize: 11, color: T.txt, marginBottom: 16 }}
                />
                <Btn v="primary" size="sm" onClick={saveIntegrasi} disabled={locked || saving} icon={saved ? "CheckCircle" : "Save"}>
                  {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan URL'}
                </Btn>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>AI Model</div>
                <input
                  type="text"
                  defaultValue="Google Gemini (gemini-2.5-flash)"
                  style={{ ...inputStyle, fontFamily: T.mono, fontSize: 11, color: T.dim }}
                  readOnly
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, background: "rgba(74,179,216,0.1)", border: `1px solid ${T.sky}33`, borderRadius: 8, marginBottom: 24 }}>
                <Icon name="Info" size={16} color={T.sky} />
                <div style={{ fontSize: 11, color: T.txt, lineHeight: 1.4 }}>URL ini dipakai untuk komunikasi 2 arah antara dashboard dan workflow n8n Syifa.</div>
              </div>

              <Btn v="ghost" style={{ width: "100%", justifyContent: "center", border: `1px solid ${T.line}` }} icon="RefreshCcw" onClick={() => alert("Test connection simulated.")}>
                Test Connection
              </Btn>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
