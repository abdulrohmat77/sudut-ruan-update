import React, { useEffect, useState } from 'react'
import { AIConfigService } from '../services/supabaseClient'

interface Props {
  locked: boolean
  onChange: (locked: boolean) => void
  lockedTitle?: string
  lockedDesc?: string
}

/**
 * Reusable lock banner + PIN modal for guarding sensitive settings against
 * accidental edits. The PIN is shared across the app (ai_config.settings_pin).
 */
const PinLock: React.FC<Props> = ({
  locked,
  onChange,
  lockedTitle = 'Pengaturan sensitif terkunci',
  lockedDesc = 'Dikunci untuk mencegah perubahan yang tidak disengaja.',
}) => {
  const [pin, setPin] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [modal, setModal] = useState<null | 'unlock' | 'set'>(null)
  const [input, setInput] = useState('')
  const [pinOld, setPinOld] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const hasPin = !!pin

  useEffect(() => {
    let alive = true
    // Fallback: kalau Supabase lambat/gagal, paksa `loaded` true setelah 3 dtk
    // biar tombol "Buka Kunci" tidak disabled selamanya.
    const timer = setTimeout(() => { if (alive) setLoaded(true) }, 3000)
    AIConfigService.get('settings_pin')
      .then((v) => {
        if (alive) {
          setPin(v || '')
          setLoaded(true)
        }
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [])

  const requestUnlock = () => {
    setError('')
    setInput('')
    if (hasPin) setModal('unlock')
    else onChange(false)
  }

  const submitUnlock = () => {
    if (input !== pin) {
      setError('PIN salah.')
      return
    }
    onChange(false)
    setModal(null)
    setInput('')
  }

  const openSetPin = () => {
    setError('')
    setPinOld('')
    setPinNew('')
    setPinConfirm('')
    setModal('set')
  }

  const savePin = async () => {
    if (hasPin && pinOld !== pin) {
      setError('PIN saat ini salah.')
      return
    }
    if (!/^\d{4,6}$/.test(pinNew)) {
      setError('PIN harus 4–6 digit angka.')
      return
    }
    if (pinNew !== pinConfirm) {
      setError('Konfirmasi PIN tidak cocok.')
      return
    }
    setSaving(true)
    await AIConfigService.set('settings_pin', pinNew)
    setPin(pinNew)
    setSaving(false)
    setModal(null)
  }

  const removePin = async () => {
    if (hasPin && pinOld !== pin) {
      setError('PIN saat ini salah.')
      return
    }
    setSaving(true)
    await AIConfigService.set('settings_pin', '')
    setPin('')
    setSaving(false)
    setModal(null)
  }

  const inputCls =
    'w-full px-md py-3 bg-white text-black border border-outline-variant rounded-lg focus:ring-2 focus:ring-brand-accent outline-none tracking-[0.5em] text-center text-lg font-bold'

  return (
    <>
      <div
        className={`rounded-2xl p-md border flex flex-col sm:flex-row sm:items-center gap-sm ${
          locked ? 'bg-amber-soft border-amber/30' : 'bg-brand-soft border-brand-accent/30'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[24px] ${locked ? 'text-amber' : 'text-brand-mid'}`}
        >
          {locked ? 'lock' : 'lock_open'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-on-surface">{locked ? lockedTitle : 'Mode edit aktif'}</p>
          <p className="text-[12.5px] text-on-surface-variant">
            {locked
              ? lockedDesc
              : loaded && !hasPin
              ? 'Belum ada PIN. Atur PIN agar pengaturan terlindungi.'
              : 'Jangan lupa kunci lagi setelah selesai.'}
          </p>
        </div>
        <div className="flex items-center gap-sm flex-shrink-0">
          {locked ? (
            <button
              onClick={requestUnlock}
              disabled={!loaded}
              className="py-2 px-md bg-brand text-white rounded-lg font-bold text-[13px] hover:opacity-90 disabled:opacity-50 flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">lock_open</span>
              Buka Kunci
            </button>
          ) : (
            <>
              <button
                onClick={openSetPin}
                className="py-2 px-md border border-outline-variant rounded-lg font-bold text-[13px] hover:bg-surface-container"
              >
                {hasPin ? 'Ubah PIN' : 'Atur PIN'}
              </button>
              <button
                onClick={() => onChange(true)}
                className="py-2 px-md bg-brand text-white rounded-lg font-bold text-[13px] hover:opacity-90 flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Kunci
              </button>
            </>
          )}
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[60] bg-brand-dark/50 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-surface rounded-2xl shadow-soft-md w-full max-w-sm p-md animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-headline-sm font-semibold">
                {modal === 'unlock' ? 'Masukkan PIN' : hasPin ? 'Ubah PIN' : 'Atur PIN'}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
                aria-label="Tutup"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {modal === 'unlock' ? (
              <div className="space-y-sm">
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && submitUnlock()}
                  placeholder="PIN"
                  className={inputCls}
                />
                {error && <p className="text-[12.5px] text-error font-medium">{error}</p>}
                <button
                  onClick={submitUnlock}
                  className="w-full py-2.5 bg-brand text-white rounded-lg font-bold hover:opacity-90"
                >
                  Buka
                </button>
              </div>
            ) : (
              <div className="space-y-sm">
                {hasPin && (
                  <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={pinOld}
                    onChange={(e) => setPinOld(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="PIN saat ini"
                    className={inputCls}
                  />
                )}
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus={!hasPin}
                  value={pinNew}
                  onChange={(e) => setPinNew(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="PIN baru (4–6 digit)"
                  className={inputCls}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Konfirmasi PIN"
                  className={inputCls}
                />
                {error && <p className="text-[12.5px] text-error font-medium">{error}</p>}
                <div className="flex gap-sm">
                  {hasPin && (
                    <button
                      onClick={removePin}
                      disabled={saving}
                      className="py-2.5 px-md border border-error/40 text-error rounded-lg font-bold hover:bg-error-container disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  )}
                  <button
                    onClick={savePin}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-brand text-white rounded-lg font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan PIN'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default PinLock
