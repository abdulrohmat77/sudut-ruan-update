import React, { useMemo, useState } from 'react'
import { T } from '../components/AcosUI'
import {
  ArrowLeft, FileSignature, Hash, Calendar, User, BadgeCheck, MapPin,
  Building2, Wallet, ShieldCheck, CheckCircle2, AlertTriangle, Loader2, FileDown,
  Trash2, Plus, Receipt,
} from 'lucide-react'
import { DocumentService } from '../services/supabaseClient'
import { openSpkPrintWindow, buildSpkDocumentHtml } from '../services/spkDocument'
import {
  PRINCIPAL, SPK_TAHAPAN, SPK_EXCLUSIONS, SPK_GUARDRAILS, SPK_QA_CHECKLIST,
  SPK_JENIS_OPTIONS, SPK_KATEGORI_OPTIONS, DEFAULT_TERMINS, buildTermins,
  generateSpkNumber, terbilang, formatTanggalIndo, formatIDR,
  type SpkJenis, type SpkKategori, type SpkTerminInput, type SpkPrefill, type InvoicePrefill,
} from '../services/spkData'

interface Props {
  onBack: () => void
  prefill?: SpkPrefill | null
  onCreateInvoice?: (prefill: InvoicePrefill) => void
}

// ── Small presentational helpers (inline T theme) ───────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: T.inset, border: `1px solid ${T.line}`,
  borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: T.font, outline: 'none',
}

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode; full?: boolean }> = ({
  label, icon, children, full,
}) => (
  <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
      {icon}{label}
    </label>
    {children}
  </div>
)

const Card: React.FC<{ refTag: string; title: string; children: React.ReactNode }> = ({ refTag, title, children }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.sky, background: `${T.sky}18`, border: `1px solid ${T.sky}33`, padding: '2px 7px', borderRadius: 6 }}>{refTag}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: T.txt, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
    </div>
    {children}
  </div>
)

const SpkBuilder = ({ onBack, prefill, onCreateInvoice }: Props) => {
  const today = formatTanggalIndo()
  const [saving, setSaving] = useState(false)
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [vars, setVars] = useState({
    NO_SPK: generateSpkNumber(5),
    HARI: today.hari,
    TANGGAL: today.tanggal,
    BULAN: today.bulan,
    TAHUN: today.tahun,
    NAMA_KLIEN: prefill?.clientName || '',
    ALAMAT_KLIEN: '',
    HP_KLIEN: prefill?.clientPhone || '',
    KAPASITAS_KLIEN: 'pemilik kavling',
    NAMA_PROYEK: prefill?.projectName || '',
    JENIS_PEKERJAAN: (prefill?.jenisPekerjaan || 'Perancangan Arsitektur') as SpkJenis,
    LOKASI_PROYEK: prefill?.lokasi || '',
    LUAS_LAHAN: prefill?.luas || '',
    KATEGORI: (prefill?.kategori || 'Membangun baru') as SpkKategori,
    PROGRAM_RUANG: prefill?.programRuang || '',
    TOTAL_FEE: prefill?.totalFee || 0,
    DURASI_BULAN: prefill?.durasiBulan || 3,
    INCLUDE_RAB: true,
  })

  const set = <K extends keyof typeof vars>(k: K, v: (typeof vars)[K]) =>
    setVars((prev) => ({ ...prev, [k]: v }))

  // Termin pembayaran fleksibel (bisa diedit / cicilan), default 50/40/10.
  const [terminRows, setTerminRows] = useState<SpkTerminInput[]>(() => DEFAULT_TERMINS.map((t) => ({ ...t })))

  const termins = useMemo(() => buildTermins(terminRows, vars.TOTAL_FEE), [terminRows, vars.TOTAL_FEE])
  const terbilangText = useMemo(() => terbilang(vars.TOTAL_FEE), [vars.TOTAL_FEE])
  const totalPct = useMemo(() => terminRows.reduce((s, x) => s + (Number.isFinite(x.pct) ? x.pct : 0), 0), [terminRows])
  const allGood = totalPct === 100 && !!vars.NAMA_KLIEN && vars.TOTAL_FEE > 0 && !!vars.NO_SPK

  const setTermin = (i: number, patch: Partial<SpkTerminInput>) =>
    setTerminRows((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const toggleAuto = (i: number) =>
    setTerminRows((prev) => prev.map((t, idx) => (idx === i ? { ...t, auto: !t.auto } : t)))
  const addTermin = () =>
    setTerminRows((prev) => [...prev, { label: `Cicilan ${prev.length}`, trigger: 'Sesuai kesepakatan', pct: 0, auto: false }])
  const removeTermin = (i: number) =>
    setTerminRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  const distributeEvenly = () =>
    setTerminRows((prev) => {
      const n = prev.length
      const base = Math.floor(100 / n)
      const rem = 100 - base * n
      return prev.map((t, idx) => ({ ...t, auto: false, pct: base + (idx < rem ? 1 : 0) }))
    })
  const resetTermins = () => setTerminRows(DEFAULT_TERMINS.map((t) => ({ ...t })))

  // Persen manual yang sudah dipakai (di luar baris auto) — untuk info "sisa".
  const manualPct = useMemo(
    () => terminRows.reduce((s, r) => s + (r.auto ? 0 : (Number.isFinite(r.pct) ? r.pct : 0)), 0),
    [terminRows],
  )
  const hasAuto = terminRows.some((r) => r.auto)

  // Dokumen live untuk preview — HTML yang SAMA dengan hasil cetak (embedded = tanpa toolbar).
  const docHtml = useMemo(() => buildSpkDocumentHtml(vars, termins, true), [vars, termins])

  const handleSave = async () => {
    if (!allGood) return
    setSaving(true)
    const normalizedPhone = vars.HP_KLIEN.replace(/\D/g, '')
    const recipient = normalizedPhone.startsWith('0')
      ? '62' + normalizedPhone.slice(1)
      : normalizedPhone.startsWith('8')
        ? '62' + normalizedPhone
        : normalizedPhone

    const { error } = await DocumentService.insert({
      conversation_id: null,
      client_phone: recipient || null,
      client_name: vars.NAMA_KLIEN,
      type: 'spk',
      status: 'draft',
      file_url: null,
      proposal_no: vars.NO_SPK,
      data: {
        ...vars,
        principal: PRINCIPAL,
        termins,
        terbilang: terbilangText,
        generatedAt: new Date().toISOString(),
      },
      sent_at: null,
      valid_until: null,
    })

    setSaving(false)
    if (error) {
      setAlertInfo({ type: 'error', message: 'Gagal menyimpan SPK: ' + error.message })
    } else {
      setAlertInfo({ type: 'success', message: `SPK ${vars.NO_SPK} tersimpan sebagai draft di Dokumen.` })
    }
  }

  const handleGeneratePdf = () => {
    const ok = openSpkPrintWindow(vars, termins)
    if (!ok) {
      setAlertInfo({ type: 'error', message: 'Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.' })
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgGrad }}>
      {/* Top bar */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${T.line}`, background: T.panel, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: T.inset, border: `1px solid ${T.line}`, color: T.txt, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.sky)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: T.txt }}>SPK Generator</h1>
          <p style={{ fontSize: 12, color: T.dim, margin: '2px 0 0' }}>9 pasal · termin 50/40/10 · SRA-KB-TPL-SPK v2.0</p>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: allGood ? T.green : T.amber, background: allGood ? `${T.green}18` : `${T.amber}18`, border: `1px solid ${allGood ? T.green : T.amber}40`, padding: '6px 12px', borderRadius: 99 }}>
          <ShieldCheck size={14} />{allGood ? 'Siap dikirim' : 'Belum lengkap'}
        </span>
        <button
          onClick={handleGeneratePdf}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1px solid ${T.line}`, background: T.inset, color: T.txt, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.sky)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
        >
          <FileDown size={15} /> Generate PDF
        </button>
      </div>

      {/* Scroll area */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div className="doc-builder-grid">
          {/* LEFT — form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card refTag="§1" title="Identitas SPK">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Nomor SPK" icon={<Hash size={13} />}>
                  <input style={{ ...inputStyle, fontFamily: T.mono, fontSize: 12 }} value={vars.NO_SPK} onChange={(e) => set('NO_SPK', e.target.value)} />
                </Field>
                <Field label="Tanggal Kontrak" icon={<Calendar size={13} />}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                    <input style={inputStyle} value={vars.HARI} onChange={(e) => set('HARI', e.target.value)} placeholder="Hari" />
                    <input style={inputStyle} value={vars.TANGGAL} onChange={(e) => set('TANGGAL', e.target.value)} placeholder="Tgl" />
                    <input style={inputStyle} value={vars.BULAN} onChange={(e) => set('BULAN', e.target.value)} placeholder="Bulan" />
                    <input style={inputStyle} value={vars.TAHUN} onChange={(e) => set('TAHUN', e.target.value)} placeholder="Thn" />
                  </div>
                </Field>
              </div>
            </Card>

            <Card refTag="§2" title="Pihak Pertama — Pemberi Tugas">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Nama Klien" icon={<User size={13} />}>
                  <input style={inputStyle} value={vars.NAMA_KLIEN} onChange={(e) => set('NAMA_KLIEN', e.target.value)} placeholder="Bp. Ahmad Wijaya" />
                </Field>
                <Field label="Kapasitas" icon={<BadgeCheck size={13} />}>
                  <input style={inputStyle} value={vars.KAPASITAS_KLIEN} onChange={(e) => set('KAPASITAS_KLIEN', e.target.value)} placeholder="pemilik kavling / direktur" />
                </Field>
                <Field label="Alamat Klien" icon={<MapPin size={13} />}>
                  <input style={inputStyle} value={vars.ALAMAT_KLIEN} onChange={(e) => set('ALAMAT_KLIEN', e.target.value)} placeholder="Jl. ..." />
                </Field>
                <Field label="No. HP / WhatsApp" icon={<User size={13} />}>
                  <input style={inputStyle} value={vars.HP_KLIEN} onChange={(e) => set('HP_KLIEN', e.target.value)} placeholder="+62 812-..." />
                </Field>
              </div>
            </Card>

            <Card refTag="§3" title="Detail Proyek">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Nama Proyek" icon={<Building2 size={13} />} full>
                  <input style={inputStyle} value={vars.NAMA_PROYEK} onChange={(e) => set('NAMA_PROYEK', e.target.value)} placeholder="Perencanaan Pembangunan Villa ..." />
                </Field>
                <Field label="Jenis Pekerjaan" icon={<FileSignature size={13} />}>
                  <select style={inputStyle} value={vars.JENIS_PEKERJAAN} onChange={(e) => set('JENIS_PEKERJAAN', e.target.value as SpkJenis)}>
                    {SPK_JENIS_OPTIONS.map((o) => <option key={o} value={o} style={{ background: T.panel }}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Kategori" icon={<Building2 size={13} />}>
                  <select style={inputStyle} value={vars.KATEGORI} onChange={(e) => set('KATEGORI', e.target.value as SpkKategori)}>
                    {SPK_KATEGORI_OPTIONS.map((o) => <option key={o} value={o} style={{ background: T.panel }}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Lokasi Proyek" icon={<MapPin size={13} />}>
                  <input style={inputStyle} value={vars.LOKASI_PROYEK} onChange={(e) => set('LOKASI_PROYEK', e.target.value)} placeholder="Jl. Raya ..." />
                </Field>
                <Field label="Luas Lahan">
                  <input style={inputStyle} value={vars.LUAS_LAHAN} onChange={(e) => set('LUAS_LAHAN', e.target.value)} placeholder="8 x 24 m / 192 m²" />
                </Field>
                <Field label="Program Ruang" full>
                  <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={vars.PROGRAM_RUANG} onChange={(e) => set('PROGRAM_RUANG', e.target.value)} placeholder="Lt.1: ...&#10;Lt.2: ..." />
                </Field>
              </div>
            </Card>

            <Card refTag="§4" title="Biaya & Termin Pembayaran">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <Field label="Total Fee (Rp)" icon={<Wallet size={13} />}>
                  <input type="number" style={{ ...inputStyle, fontFamily: T.mono }} value={vars.TOTAL_FEE} onChange={(e) => set('TOTAL_FEE', Number(e.target.value) || 0)} />
                </Field>
                <Field label="Durasi Pengerjaan (bulan)" icon={<Calendar size={13} />}>
                  <input type="number" style={inputStyle} value={vars.DURASI_BULAN} onChange={(e) => set('DURASI_BULAN', Number(e.target.value) || 0)} />
                </Field>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, color: T.txt }}>
                <input type="checkbox" checked={vars.INCLUDE_RAB} onChange={(e) => set('INCLUDE_RAB', e.target.checked)} />
                Termasuk <b>RAB</b> (Rencana Anggaran Biaya) di Tahap 4 — Detail Drawing
              </label>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Termin Pembayaran (fleksibel · cicilan)</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={distributeEvenly} style={{ fontSize: 10.5, fontWeight: 700, color: T.sky, background: `${T.sky}14`, border: `1px solid ${T.sky}33`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}>Bagi Rata</button>
                  <button onClick={resetTermins} style={{ fontSize: 10.5, fontWeight: 700, color: T.dim, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}>Reset 30/30/30/10</button>
                </div>
              </div>
              <p style={{ fontSize: 11, color: T.dim, margin: '0 0 10px', lineHeight: 1.5 }}>
                Isi persen yang admin tentukan. Tandai satu/lebih termin sebagai <b style={{ color: T.sky }}>Auto</b> untuk dihitung otomatis dari sisa{hasAuto ? ` — sisa saat ini ${Math.round((100 - manualPct) * 100) / 100}%` : ''}.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {termins.map((t, i) => {
                  const isAuto = !!terminRows[i].auto
                  return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 64px 92px 116px 30px', alignItems: 'center', gap: 8, padding: 10, background: T.inset, border: `1px solid ${isAuto ? T.sky + '55' : T.line}`, borderRadius: 8 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.sky }}>{t.kode}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <input
                        style={{ ...inputStyle, padding: '6px 9px', fontSize: 12, fontWeight: 600 }}
                        value={terminRows[i].label}
                        onChange={(e) => setTermin(i, { label: e.target.value })}
                        placeholder="Uraian termin"
                      />
                      <input
                        style={{ ...inputStyle, padding: '5px 9px', fontSize: 11, color: T.sub }}
                        value={terminRows[i].trigger}
                        onChange={(e) => setTermin(i, { trigger: e.target.value })}
                        placeholder="Pemicu / keterangan"
                      />
                    </div>
                    <button
                      onClick={() => toggleAuto(i)}
                      title="Hitung otomatis dari sisa persen"
                      style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', borderRadius: 7, padding: '7px 0', cursor: 'pointer', color: isAuto ? '#03203a' : T.dim, background: isAuto ? T.sky : 'transparent', border: `1px solid ${isAuto ? T.sky : T.line}` }}
                    >
                      Auto
                    </button>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        disabled={isAuto}
                        style={{ ...inputStyle, padding: '8px 22px 8px 9px', fontFamily: T.mono, textAlign: 'right', opacity: isAuto ? 0.6 : 1, cursor: isAuto ? 'not-allowed' : 'text' }}
                        value={isAuto ? t.pct : terminRows[i].pct}
                        onChange={(e) => setTermin(i, { pct: Number(e.target.value) || 0 })}
                      />
                      <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: T.dim }}>%</span>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: T.mono, fontSize: 12.5, fontWeight: 700, color: T.txt }}>{formatIDR(t.nominal)}</div>
                    <button
                      onClick={() => removeTermin(i)}
                      disabled={termins.length <= 1}
                      title="Hapus termin"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${T.line}`, color: termins.length <= 1 ? T.line : '#ef4444', cursor: termins.length <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  )
                })}

                <button
                  onClick={addTermin}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 8, border: `1px dashed ${T.sky}55`, background: `${T.sky}0d`, color: T.sky, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  <Plus size={15} /> Tambah Termin / Cicilan
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 64px 92px 116px 30px', alignItems: 'center', gap: 8, padding: 12, background: totalPct === 100 ? `${T.green}12` : `${T.red}10`, border: `1px solid ${totalPct === 100 ? T.green : T.red}40`, borderRadius: 8 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: totalPct === 100 ? T.green : T.red }}>Σ</span>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.txt }}>GRAND TOTAL {totalPct !== 100 && <span style={{ fontSize: 11, fontWeight: 700, color: T.red }}>· harus 100%</span>}</div>
                  <span />
                  <span style={{ fontSize: 12, fontWeight: 800, color: totalPct === 100 ? T.green : T.red, textAlign: 'right', paddingRight: 4 }}>{totalPct}%</span>
                  <div style={{ textAlign: 'right', fontFamily: T.mono, fontSize: 12.5, fontWeight: 800, color: T.txt }}>{formatIDR(vars.TOTAL_FEE)}</div>
                  <span />
                </div>
                <p style={{ fontSize: 11, color: T.dim, fontStyle: 'italic', margin: '6px 0 0' }}>
                  Terbilang: <span style={{ color: T.txt, fontStyle: 'normal' }}>{terbilangText}</span>
                </p>
              </div>
            </Card>

            <Card refTag="§5" title="5 Tahap Pekerjaan (Pasal 1.5)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SPK_TAHAPAN.map((t) => (
                  <div key={t.no} style={{ padding: 12, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.sky }}>T{t.no}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>{t.nama}</span>
                    </div>
                    <p style={{ fontSize: 11.5, color: T.dim, margin: 0, lineHeight: 1.5 }}>{t.deskripsi}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Tidak termasuk pekerjaan PIHAK KEDUA</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SPK_EXCLUSIONS.map((x) => (
                  <span key={x} style={{ fontSize: 11, color: T.sub, background: T.inset, border: `1px solid ${T.line}`, padding: '3px 9px', borderRadius: 99 }}>{x}</span>
                ))}
              </div>
            </Card>

            <Card refTag="§G" title="Guardrails — DO & DON'T">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SPK_GUARDRAILS.map((g, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, fontSize: 11.5, background: g.tone === 'ok' ? `${T.green}10` : `${T.red}10`, border: `1px solid ${g.tone === 'ok' ? T.green : T.red}33` }}>
                    {g.tone === 'ok' ? <CheckCircle2 size={15} color={T.green} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={15} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />}
                    <div>
                      <div style={{ fontFamily: T.mono, fontSize: 9.5, fontWeight: 700, color: T.dim }}>{g.code}</div>
                      <div style={{ color: T.txt }}>{g.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card refTag="§QA" title="Checklist Pra-Kirim">
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SPK_QA_CHECKLIST.map((q, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: T.txt }}>
                    <input type="checkbox" id={`qa-${i}`} style={{ marginTop: 2 }} />
                    <label htmlFor={`qa-${i}`} style={{ cursor: 'pointer', lineHeight: 1.5 }}>{q}</label>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* RIGHT — sticky live preview (HTML identik dengan hasil cetak) */}
          <div className="doc-builder-aside" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6 }}>Preview Dokumen (live)</span>
              <span style={{ fontSize: 10.5, color: T.dim }}>Tampilan ini = hasil cetak</span>
            </div>
            <div className="doc-preview-frame" style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden', height: 'calc(100vh - 250px)', minHeight: 460 }}>
              <iframe
                title="Preview SPK"
                srcDoc={docHtml}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!allGood || saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14,
                borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14,
                background: allGood ? T.sky : T.inset, color: allGood ? '#03203a' : T.dim,
                cursor: allGood && !saving ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
              {saving ? 'Menyimpan...' : 'Generate & Simpan SPK'}
            </button>
            <button
              onClick={handleGeneratePdf}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${T.line}`, background: T.panel, color: T.txt, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.sky)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
            >
              <FileDown size={16} /> Generate PDF (cetak)
            </button>
            {onCreateInvoice && (
              <button
                onClick={() =>
                  onCreateInvoice({
                    clientName: vars.NAMA_KLIEN,
                    clientPhone: vars.HP_KLIEN,
                    projectName: vars.NAMA_PROYEK,
                    projectType: vars.JENIS_PEKERJAAN,
                    location: vars.LOKASI_PROYEK,
                    area: vars.LUAS_LAHAN,
                    contractValue: vars.TOTAL_FEE,
                    termins: termins.map((t) => ({ label: t.label, sub: t.trigger, percent: t.pct })),
                  })
                }
                disabled={!allGood}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 12, borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13, background: allGood ? T.bright : T.inset, color: allGood ? '#fff' : T.dim, cursor: allGood ? 'pointer' : 'not-allowed' }}
              >
                <Receipt size={16} /> Lanjut ke Invoice (tagihan)
              </button>
            )}
            {!allGood && (
              <p style={{ fontSize: 11, color: T.dim, textAlign: 'center', margin: 0 }}>
                Lengkapi nama klien, total fee, dan pastikan termin 100%.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Alert modal */}
      {alertInfo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.panel, padding: 32, borderRadius: 20, width: '100%', maxWidth: 400, border: `1px solid ${T.line}`, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: alertInfo.type === 'success' ? `${T.green}20` : '#ef444420', color: alertInfo.type === 'success' ? T.green : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{alertInfo.type === 'success' ? 'check_circle' : 'error'}</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px', color: T.txt }}>{alertInfo.type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan'}</h3>
            <p style={{ fontSize: 14, color: T.dim, lineHeight: 1.6, margin: '0 0 24px' }}>{alertInfo.message}</p>
            <button
              onClick={() => { const ok = alertInfo.type === 'success'; setAlertInfo(null); if (ok) onBack() }}
              style={{ width: '100%', padding: 14, borderRadius: 12, fontWeight: 700, cursor: 'pointer', background: alertInfo.type === 'success' ? T.sky : '#ef4444', color: '#fff', border: 'none' }}
            >
              {alertInfo.type === 'success' ? 'Selesai' : 'Tutup'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpkBuilder
