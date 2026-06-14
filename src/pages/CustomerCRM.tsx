import React, { useEffect, useMemo, useState } from 'react'
import { PageType } from '../App'
import { T, Icon, Avatar, Tag, ProgBar, Btn, Panel } from '../components/AcosUI'
import { AiSummaryService, ConversationService, DBAiSummary } from '../services/supabaseClient'
import type { ConversationAnalysis } from '../services/n8nWebhookService'

interface CustomerCRMProps {
  onNavigate: (page: PageType) => void
}

const statusTone = (s?: string | null): string => {
  const v = (s || '').toLowerCase()
  if (v.includes('clos') || v.includes('deal') || v.includes('won')) return T.green
  if (v.includes('hot')) return T.red
  if (v.includes('warm')) return T.amber
  if (v.includes('cold')) return T.dim
  return T.sky
}

const fmtRp = (num: number) => {
  if (!num) return '—'
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`
  if (num >= 1_000_000) return `Rp ${Math.round(num / 1_000_000)}jt`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

const initials = (n?: string | null) => (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const CustomerCRM: React.FC<CustomerCRMProps> = ({ onNavigate }) => {
  const [rows, setRows] = useState<DBAiSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold' | 'closing'>('all')

  const load = async () => {
    setLoading(true)
    // Sumber utama: tabel ai_summaries. Fallback: metadata percakapan (data lama).
    const [table, convs] = await Promise.all([
      AiSummaryService.getAll(),
      ConversationService.getAll(),
    ])
    const byConv = new Map<string, DBAiSummary>()
    // Data lama dari metadata dulu, lalu di-override oleh tabel (lebih baru/akurat).
    convs.forEach((c) => {
      const a = (c.metadata as Record<string, unknown> | undefined)?.aiAnalysis as ConversationAnalysis | undefined
      if (!a) return
      byConv.set(c.id, {
        conversation_id: c.id,
        tanggal: a.tanggal || null,
        nama: a.nama || c.client_name || null,
        phone: a.phone || c.id,
        channel: a.channel || c.source || null,
        project_type: a.project_type || null,
        lokasi: a.lokasi || null,
        luas_m2: a.luas_m2 != null ? String(a.luas_m2) : null,
        estimasi_value: a.estimasi_value != null ? String(a.estimasi_value) : null,
        status: a.status || null,
        design_stage: a.design_stage || null,
        progress_pct: a.progress_pct != null ? String(a.progress_pct) : null,
        ringkasan: a.ringkasan || null,
      })
    })
    table.forEach((r) => byConv.set(r.conversation_id, r))
    const out = Array.from(byConv.values())
    setRows(out)
    setSelId((prev) => (prev && out.some((r) => r.conversation_id === prev) ? prev : out[0]?.conversation_id ?? null))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = (r.status || '').toLowerCase()
      const matchFilter =
        filter === 'all' ? true :
        filter === 'closing' ? (s.includes('clos') || s.includes('deal')) :
        s.includes(filter)
      const q = search.trim().toLowerCase()
      const matchSearch = !q || (r.nama || '').toLowerCase().includes(q) || (r.lokasi || '').toLowerCase().includes(q) || (r.phone || '').includes(q)
      return matchFilter && matchSearch
    })
  }, [rows, filter, search])

  const sel = rows.find((r) => r.conversation_id === selId) || null

  const qualOf = (r: DBAiSummary) => {
    const budget = r.estimasi_value ? 1 : 0
    const authority = r.phone ? 1 : 0
    const need = (r.project_type || r.lokasi) ? 1 : 0
    const timeline = r.design_stage ? 1 : 0
    return { budget, authority, need, timeline, total: budget + authority + need + timeline }
  }
  const scoreOf = (r: DBAiSummary) => {
    const p = Number(r.progress_pct)
    if (!isNaN(p) && r.progress_pct) return Math.round(p)
    return Math.round((qualOf(r).total / 4) * 100)
  }

  const totalEst = rows.reduce((s, r) => s + (Number(r.estimasi_value) || 0), 0)

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0 }}>Customer CRM (AI Summary)</h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 6 }}>{rows.length} klien terangkum · {fmtRp(totalEst)} estimasi · sinkron Supabase</div>
        </div>
        <Btn v="ghost" size="sm" icon="RefreshCw" onClick={load}>Refresh</Btn>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: T.dim, fontSize: 13 }}>Memuat data...</div>
      ) : rows.length === 0 ? (
        <Panel pad={40}>
          <div style={{ textAlign: 'center', color: T.dim, fontSize: 13, lineHeight: 1.7 }}>
            <Icon name="Sparkles" size={28} color={T.dim} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ fontWeight: 700, color: T.sub, marginBottom: 6 }}>Belum ada rangkuman</div>
            Buka <b>Active Chats</b> → pilih percakapan → ketuk header / panel <b>AI Analyst</b> → <b>Generate Rangkuman</b>.
            <div style={{ marginTop: 14 }}><Btn v="primary" size="sm" icon="MessageSquare" onClick={() => onNavigate('chat-monitoring')}>Buka Active Chats</Btn></div>
          </div>
        </Panel>
      ) : (
        <Panel style={{ overflow: 'hidden' }}>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${T.line}`, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 9, padding: '7px 11px', flex: '1 1 200px', minWidth: 160 }}>
              <Icon name="Search" size={14} color={T.dim} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / lokasi / nomor..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.txt, fontSize: 12, fontFamily: T.font }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'hot', 'warm', 'cold', 'closing'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 13px', borderRadius: 999, border: `1px solid ${filter === f ? T.sky + '55' : T.line}`, background: filter === f ? 'rgba(74,179,216,0.14)' : 'transparent', color: filter === f ? T.sky : T.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, textTransform: 'capitalize' }}>{f === 'all' ? 'Semua' : f}</button>
              ))}
            </div>
          </div>

          <div className="ai-crm-grid">
            {/* LEFT — master table */}
            <div style={{ borderRight: `1px solid ${T.line}`, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead style={{ borderBottom: `1px solid ${T.line}` }}>
                  <tr>
                    {['Klien', 'Channel', 'Tahap', 'Status', 'Estimasi'].map((h, i) => (
                      <th key={h} style={{ padding: '11px 14px', fontSize: 9.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.7, textAlign: i === 4 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Tidak ada hasil.</td></tr>
                  ) : filtered.map((r) => {
                    const isSel = r.conversation_id === selId
                    return (
                      <tr key={r.conversation_id} onClick={() => setSelId(r.conversation_id)} className="ac-row" style={{ borderBottom: `1px solid ${T.line}`, cursor: 'pointer', background: isSel ? 'rgba(74,179,216,0.08)' : 'transparent', borderLeft: `3px solid ${isSel ? T.sky : 'transparent'}` }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <Avatar initials={initials(r.nama)} color={statusTone(r.status)} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: T.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{r.nama || '—'}</div>
                              <div style={{ fontSize: 9.5, color: T.dim }}>{r.lokasi || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}><Tag color={T.tint} style={{ fontSize: 9 }}>{(r.channel || '—').toString().toUpperCase()}</Tag></td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: T.sub, whiteSpace: 'nowrap' }}>{r.design_stage || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, padding: '3px 9px', borderRadius: 999, background: `${statusTone(r.status)}22`, color: statusTone(r.status), border: `1px solid ${statusTone(r.status)}55`, whiteSpace: 'nowrap' }}>{r.status || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: T.txt, fontFamily: T.mono, textAlign: 'right', whiteSpace: 'nowrap' }}>{r.estimasi_value ? fmtRp(Number(r.estimasi_value) || 0) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* RIGHT — detail panel */}
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sel ? (() => {
                const q = qualOf(sel)
                const score = scoreOf(sel)
                const tone = statusTone(sel.status)
                const bant: [string, number, string][] = [
                  ['Budget', q.budget, sel.estimasi_value ? fmtRp(Number(sel.estimasi_value) || 0) : 'Belum ada'],
                  ['Otoritas', q.authority, sel.phone ? 'Kontak tersedia' : 'Belum ada'],
                  ['Kebutuhan', q.need, sel.project_type || sel.lokasi || 'Belum ada'],
                  ['Timeline', q.timeline, sel.design_stage || 'Belum ada'],
                ]
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar initials={initials(sel.nama)} color={tone} size={46} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.txt }}>{sel.nama || '—'}</div>
                        <div style={{ fontSize: 11, color: T.dim, fontFamily: T.mono }}>{sel.phone || sel.conversation_id}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, padding: '4px 11px', borderRadius: 999, background: `${tone}22`, color: tone, border: `1px solid ${tone}55` }}>{sel.status || '—'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        ['Channel', (sel.channel || '—').toString()],
                        ['Kota', sel.lokasi || '—'],
                        ['Proyek', sel.project_type || '—'],
                        ['Luas', sel.luas_m2 ? `${sel.luas_m2} m²` : '—'],
                      ].map(([k, v]) => (
                        <div key={k} style={{ background: T.inset, border: `1px solid ${T.line}`, borderRadius: 10, padding: '9px 11px' }}>
                          <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.txt, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6 }}>Skor Kualifikasi</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: tone, fontFamily: T.mono, lineHeight: 1 }}>{score}</span>
                        <span style={{ fontSize: 11, color: T.dim }}>/100</span>
                        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, padding: '3px 10px', borderRadius: 999, background: `${tone}18`, color: tone, border: `1px solid ${tone}44` }}>{(sel.status || 'lead').toString()} lead</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {bant.map(([label, on, hint]) => (
                          <div key={label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>{label}</span>
                              <span style={{ fontSize: 10, color: on ? T.green : T.dim }}>{hint}</span>
                            </div>
                            <ProgBar value={on ? 100 : 8} color={on ? T.green : T.line} h={5} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(143,208,232,0.08)', border: `1px solid ${T.sky}33`, borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Icon name="Bot" size={15} color={T.sky} /><span style={{ fontSize: 12, fontWeight: 700, color: T.sky }}>Ringkasan AI</span>
                        {sel.tanggal && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.dim, fontFamily: T.mono }}>{sel.tanggal}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.6 }}>{sel.ringkasan || 'Belum ada ringkasan untuk percakapan ini.'}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn v="primary" size="sm" icon="MessageSquare" onClick={() => onNavigate('chat-monitoring')} style={{ flex: 1, justifyContent: 'center' }}>Chat</Btn>
                      <Btn v="ghost" size="sm" icon="FileText" onClick={() => onNavigate('proposal-builder')} style={{ flex: 1, justifyContent: 'center' }}>Proposal</Btn>
                      <Btn v="ghost" size="sm" icon="Kanban" onClick={() => onNavigate('pipeline')} style={{ flex: 1, justifyContent: 'center' }}>Proyek</Btn>
                    </div>
                  </>
                )
              })() : (
                <div style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Pilih klien untuk lihat detail.</div>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}

export default CustomerCRM
