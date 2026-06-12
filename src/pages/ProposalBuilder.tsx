import React, { useEffect, useMemo, useState } from 'react'
import { T } from '../components/AcosUI'
import { ArrowLeft, Plus, Trash2, Loader2, Eye, Save, ArrowRight } from 'lucide-react'
import { AIConfigService, DocumentService } from '../services/supabaseClient'
import ProposalPreviewModal from '../components/ProposalPreviewModal'
import {
  ProposalData,
  ProposalLineItem,
  ProposalTimelineItem,
  buildProposalHTML,
  computeTotals,
  defaultTimeline,
  formatMoney,
} from '../services/proposalTemplate'
import { SpkPrefill } from '../services/spkData'

interface Props {
  onBack: () => void
  onCreateSpk?: (prefill: SpkPrefill) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: T.inset, border: `1px solid ${T.line}`,
  borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: T.font, outline: 'none',
}

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</label>
    {children}
  </div>
)

const Card: React.FC<{ tag: string; title: string; children: React.ReactNode }> = ({ tag, title, children }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.sky, background: `${T.sky}18`, border: `1px solid ${T.sky}33`, padding: '2px 7px', borderRadius: 6 }}>{tag}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: T.txt, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
    </div>
    {children}
  </div>
)

const ProposalBuilder = ({ onBack, onCreateSpk }: Props) => {
  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [savedDoc, setSavedDoc] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR')
  const [taxPct, setTaxPct] = useState('11')
  const [aboutBody, setAboutBody] = useState(
    'Sudut Ruang Arsitek adalah studio arsitektur, interior, dan lansekap yang menghadirkan desain fungsional dengan karakter kuat. Kami mendampingi klien dari konsep hingga dokumentasi konstruksi.',
  )
  const [closingNote, setClosingNote] = useState(
    'Terima kasih atas kepercayaan Anda. Kami siap berdiskusi lebih lanjut untuk mewujudkan ruang impian Anda.',
  )
  const [lineItems, setLineItems] = useState<ProposalLineItem[]>([
    { description: 'Jasa Desain Arsitektur', volume: '1 Paket', qty: 1, unitPrice: 0 },
  ])
  const [timeline, setTimeline] = useState<ProposalTimelineItem[]>(() => defaultTimeline())

  const [company, setCompany] = useState({
    name: 'Sudut Ruang Arsitek',
    locations: 'Surabaya | Bali | IKN',
    phone: '+62 851 7700 0990',
    logo: '',
  })

  useEffect(() => {
    AIConfigService.getAll().then((cfg) => {
      setCompany({
        name: cfg.company_name || 'Sudut Ruang Arsitek',
        locations: cfg.company_locations || 'Surabaya | Bali | IKN',
        phone: cfg.company_phone || '+62 851 7700 0990',
        logo: cfg.company_logo || '',
      })
    })
  }, [])

  const proposalNo = useMemo(() => `PROP-${Date.now()}`, [])

  const setItem = (i: number, patch: Partial<ProposalLineItem>) =>
    setLineItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const addItem = () =>
    setLineItems((prev) => [...prev, { description: '', volume: '1 Paket', qty: 1, unitPrice: 0 }])
  const removeItem = (i: number) =>
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))

  const setTl = (i: number, patch: Partial<ProposalTimelineItem>) =>
    setTimeline((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const addTl = () => setTimeline((prev) => [...prev, { badge: `W${prev.length + 1}`, text: '' }])
  const removeTl = (i: number) => setTimeline((prev) => prev.filter((_, idx) => idx !== i))
  const resetTl = () => setTimeline(defaultTimeline())

  const data: ProposalData = useMemo(() => {
    const now = new Date()
    const dateLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    return {
      proposalNo,
      dateLabel,
      confidentialNote: `Confidential & Proprietary • ${dateLabel}`,
      projectTitle: projectTitle || 'Nama Proyek',
      projectTitleAccent: '',
      subtitle,
      preparedFor: clientName || 'Calon Klien',
      metaSmall: `${clientPhone ? `WA: ${clientPhone} | ` : ''}Studio: ${company.name}`,
      currency,
      taxRate: (parseFloat(taxPct) || 0) / 100,
      coverImage: undefined,
      aboutTitle: 'Tentang Studio',
      aboutBody: aboutBody.trim(),
      gallery: [],
      galleryTitle: 'Portofolio & Referensi Desain',
      moodboard: [],
      moodboardTitle: 'Moodboard & Material',
      summaryTitle: 'Executive Summary',
      summaryCards: [
        { title: 'Ruang Lingkup', body: `Jasa desain untuk ${projectTitle || 'proyek'}.` },
        { title: 'Pendekatan', body: 'Desain fungsional dengan karakter kuat, efisien, dan sesuai kebutuhan klien.' },
      ],
      paletteTitle: 'Material & Color Direction',
      paletteIntro: '',
      palette: [],
      timelineTitle: 'Timeline Kerja',
      timeline,
      pricingTitle: 'Rincian Anggaran',
      lineItems,
      notes:
        'Angka di atas merupakan estimasi awal dan dapat berubah setelah survey lokasi dan diskusi detail. Proposal berlaku 14 hari sejak diterbitkan.',
      closingNote: closingNote.trim() || undefined,
      company,
    }
  }, [proposalNo, projectTitle, subtitle, clientName, clientPhone, currency, taxPct, aboutBody, closingNote, lineItems, timeline, company])
  const docHtml = useMemo(() => buildProposalHTML(data), [data])
  const totals = useMemo(() => computeTotals(data), [data])

  const handleSave = async () => {
    setSaving(true)
    const normalizedPhone = clientPhone.replace(/\D/g, '')
    try {
      await DocumentService.insert({
        conversation_id: null,
        client_phone: normalizedPhone || null,
        client_name: clientName || 'Klien',
        type: 'proposal',
        status: 'draft',
        file_url: null,
        proposal_no: proposalNo,
        data: {
          projectName: projectTitle,
          subtitle,
          currency,
          taxRate: (parseFloat(taxPct) || 0) / 100,
          lineItems,
          subtotal: totals.subtotal,
          tax: totals.tax,
          totalAvg: totals.grandTotal,
          clientName,
          generatedAt: new Date().toISOString(),
        },
        sent_at: null,
        valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      setSavedDoc(true)
      setSavedInfo({ type: 'success', message: `Proposal ${proposalNo} tersimpan sebagai draft di Dokumen.` })
    } catch {
      setSavedInfo({ type: 'error', message: 'Gagal menyimpan proposal.' })
    } finally {
      setSaving(false)
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
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: T.txt }}>Proposal Generator</h1>
          <p style={{ fontSize: 12, color: T.dim, margin: '2px 0 0' }}>Proposal penawaran branded — cover, ruang lingkup, timeline & harga.</p>
        </div>
        <button
          onClick={() => setShowPreview(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1px solid ${T.line}`, background: T.inset, color: T.txt, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.sky)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
        >
          <Eye size={15} /> Preview & Cetak
        </button>
      </div>

      {/* Body */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div className="doc-builder-grid">
          {/* LEFT — form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card tag="§1" title="Identitas Proposal">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Nama Klien"><input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Bpk. Budi" /></Field>
                <Field label="No. WhatsApp"><input style={inputStyle} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="6281234567890" /></Field>
                <Field label="Judul Proyek" full><input style={inputStyle} value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Villa Tropis Ubud" /></Field>
                <Field label="Subjudul" full><input style={inputStyle} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Design & Build Proposal" /></Field>
                <Field label="Mata Uang">
                  <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value as 'IDR' | 'USD')}>
                    <option value="IDR" style={{ background: T.panel }}>IDR</option>
                    <option value="USD" style={{ background: T.panel }}>USD</option>
                  </select>
                </Field>
                <Field label="PPN (%)"><input type="number" style={inputStyle} value={taxPct} onChange={(e) => setTaxPct(e.target.value)} /></Field>
              </div>
            </Card>

            <Card tag="§2" title="Rincian Harga (Line Items)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lineItems.map((it, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 56px 130px 30px', gap: 8, alignItems: 'center', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, padding: 8 }}>
                    <input style={{ ...inputStyle, padding: '7px 9px', fontSize: 12 }} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Deskripsi" />
                    <input style={{ ...inputStyle, padding: '7px 9px', fontSize: 12 }} value={it.volume} onChange={(e) => setItem(i, { volume: e.target.value })} placeholder="Volume" />
                    <input type="number" style={{ ...inputStyle, padding: '7px 9px', fontSize: 12, textAlign: 'right' }} value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) || 0 })} />
                    <input type="number" style={{ ...inputStyle, padding: '7px 9px', fontSize: 12, textAlign: 'right', fontFamily: T.mono }} value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) || 0 })} placeholder="Harga" />
                    <button onClick={() => removeItem(i)} disabled={lineItems.length <= 1} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${T.line}`, color: lineItems.length <= 1 ? T.line : '#ef4444', cursor: lineItems.length <= 1 ? 'not-allowed' : 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 8, border: `1px dashed ${T.sky}55`, background: `${T.sky}0d`, color: T.sky, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  <Plus size={15} /> Tambah Item
                </button>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: T.sub }}><span>Subtotal</span><span style={{ fontFamily: T.mono }}>{currency} {formatMoney(currency, totals.subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: T.sub }}><span>PPN {taxPct || 0}%</span><span style={{ fontFamily: T.mono }}>{currency} {formatMoney(currency, totals.tax)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: T.txt, fontWeight: 800, paddingTop: 6, borderTop: `1px solid ${T.line}` }}><span>TOTAL</span><span style={{ fontFamily: T.mono, color: T.sky }}>{currency} {formatMoney(currency, totals.grandTotal)}</span></div>
              </div>
            </Card>

            <Card tag="§3" title="Narasi">
              <Field label="Tentang Studio" full>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={aboutBody} onChange={(e) => setAboutBody(e.target.value)} />
              </Field>
              <div style={{ height: 12 }} />
              <Field label="Catatan Penutup" full>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={closingNote} onChange={(e) => setClosingNote(e.target.value)} />
              </Field>
            </Card>

            <Card tag="§4" title="Timeline Kerja">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button onClick={resetTl} style={{ fontSize: 10.5, fontWeight: 700, color: T.dim, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}>Reset Default</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timeline.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 30px', gap: 8, alignItems: 'center', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, padding: 8 }}>
                    <input style={{ ...inputStyle, padding: '7px 9px', fontSize: 12, fontFamily: T.mono }} value={t.badge} onChange={(e) => setTl(i, { badge: e.target.value })} placeholder="W1-W2" />
                    <input style={{ ...inputStyle, padding: '7px 9px', fontSize: 12 }} value={t.text} onChange={(e) => setTl(i, { text: e.target.value })} placeholder="Tahap pekerjaan" />
                    <button onClick={() => removeTl(i)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${T.line}`, color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addTl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 8, border: `1px dashed ${T.sky}55`, background: `${T.sky}0d`, color: T.sky, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  <Plus size={15} /> Tambah Tahap
                </button>
              </div>
            </Card>
          </div>

          {/* RIGHT — live preview + actions */}
          <div className="doc-builder-aside" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6 }}>Preview Dokumen (live)</span>
              <span style={{ fontSize: 10.5, color: T.dim }}>= hasil cetak</span>
            </div>
            <div className="doc-preview-frame" style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden', height: 'calc(100vh - 250px)', minHeight: 460 }}>
              <iframe title="Preview Proposal" srcDoc={docHtml} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14, background: T.sky, color: '#03203a', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Menyimpan...' : 'Simpan Proposal'}
            </button>
            <button
              onClick={() => setShowPreview(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${T.line}`, background: T.panel, color: T.txt, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.sky)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
            >
              <Eye size={16} /> Preview & Cetak (PDF)
            </button>
            {onCreateSpk && (
              <button
                onClick={() =>
                  onCreateSpk({
                    clientName,
                    clientPhone,
                    projectName: projectTitle,
                    totalFee: totals.subtotal,
                  })
                }
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 12, borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13, background: T.bright, color: '#fff', cursor: 'pointer' }}
              >
                <ArrowRight size={16} /> Lanjut ke SPK (pakai data ini)
              </button>
            )}
          </div>
        </div>
      </div>

      {showPreview && (
        <ProposalPreviewModal
          data={data}
          onClose={() => setShowPreview(false)}
          onSave={handleSave}
          saving={saving}
          saved={savedDoc}
        />
      )}

      {savedInfo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.panel, padding: 32, borderRadius: 20, width: '100%', maxWidth: 400, border: `1px solid ${T.line}`, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: savedInfo.type === 'success' ? `${T.green}20` : '#ef444420', color: savedInfo.type === 'success' ? T.green : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{savedInfo.type === 'success' ? 'check_circle' : 'error'}</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px', color: T.txt }}>{savedInfo.type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan'}</h3>
            <p style={{ fontSize: 14, color: T.dim, lineHeight: 1.6, margin: '0 0 24px' }}>{savedInfo.message}</p>
            <button onClick={() => setSavedInfo(null)} style={{ width: '100%', padding: 14, borderRadius: 12, fontWeight: 700, cursor: 'pointer', background: savedInfo.type === 'success' ? T.sky : '#ef4444', color: '#fff', border: 'none' }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProposalBuilder
