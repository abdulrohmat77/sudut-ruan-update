import React, { useEffect, useState } from 'react'
import { DocumentService, DBDocument } from '../services/supabaseClient'
import { T } from '../components/AcosUI'
import { FileText, FileSignature, Receipt, Plus, Search, X, Loader2, Download, Trash2 } from 'lucide-react'

import { PageType } from '../App'

interface Props {
  onNavigate?: (page: PageType) => void
}

const Documents = ({ onNavigate }: Props) => {
  const [documents, setDocuments] = useState<DBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'proposal' | 'spk' | 'invoice'>('all')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [alertModal, setAlertModal] = useState<{ title: string, message: string, type: 'error'|'info' } | null>(null)

  const loadData = async () => {
    setLoading(true)
    const data = await DocumentService.getAll()
    setDocuments(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  const executeDelete = async () => {
    if (!deleteConfirmId) return
    
    setLoading(true)
    const { error } = await DocumentService.delete(deleteConfirmId)
    if (error) {
      setAlertModal({ title: 'Gagal', message: 'Gagal menghapus dokumen', type: 'error' })
      setLoading(false)
    } else {
      await loadData()
      setDeleteConfirmId(null)
    }
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
        <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: T.sky, color: '#03203a', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
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
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={{ padding: 7, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, cursor: 'pointer', color: T.dim, display: 'inline-flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = T.sky} onMouseLeave={e => e.currentTarget.style.color = T.dim} title="Download">
                        <Download size={14} />
                      </button>
                      <button onClick={() => handleDeleteClick(doc.id)} style={{ padding: 7, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, cursor: 'pointer', color: T.dim, display: 'inline-flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = T.dim} title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Create Document Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.panel, padding: 24, borderRadius: 16, width: '100%', maxWidth: 440, border: `1px solid ${T.line}`, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: T.txt, fontWeight: 700 }}>Buat Dokumen Baru</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.dim }}>Pilih template dokumen yang ingin dibuat.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: T.dim, cursor: 'pointer', padding: 4 }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { if(onNavigate) onNavigate('proposal-builder'); setShowCreateModal(false) }} style={{ padding: 16, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', color: T.txt, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = T.sky} onMouseLeave={e => e.currentTarget.style.borderColor = T.line}>
                <div style={{ padding: 12, background: `${T.sky}20`, color: T.sky, borderRadius: 10 }}><FileText size={24} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Proposal Penawaran</div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Buat proposal desain & penawaran harga untuk klien baru.</div>
                </div>
              </button>

              <button onClick={() => { if(onNavigate) onNavigate('spk-builder'); setShowCreateModal(false) }} style={{ padding: 16, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', color: T.txt, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = T.sky} onMouseLeave={e => e.currentTarget.style.borderColor = T.line}>
                <div style={{ padding: 12, background: `${T.green}20`, color: T.green, borderRadius: 10 }}><FileSignature size={24} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Surat Perintah Kerja (SPK)</div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Buat kontrak kerja legal secara profesional.</div>
                </div>
              </button>

              <button onClick={() => { if(onNavigate) onNavigate('invoice-builder'); setShowCreateModal(false) }} style={{ padding: 16, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', color: T.txt, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = T.sky} onMouseLeave={e => e.currentTarget.style.borderColor = T.line}>
                <div style={{ padding: 12, background: `${T.sky}20`, color: T.sky, borderRadius: 10 }}><Receipt size={24} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Invoice / Tagihan</div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Buat tagihan pembayaran termijn proyek.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.panel, padding: 32, borderRadius: 20, width: '100%', maxWidth: 400, border: `1px solid ${T.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ef444420', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: T.txt }}>Hapus Dokumen?</h3>
            <p style={{ fontSize: 14, color: T.dim, margin: '0 0 24px', lineHeight: 1.5 }}>
              Tindakan ini tidak dapat dibatalkan. Dokumen akan dihapus secara permanen dari sistem.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${T.line}`, background: 'transparent', color: T.txt, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={executeDelete} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Alert Modal */}
      {alertModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.panel, padding: 32, borderRadius: 20, width: '100%', maxWidth: 400, border: `1px solid ${T.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: alertModal.type === 'error' ? '#ef444420' : `${T.sky}20`, color: alertModal.type === 'error' ? '#ef4444' : T.sky, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>{alertModal.type === 'error' ? 'error' : 'info'}</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: T.txt }}>{alertModal.title}</h3>
            <p style={{ fontSize: 14, color: T.dim, margin: '0 0 24px', lineHeight: 1.5 }}>{alertModal.message}</p>
            <button onClick={() => setAlertModal(null)} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: alertModal.type === 'error' ? '#ef4444' : T.sky, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Documents
