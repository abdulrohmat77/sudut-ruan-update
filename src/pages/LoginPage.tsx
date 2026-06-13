import React, { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { AIConfigService } from '../services/supabaseClient'

interface Props {
  onSuccess: () => void
}

const features: Array<{ icon: string; text: string }> = [
  { icon: 'smart_toy', text: 'AI WhatsApp Consultant aktif 24/7' },
  { icon: 'calculate', text: 'Estimasi biaya otomatis & akurat' },
  { icon: 'groups', text: 'CRM & lead management terintegrasi' },
  { icon: 'description', text: 'Proposal generator otomatis dengan AI' },
]

const BrandMark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path
      d="M4 24L14 4L24 24"
      stroke="#3DB87A"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 18H20" stroke="#3DB87A" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const LoginPage: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('sra_remember_email') || authService.defaultEmail)
  const [password, setPassword] = useState(() => localStorage.getItem('sra_remember_pass') || '')
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('sra_remember_email'))
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState('')

  useEffect(() => {
    let alive = true
    AIConfigService.get('company_logo').then((v) => {
      if (alive && v) setLogo(v)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const result = await authService.login(email, password)
      if (result.ok) {
        // Save or clear remember me
        if (rememberMe) {
          localStorage.setItem('sra_remember_email', email)
          localStorage.setItem('sra_remember_pass', password)
        } else {
          localStorage.removeItem('sra_remember_email')
          localStorage.removeItem('sra_remember_pass')
        }
        onSuccess()
      } else {
        setError(result.error || 'Gagal masuk.')
        setLoading(false)
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-brand-dark flex items-center justify-center p-4 overflow-auto">
      {/* Decorative rings */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full border border-brand-accent/[0.07]" />
        <div className="absolute -bottom-40 -right-24 w-[440px] h-[440px] rounded-full border border-brand-accent/[0.07]" />
      </div>

      <div className="relative w-full max-w-4xl bg-white/[0.025] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[520px] animate-scale-up">
        {/* Left: brand panel (hidden on small screens) */}
        <div className="hidden md:flex flex-col justify-between flex-1 p-10 border-r border-white/[0.06] relative overflow-hidden bg-gradient-to-br from-brand-accent/10 to-brand-dark/60">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(rgba(61,184,122,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(61,184,122,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative">
            <div className="w-[52px] h-[52px] rounded-2xl bg-brand-accent/15 border border-brand-accent/25 flex items-center justify-center mb-5 overflow-hidden">
              {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <BrandMark />}
            </div>
            <h1 className="font-serif-display text-[28px] text-white leading-tight mb-2">
              Sudut Ruang
            </h1>
            <p className="text-[13px] text-white/45 leading-relaxed">
              AI-Powered Architecture, Interior
              <br />& Landscape Studio
            </p>
          </div>
          <div className="relative space-y-3.5">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-accent/12 border border-brand-accent/20 flex items-center justify-center text-brand-accent flex-shrink-0">
                  <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
                </div>
                <span className="text-[13px] text-white/55">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="w-full md:w-[380px] p-8 sm:p-10 flex flex-col justify-center bg-white/[0.03]">
          {/* Mobile brand */}
          <div className="md:hidden flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-brand-accent/15 border border-brand-accent/25 flex items-center justify-center overflow-hidden">
              {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <BrandMark size={22} />}
            </div>
            <div>
              <h1 className="font-serif-display text-[20px] text-white leading-none">Sudut Ruang</h1>
              <span className="text-[11px] text-white/40">AI Ecosystem</span>
            </div>
          </div>

          <h2 className="text-[22px] font-semibold text-white mb-1.5">Selamat datang kembali</h2>
          <p className="text-[13px] text-white/40 mb-7">Masuk ke dashboard AI Anda</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-[12px] font-medium text-white/40 mb-2 tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@sudutruang.com"
                autoComplete="username"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-brand-accent/50 transition-colors"
                style={{ color: '#ffffff', background: 'rgba(255,255,255,0.06)' }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-white/40 mb-2 tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pr-11 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-brand-accent/50 transition-colors"
                  style={{ color: '#ffffff', background: 'rgba(255,255,255,0.06)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-error/15 border border-error/30 rounded-lg px-3 py-2 text-[12.5px] text-red-200 animate-slide-up">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/[0.06] accent-[#3DB87A]"
              />
              <span className="text-[12.5px] text-white/50">Ingat Saya</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-accent text-white rounded-xl py-3.5 text-[14px] font-semibold tracking-wide hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Memproses...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Masuk ke Dashboard
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-white/25 text-center mt-6 leading-relaxed">
            Sudut Ruang AI Ecosystem v1.0 · Secure Login
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
