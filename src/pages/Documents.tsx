import React, { useEffect, useState } from 'react'
import { DocumentService, DBDocument } from '../services/supabaseClient'
import { T } from '../components/AcosUI'
import { FileText, FileSignature, Receipt, Plus, Search, X, Loader2, Download } from 'lucide-react'

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'proposal' | 'spk' | 'invoice'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    const data = await DocumentService.getAll()
    setDocuments(data)
    setLoading(false)
  }

  const filteredDocs = documents
    .filter(d => filterType === 'all' ? true : d.type === filterType)
    .filter(d =>
      search ?
        d.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.proposal_no?.toLowerCase().includes(search.toLowerCase())
      : true
    )

  const getIconForType = (type: string) => {
    switch (type) {
      case 'proposal': return <FileText size={16} />
      case 'spk': return <FileSignature size={16} />
      case 'invoice': return <Receipt size={16} />
      default: return <FileText size={16} />
    }
  }

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'sent':     return { background: `${T.sky}20`,   color: T.sky,   border: `1px solid ${T.sky}40` }
      case 'accepted': return { background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}40` }
      case 'rejected': return { background: `${T.red}20`,   color: T.red,   border: `1px solid ${T.red}40` }
      default:         return { background: T.inset,          color: T.dim,   border: `1px solid ${T.line}` }
    }
  }

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: T.bgGrad }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.txt, margin: 0, letterSpacing: -0.5 }}>Dokumen & SPK</h1>
          <p style={{ fontSize: 13, color: T.dim, margin: '4px 0 0' }}>Manajemen Proposal, Surat Perintah Kerja (SPK), dan Invoice.</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: T.sky, color: '#03203a', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={16} /> Buat Dokumen Baru
        </button>
      </div>

      {/* Filter + Search bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, marginBottom: 14, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'proposal', 'spk', 'invoice'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${filterType === t ? T.sky : T.line}`,
                background: filterType === t ? `${T.sky}18` : 'transparent',
                color: filterType === t ? T.sky : T.dim,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t === 'all' ? 'Semua' : t.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 9, padding: '7px 12px', minWidth: 200, flex: '0 1 260px' }}>
          <Search size={14} color={T.dim} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari klien / nomor..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.txt, fontSize: 12, fontFamily: T.font }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} color={T.dim} /></button>}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: T.panelHi, zIndex: 10, borderBottom: `1px solid ${T.line}` }}>
              <tr>
                {['Jenis', 'Klien', 'Nomor Dokumen', 'Tanggal', 'Status', 'Aksi'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 1, textAlign: i === 5 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: T.sky, margin: '0 auto', display: 'block' }} />
                </td></tr>
              ) : filteredDocs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: T.dim, fontSize: 13 }}>
                  Tidak ada dokumen yang ditemukan.
                </td></tr>
              ) : filteredDocs.map(doc => (
                <tr key={doc.id} style={{ borderBottom: `1px solid ${T.line}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.inset)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: T.inset, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim }}>
                      {getIconForType(doc.type)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.txt }}>{doc.client_name || '-'}</div>
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{doc.client_phone || '-'}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontFamily: T.mono, fontSize: 12, color: T.sky }}>{doc.proposal_no || '-'}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: T.dim, whiteSpace: 'nowrap' }}>
                    {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, ...getStatusStyle(doc.status) }}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button style={{ padding: 7, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, cursor: 'pointer', color: T.dim, display: 'inline-flex' }} title="Download">
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Documents
