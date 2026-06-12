import { useEffect, useMemo, useState } from 'react'
import { T } from '../components/AcosUI'
import { DocumentService, DBDocument } from '../services/supabaseClient'
import { PageType } from '../App'
import { Wallet, Receipt, Plus, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'

interface Props {
  onNavigate?: (page: PageType) => void
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  )

// Ambil nominal invoice dari berbagai kemungkinan field di doc.data.
const amountOf = (doc: DBDocument): number => {
  const d = (doc.data || {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0)
  return num(d.total) || num(d.amount) || num(d.totalAvg) || num(d.contractValue) || 0
}

// Status pembayaran turunan dari status dokumen.
const payInfo = (status: string): { label: string; color: string } => {
  switch (status) {
    case 'accepted': return { label: 'LUNAS', color: T.green }
    case 'rejected': return { label: 'BATAL', color: T.red }
    case 'sent': return { label: 'TERKIRIM', color: T.sky }
    case 'viewed': return { label: 'DILIHAT', color: T.amber }
    default: return { label: 'DRAFT', color: T.dim }
  }
}

const Finance = ({ onNavigate }: Props) => {
  const [docs, setDocs] = useState<DBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const all = await DocumentService.getAll()
    setDocs(all.filter((d) => d.type === 'invoice'))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const stats = useMemo(() => {
    let total = 0
    let paid = 0
    docs.forEach((d) => {
      if (d.status === 'rejected') return
      const a = amountOf(d)
      total += a
      if (d.status === 'accepted') paid += a
    })
    return { total, paid, outstanding: total - paid, count: docs.length }
  }, [docs])

  const markPaid = async (id: string) => {
    setMarking(id)
    await DocumentService.updateStatus(id, 'accepted')
    await load()
    setMarking(null)
  }

  const kpis = [
    { label: 'Total Nilai Invoice', value: formatIDR(stats.total), icon: <Receipt size={16} />, color: T.sky },
    { label: 'Terbayar (Lunas)', value: formatIDR(stats.paid), icon: <CheckCircle2 size={16} />, color: T.green },
    { label: 'Outstanding', value: formatIDR(stats.outstanding), icon: <Wallet size={16} />, color: T.amber },
    { label: 'Jumlah Invoice', value: String(stats.count), icon: <Receipt size={16} />, color: T.tint },
  ]

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: T.bgGrad }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.txt, margin: 0, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet size={22} color={T.sky} /> Finance
          </h1>
          <p style={{ fontSize: 13, color: T.dim, margin: '4px 0 0' }}>Invoice, termin pembayaran & pelacakan pelunasan.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: T.inset, color: T.txt, borderRadius: 10, border: `1px solid ${T.line}`, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.sky)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('invoice-builder')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: T.sky, color: '#03203a', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              <Plus size={16} /> Buat Invoice
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14, flexShrink: 0 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6 }}>{k.label}</span>
              <span style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.txt, marginTop: 8, letterSpacing: -0.5, fontFamily: T.mono }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: T.panelHi, zIndex: 10, borderBottom: `1px solid ${T.line}` }}>
              <tr>
                {['No. Invoice', 'Klien', 'Nominal', 'Status', 'Tanggal', 'Aksi'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 1, textAlign: i === 2 || i === 5 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: T.sky, margin: '0 auto', display: 'block' }} />
                </td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: T.dim, fontSize: 13 }}>
                  Belum ada invoice. Buat lewat tombol "Buat Invoice".
                </td></tr>
              ) : docs.map((doc) => {
                const pi = payInfo(doc.status)
                return (
                  <tr key={doc.id} style={{ borderBottom: `1px solid ${T.line}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.inset)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: T.mono, fontSize: 12, color: T.sky }}>{doc.proposal_no || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.txt }}>{doc.client_name || '-'}</div>
                      <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{doc.client_phone || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.txt, whiteSpace: 'nowrap' }}>{formatIDR(amountOf(doc))}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, background: `${pi.color}20`, color: pi.color, border: `1px solid ${pi.color}40` }}>{pi.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: T.dim, whiteSpace: 'nowrap' }}>
                      {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {doc.status !== 'accepted' && doc.status !== 'rejected' && (
                        <button
                          onClick={() => markPaid(doc.id)}
                          disabled={marking === doc.id}
                          title="Tandai Lunas"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: `${T.green}18`, color: T.green, border: `1px solid ${T.green}40`, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {marking === doc.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Lunas
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Finance
