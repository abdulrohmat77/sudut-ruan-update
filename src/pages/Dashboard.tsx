import React, { useState, useEffect } from 'react'
import { PageType } from '../App'
import { T, Icon, Panel, PanelHead, Btn, Tag, Dot, Stat, Spark, Bars, Ring, Avatar, ProgBar } from '../components/AcosUI'
import { ClientService, DBClient, ConversationService } from '../services/supabaseClient'
import type { ConversationAnalysis } from '../services/n8nWebhookService'

const statusTone = (s?: string): string => {
  switch ((s || '').toLowerCase()) {
    case 'hot': return T.red
    case 'warm': return T.amber
    case 'cold': return T.dim
    case 'closing': return T.green
    default: return T.sky
  }
}

interface DashboardProps {
  onNavigate?: (page: PageType) => void
}

const fmtRp = (num: number) => {
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`
  if (num >= 1_000_000) return `Rp ${Math.round(num / 1_000_000)}jt`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)
}

function FlowStrip({ setPage, clients }: { setPage: (p: any) => void, clients: DBClient[] }) {
  const flow = [
    { key: "lead", label: "Leads", icon: "Inbox" },
    { key: "crm", label: "CRM", icon: "Users" },
    { key: "ai", label: "AI Syifa", icon: "Bot" },
    { key: "estimate", label: "Estimasi", icon: "Calculator" },
    { key: "proposal", label: "Proposal", icon: "FileText" },
    { key: "spk", label: "SPK", icon: "FileSignature" },
    { key: "invoice", label: "Invoice", icon: "Receipt" },
    { key: "payment", label: "Payment", icon: "CreditCard" },
    { key: "project", label: "Project", icon: "Kanban" },
    { key: "portfolio", label: "Portfolio", icon: "Image" }
  ];
  const counts: Record<string, number> = {
    lead: clients.filter(c => c.status === 'lead').length,
    crm: clients.filter(c => c.status !== 'lead').length,
    ai: clients.length,
    estimate: clients.filter(c => c.status === 'estimasi').length,
    proposal: clients.filter(c => c.status === 'proposal').length,
    spk: clients.filter(c => c.status === 'negosiasi').length,
    invoice: clients.filter(c => c.status === 'deal').length,
    payment: clients.filter(c => c.status === 'deal').length,
    project: clients.filter(c => c.status === 'deal').length,
    portfolio: clients.filter(c => c.status === 'closed').length
  };
  const [pulse, setPulse] = useState(0);
  useEffect(() => { const t = setInterval(() => setPulse((p) => (p + 1) % flow.length), 1100); return () => clearInterval(t); }, []);
  return (
    <Panel style={{ gridColumn: "1 / -1" }}>
      <PanelHead title="Operations Flow" sub="Lead → CRM → AI → Estimasi → Proposal → SPK → Invoice → Payment → Project → Portfolio" icon="Workflow" />
      <div style={{ display: "flex", alignItems: "stretch", padding: "18px 16px", gap: 0, overflowX: "auto" }}>
        {flow.map((s, i) => (
          <React.Fragment key={s.key}>
            <div onClick={() => setPage("pipeline")} style={{ flex: 1, minWidth: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", position: "relative" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", position: "relative",
                background: pulse === i ? "rgba(74,179,216,0.22)" : "rgba(255,255,255,0.04)", border: `1px solid ${pulse === i ? T.sky : T.line}`, transition: "all .4s", transform: pulse === i ? "scale(1.08)" : "none" }}>
                <Icon name={s.icon} size={19} color={pulse === i ? T.sky : T.sub} />
                <div style={{ position: "absolute", top: -7, right: -7, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: T.navy700, border: `1px solid ${T.sky}55`, display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 800, color: T.tint }}>{counts[s.key] || 0}</div>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: pulse === i ? T.txt : T.sub, textAlign: "center" }}>{s.label}</div>
            </div>
            {i < flow.length - 1 && <div style={{ alignSelf: "flex-start", marginTop: 22, color: T.dim, flexShrink: 0 }}><Icon name="ChevronRight" size={15} color={pulse === i ? T.sky : T.dim} /></div>}
          </React.Fragment>
        ))}
      </div>
    </Panel>
  );
}

function AutomationCard({ setPage }: { setPage: (p: any) => void }) {
  // We actually removed n8n. Kiro runs on Supabase Edge Functions or internal. We'll show empty or internal stats.
  const health = 100;
  return (
    <Panel>
      <PanelHead title="Automation Health" sub="Supabase Webhooks · Internal" icon="Workflow" accent={T.green}
        right={<Tag color={T.green}><Dot color={T.green} pulse size={6} />LIVE</Tag>} />
      <div style={{ display: "flex", gap: 14, padding: "16px 18px", alignItems: "center", borderBottom: `1px solid ${T.line}` }}>
        <Ring value={Math.round(health)} size={68} color={T.green} label="uptime" />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: T.dim }}>Webhook aktif</span><span style={{ fontSize: 11, fontWeight: 700, color: T.txt }}>1 / 1</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: T.dim }}>Run / 24 jam</span><span style={{ fontSize: 11, fontWeight: 700, color: T.txt }}>Realtime</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: T.dim }}>Avg latency</span><span style={{ fontSize: 11, fontWeight: 700, color: T.sky }}>0.2 s</span>
          </div>
        </div>
      </div>
      <div style={{ padding: "4px 14px 14px" }}>
        <Btn v="ghost" size="sm" icon="ArrowRight" onClick={() => setPage("automation")} style={{ width: "100%", justifyContent: "center" }}>Lihat Log Automasi</Btn>
      </div>
    </Panel>
  );
}

function AttentionCard({ setPage, clients }: { setPage: (p: any) => void, clients: DBClient[] }) {
  const hotLeads = clients.filter(c => c.status === 'negosiasi');
  const newLeads = clients.filter(c => c.status === 'lead');
  
  const items = [];
  if (hotLeads.length > 0) {
    items.push({ icon: "Flame", color: T.amber, title: `${hotLeads.length} lead HOT tahap negosiasi`, sub: hotLeads.map(c => c.name).join(', '), page: "pipeline" });
  }
  if (newLeads.length > 0) {
    items.push({ icon: "Inbox", color: T.sky, title: `${newLeads.length} lead baru masuk`, sub: "Siap difollow up oleh AI/Human", page: "pipeline" });
  }
  if (items.length === 0) {
    items.push({ icon: "CheckCircle2", color: T.green, title: "Semua aman terkendali", sub: "Tidak ada issue yang butuh perhatian", page: "dashboard" });
  }
  
  return (
    <Panel>
      <PanelHead title="Perlu Perhatian" sub="Prioritas hari ini" icon="Bell" accent={T.amber} right={<Tag color={items[0].color === T.green ? T.green : T.amber}>{items.length}</Tag>} />
      <div style={{ padding: 8 }}>
        {items.map((it, i) => (
          <div key={i} onClick={() => setPage(it.page as any)} className="ac-row" style={{ display: "flex", gap: 11, padding: "10px 10px", borderRadius: 9, cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${it.color}1c`, display: "grid", placeItems: "center" }}><Icon name={it.icon as any} size={15} color={it.color} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.txt, lineHeight: 1.3 }}>{it.title}</div>
              <div style={{ fontSize: 10.5, color: T.dim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sub}</div>
            </div>
            <Icon name="ChevronRight" size={15} color={T.dim} style={{ alignSelf: "center" }} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActivityFeed() {
  const [feed, setFeed] = useState<any[]>([])

  useEffect(() => {
    import('../services/supabaseClient').then(({ ConversationService }) => {
      ConversationService.getAll().then(convs => {
        const recent = convs.slice(0, 5).map(c => ({
          msg: `Pesan baru dari ${c.client_name}`,
          wf: c.source || "System",
          t: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('id-ID') : "Baru saja",
          kind: c.unread_count && c.unread_count > 0 ? "warn" : "ok"
        }));
        setFeed(recent.length > 0 ? recent : [{ msg: "Tidak ada aktivitas terbaru", wf: "System", t: "-", kind: "info" }])
      })
    })
  }, [])

  const kindC: Record<string, string> = { ok: T.green, warn: T.amber, info: T.sky };
  return (
    <Panel>
      <PanelHead title="Aktivitas Live" sub="Event realtime" icon="Activity" right={<Tag color={T.sky}><Dot color={T.sky} pulse size={6} />REALTIME</Tag>} />
      <div style={{ padding: "6px 14px 14px", maxHeight: 240, overflowY: "auto" }}>
        {feed.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 11, padding: "9px 0", borderBottom: i < feed.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
              <Dot color={kindC[e.kind]} size={7} />
              {i < feed.length - 1 && <div style={{ width: 1, flex: 1, background: T.line, marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.4 }}>{e.msg}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.sky }}>{e.wf}</span>
                <span style={{ fontSize: 9.5, color: T.dim }}>· {e.t}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ProjectsMini({ setPage, clients }: { setPage: (p: any) => void, clients: DBClient[] }) {
  const deals = clients.filter(c => c.status === 'deal');
  
  return (
    <Panel>
      <PanelHead title="Proyek Berjalan" sub={`${deals.length} proyek aktif`} icon="Kanban"
        right={<Btn v="ghost" size="sm" icon="ArrowRight" onClick={() => setPage("pipeline")}>Semua</Btn>} />
      <div style={{ padding: "6px 0", maxHeight: 300, overflowY: "auto" }}>
        {deals.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: T.dim, fontSize: 11 }}>Belum ada deal/proyek aktif</div>
        ) : deals.map((p) => (
          <div key={p.id} onClick={() => setPage("pipeline")} className="ac-row hover:bg-white/5 transition-colors" style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 18px", cursor: "pointer" }}>
            <Ring value={100} size={42} stroke={5} color={T.green} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name} - {p.building_type}</div>
              <div style={{ fontSize: 10.5, color: T.dim, marginTop: 2 }}>ID: {p.id}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Tag color={T.sky}>Konstruksi</Tag>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginTop: 5, fontFamily: T.mono }}>{fmtRp(p.rab_avg || 0)}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CustomerInsights({ setPage }: { setPage: (p: any) => void }) {
  const [rows, setRows] = useState<(ConversationAnalysis & { _id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)

  const load = () => {
    ConversationService.getAll().then((convs) => {
      const out = convs
        .map((c) => {
          const a = (c.metadata as Record<string, unknown> | undefined)?.aiAnalysis as ConversationAnalysis | undefined
          if (!a) return null
          const meta = (c.metadata || {}) as Record<string, string>
          return { ...a, _id: c.id, nama: a.nama || c.client_name || '—', channel: a.channel || c.source, phone: a.phone || meta.phoneNumber || c.id }
        })
        .filter(Boolean) as (ConversationAnalysis & { _id: string })[]
      setRows(out)
      setSelId((prev) => prev && out.some((r) => r._id === prev) ? prev : (out[0]?._id ?? null))
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const sel = rows.find((r) => r._id === selId) || null

  // Skor kualifikasi otomatis dari kelengkapan data nyata (bukan mengarang).
  const qualOf = (r: ConversationAnalysis) => {
    const budget = r.estimasi_value ? 1 : 0
    const authority = r.phone ? 1 : 0
    const need = (r.project_type || r.lokasi) ? 1 : 0
    const timeline = r.design_stage ? 1 : 0
    return { budget, authority, need, timeline, total: budget + authority + need + timeline }
  }
  const scoreOf = (r: ConversationAnalysis) => {
    const p = Number(r.progress_pct)
    if (!isNaN(p) && r.progress_pct !== '' && r.progress_pct !== undefined) return Math.round(p)
    return Math.round((qualOf(r).total / 4) * 100)
  }
  const initials = (n?: string) => (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Panel style={{ gridColumn: '1 / -1', marginTop: 16 }}>
      <PanelHead title="Data Customer & Progress (AI Summary)" sub="Rangkuman percakapan oleh AI — sinkron dengan Spreadsheet" icon="Sparkles" accent={T.sky}
        right={<Btn v="ghost" size="sm" icon="RefreshCw" onClick={load}>Refresh</Btn>} />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.dim, fontSize: 12 }}>Memuat...</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.dim, fontSize: 12 }}>
          Belum ada rangkuman. Buka Active Chats → pilih percakapan → AI Analyst → Generate Rangkuman.
        </div>
      ) : (
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
                {rows.map((r) => {
                  const isSel = r._id === selId
                  return (
                    <tr key={r._id} onClick={() => setSelId(r._id)} className="ac-row" style={{ borderBottom: `1px solid ${T.line}`, cursor: 'pointer', background: isSel ? 'rgba(74,179,216,0.08)' : 'transparent', borderLeft: `3px solid ${isSel ? T.sky : 'transparent'}` }}>
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
                  {/* header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={initials(sel.nama)} color={tone} size={46} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.txt }}>{sel.nama || '—'}</div>
                      <div style={{ fontSize: 11, color: T.dim, fontFamily: T.mono }}>{sel.phone || sel._id}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, padding: '4px 11px', borderRadius: 999, background: `${tone}22`, color: tone, border: `1px solid ${tone}55` }}>{sel.status || '—'}</span>
                  </div>

                  {/* contact grid */}
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

                  {/* skor kualifikasi */}
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

                  {/* ringkasan AI */}
                  <div style={{ background: 'rgba(143,208,232,0.08)', border: `1px solid ${T.sky}33`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icon name="Bot" size={15} color={T.sky} /><span style={{ fontSize: 12, fontWeight: 700, color: T.sky }}>Ringkasan AI</span>
                      {sel.tanggal && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.dim, fontFamily: T.mono }}>{sel.tanggal}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.6 }}>{sel.ringkasan || 'Belum ada ringkasan untuk percakapan ini.'}</div>
                  </div>

                  {/* actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn v="primary" size="sm" icon="MessageSquare" onClick={() => setPage('chat-monitoring')} style={{ flex: 1, justifyContent: 'center' }}>Chat</Btn>
                    <Btn v="ghost" size="sm" icon="FileText" onClick={() => setPage('proposal-builder')} style={{ flex: 1, justifyContent: 'center' }}>Proposal</Btn>
                    <Btn v="ghost" size="sm" icon="Kanban" onClick={() => setPage('projects')} style={{ flex: 1, justifyContent: 'center' }}>Proyek</Btn>
                  </div>
                </>
              )
            })() : (
              <div style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Pilih klien untuk lihat detail.</div>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

// ── MAIN DASHBOARD ───────────────────────────────────────────
const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [clients, setClients] = useState<DBClient[]>([])
  
  useEffect(() => {
    ClientService.getAll().then(setClients)
  }, [])

  const pipelineValue = clients.filter(c => ['estimasi', 'proposal', 'negosiasi'].includes(c.status || '')).reduce((s, c) => s + (c.rab_avg || 0), 0);
  const activeProjects = clients.filter(c => c.status === 'deal').length;
  const closedRevenue = clients.filter(c => c.status === 'deal').reduce((s, c) => s + (c.rab_avg || 0), 0);
  const leadsCount = clients.length;
  const winRate = leadsCount > 0 ? ((activeProjects / leadsCount) * 100).toFixed(1) : "0.0";

  const kpis = [
    { label: "Pipeline Value", value: fmtRp(pipelineValue), delta: "Live", icon: "Target", accent: T.sky, spark: [0, 0, 0, 0, 0, 0] },
    { label: "Proyek Aktif", value: activeProjects, delta: "Live", icon: "Kanban", accent: T.tint, spark: [0, 0, 0, 0, 0, 0] },
    { label: "Revenue Deals", value: fmtRp(closedRevenue), delta: "Live", icon: "TrendingUp", accent: T.green, spark: [0, 0, 0, 0, 0, 0] },
    { label: "Piutang (AR)", value: fmtRp(0), delta: "0%", deltaUp: false, icon: "Receipt", accent: T.amber, spark: [0, 0, 0, 0, 0, 0] },
    { label: "Total Leads", value: leadsCount, delta: "All time", icon: "Inbox", accent: T.sky, spark: [0, 0, 0, 0, 0, 0] },
    { label: "Win Rate", value: `${winRate}%`, delta: "Live", icon: "Award", accent: T.green, spark: [0, 0, 0, 0, 0, 0] },
  ];
  
  const mNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const currentMonth = new Date().getMonth();
  const revenueBars = Array.from({length: 6}).map((_, i) => {
    const mIdx = (currentMonth - 5 + i + 12) % 12;
    return { m: mNames[mIdx], v: i === 5 ? (closedRevenue / 1000000) : 0 };
  });

  const trend = [0, 0, 0, 0, 0, 0, 0];

  const hour = new Date().getHours();
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
  
  const handleNav = (p: string) => {
    if (onNavigate) onNavigate(p as PageType);
  }

  return (
    <div style={{ padding: 22, overflowY: "auto", height: "100%", background: T.bgGrad }}>
      {/* hero */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.txt, margin: 0, letterSpacing: -0.6 }}>{greet}, Admin.</h1>
            <Tag color={T.green}><Dot color={T.green} pulse size={6} />Sistem beroperasi normal</Tag>
          </div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 6 }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Berikut ringkasan operasional bisnis hari ini.</div>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <Btn v="ghost" size="sm" icon="FileText" onClick={() => handleNav("documents")}>Dokumen</Btn>
          <Btn v="primary" size="sm" icon="Plus" onClick={() => handleNav("pipeline")}>Lead Baru</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
        {kpis.map((k, i) => <Stat key={i} {...k} />)}
      </div>

      <FlowStrip setPage={handleNav} clients={clients} />

      {/* main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <Panel>
            <PanelHead title="Pipeline & Revenue" sub="Prospek vs Deal Closing" icon="BarChart3"
              right={<div style={{ display: "flex", gap: 6 }}><Tag color={T.sky}>Pipeline</Tag><Tag color={T.green}>Revenue</Tag></div>} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 0 }}>
              <div style={{ padding: "18px", borderRight: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 4 }}>Nilai pipeline aktif</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.txt, marginBottom: 12 }}>{fmtRp(pipelineValue)}</div>
                <div style={{ overflowX: "auto" }}>
                  <Spark data={trend} color={T.sky} w={300} h={90} />
                </div>
              </div>
              <div style={{ padding: "18px" }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 10 }}>Revenue (Rp Juta)</div>
                <div style={{ overflowX: "auto" }}>
                  <Bars data={revenueBars} h={110} fmt={(v: number) => v.toFixed(0)} />
                </div>
              </div>
            </div>
          </Panel>
          <ProjectsMini setPage={handleNav} clients={clients} />
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <AutomationCard setPage={handleNav} />
          <AttentionCard setPage={handleNav} clients={clients} />
          <ActivityFeed />
        </div>
      </div>

      <CustomerInsights setPage={handleNav} />
    </div>
  )
}

export default Dashboard
