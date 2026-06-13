import React, { useEffect, useMemo, useState } from 'react'
import { T, Icon, Panel, Btn, ProgBar, Tag, Dot } from '../components/AcosUI'
import { PmisProjectService, PmisInvoiceService, DBPmisProject, DBPmisInvoice } from '../services/supabaseClient'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

const fmtIDR = (v: number) => {
  if (!v) return 'Rp 0'
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)} M`
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)} jt`
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(v))}`
}

const statusColor: Record<string, string> = {
  planning: T.dim,
  active: T.sky,
  on_hold: T.amber,
  completed: T.green,
  cancelled: T.red,
}

const ProjectControl: React.FC = () => {
  const [projects, setProjects] = useState<DBPmisProject[]>([])
  const [invoices, setInvoices] = useState<DBPmisInvoice[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [p, i] = await Promise.all([PmisProjectService.getAll(), PmisInvoiceService.getAll()])
    setProjects(p)
    setInvoices(i)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // KPIs
  const totalProjects = projects.length
  const totalContractValue = projects.reduce((s, p) => s + (Number(p.contract_value) || 0), 0)
  const avgProgress = totalProjects > 0 ? projects.reduce((s, p) => s + (Number(p.progress_percent) || 0), 0) / totalProjects : 0
  const outstandingAR = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (Number(i.amount) || 0) + (Number(i.tax_amount) || 0), 0)

  // Needs attention
  const overdue = projects.filter((p) => p.end_date && new Date(p.end_date) < new Date() && p.status === 'active')
  const lagProjects = projects.filter((p) => (Number(p.planned_progress) - Number(p.progress_percent)) > 15)
  const invoicesDue = invoices.filter((i) => {
    if (i.status === 'paid') return false
    if (!i.due_date) return false
    const diff = (new Date(i.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff <= 7 && diff >= 0
  })

  // Cashflow trend (6 months)
  const cashflowData = useMemo(() => {
    const now = new Date()
    const months: { label: string; inflow: number; outflow: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      const mStart = d.getTime()
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime()
      const inflow = invoices
        .filter((inv) => inv.paid_date && new Date(inv.paid_date).getTime() >= mStart && new Date(inv.paid_date).getTime() <= mEnd)
        .reduce((s, inv) => s + (Number(inv.amount) || 0), 0)
      months.push({ label, inflow, outflow: 0 })
    }
    return months
  }, [invoices])

  // S-Curve (portfolio avg)
  const planned = totalProjects > 0 ? projects.reduce((s, p) => s + (Number(p.planned_progress) || 0), 0) / totalProjects : 0
  const actual = avgProgress

  // Status breakdown for pie
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [projects])

  // Top contracts bar
  const contractBars = useMemo(() => {
    return [...projects]
      .sort((a, b) => (Number(b.contract_value) || 0) - (Number(a.contract_value) || 0))
      .slice(0, 10)
      .map((p) => ({ code: p.code, value: Number(p.contract_value) || 0 }))
  }, [projects])

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0 }}>Executive Dashboard</h1>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Portfolio health · Data dari Supabase · Last updated {new Date().toLocaleTimeString('id-ID')}</div>
        </div>
        <Btn v="ghost" size="sm" icon="RefreshCw" onClick={load}>Refresh</Btn>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: T.dim, fontSize: 13 }}>Memuat data proyek...</div>
      ) : (
        <>
          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KpiCard label="Total Project" value={String(totalProjects)} sub={`Burn ${avgProgress.toFixed(0)}%`} icon="FolderKanban" />
            <KpiCard label="Nilai Kontrak" value={fmtIDR(totalContractValue)} sub={`Paid: ${fmtIDR(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0))}`} icon="Wallet" />
            <KpiCard label="Outstanding AR" value={fmtIDR(outstandingAR)} sub={`${invoices.filter(i => i.status !== 'paid').length} invoice belum lunas`} icon="TrendingUp" />
            <KpiCard label="Avg Progress" value={`${avgProgress.toFixed(0)}%`} sub="Portfolio average" icon="Activity" progress={avgProgress} />
          </div>

          {/* Needs Attention */}
          <Panel pad={16} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="AlertTriangle" size={16} color={T.amber} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>Needs Attention</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <AlertCard label="Project Overdue" count={overdue.length} color={T.red} />
              <AlertCard label="Progress Lag >15%" count={lagProjects.length} color={T.amber} />
              <AlertCard label="Invoice Due ≤7d" count={invoicesDue.length} color={T.amber} />
            </div>
          </Panel>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Cashflow Trend */}
            <Panel pad={16}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 12 }}>Cashflow Trend (6 bulan)</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData}>
                    <defs>
                      <linearGradient id="gInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T.sky} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={T.sky} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line} />
                    <XAxis dataKey="label" fontSize={10} stroke={T.dim} />
                    <YAxis fontSize={10} stroke={T.dim} tickFormatter={(v) => fmtIDR(Number(v))} />
                    <Tooltip formatter={(v: any) => fmtIDR(Number(v))} contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, color: T.txt, fontSize: 11 }} />
                    <Area type="monotone" dataKey="inflow" name="Inflow" stroke={T.sky} fill="url(#gInflow)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* S-Curve Progress */}
            <Panel pad={16}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 12 }}>S-Curve Progress (portfolio avg)</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, height: 200 }}>
                <Gauge label="Planned" value={planned} color={T.dim} />
                <Gauge label="Actual" value={actual} color={T.sky} />
                <div style={{ fontSize: 12, color: T.dim, maxWidth: 150, lineHeight: 1.5 }}>
                  <div style={{ marginBottom: 6 }}>Selisih: <strong style={{ color: (actual - planned) >= 0 ? T.green : T.red }}>{(actual - planned).toFixed(1)}%</strong></div>
                  <div style={{ fontSize: 10.5 }}>Negatif = di belakang jadwal. Klik project di tabel untuk drill-down.</div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Contract Bars + Status Pie */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
            {contractBars.length > 0 && (
              <Panel pad={16}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 12 }}>Top 10 Nilai Kontrak per Project</div>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contractBars} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.line} />
                      <XAxis type="number" fontSize={10} stroke={T.dim} tickFormatter={(v) => fmtIDR(Number(v))} />
                      <YAxis type="category" dataKey="code" fontSize={10} stroke={T.dim} width={55} />
                      <Tooltip formatter={(v: any) => fmtIDR(Number(v))} contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, color: T.txt, fontSize: 11 }} />
                      <Bar dataKey="value" fill={T.sky} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}

            {pieData.length > 0 && (
              <Panel pad={16}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 12 }}>Status Breakdown</div>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                        {pieData.map((d) => <Cell key={d.name} fill={statusColor[d.name] || T.dim} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, color: T.txt, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}
          </div>

          {/* Portfolio Table */}
          <Panel style={{ marginBottom: 20 }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>Portfolio Project</span>
              <Tag color={T.sky}>{projects.length} proyek</Tag>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead style={{ borderBottom: `1px solid ${T.line}` }}>
                  <tr>
                    {['Kode', 'Nama Proyek', 'Client', 'Status', 'Nilai Kontrak', 'Progress'].map((h, i) => (
                      <th key={h} style={{ padding: '11px 14px', fontSize: 9.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: i >= 4 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Belum ada project. Jalankan SQL <code>pmis_projects.sql</code> lalu tambahkan data.</td></tr>
                  ) : projects.map((p) => (
                    <tr key={p.id} className="ac-row" style={{ borderBottom: `1px solid ${T.line}` }}>
                      <td style={{ padding: '11px 14px', fontFamily: T.mono, fontSize: 11, color: T.dim }}>{p.code}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.txt }}>{p.name}</div>
                        {p.location && <div style={{ fontSize: 10, color: T.dim }}>{p.location}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: T.sub }}>{p.client_name || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: `${statusColor[p.status] || T.dim}22`, color: statusColor[p.status] || T.dim, border: `1px solid ${statusColor[p.status] || T.dim}55` }}>{p.status}</span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: T.mono, textAlign: 'right', color: T.txt }}>{fmtIDR(Number(p.contract_value) || 0)}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <ProgBar value={Number(p.progress_percent) || 0} color={T.sky} h={5} style={{ width: 60 }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.txt, fontFamily: T.mono }}>{Number(p.progress_percent).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, progress }: { label: string; value: string; sub: string; icon: string; progress?: number }) {
  return (
    <Panel pad={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.7 }}>{label}</span>
        <Icon name={icon} size={16} color={T.dim} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.txt, fontFamily: T.mono }}>{value}</div>
      {progress !== undefined && <ProgBar value={progress} color={T.sky} h={4} style={{ marginTop: 8 }} />}
      <div style={{ fontSize: 10.5, color: T.dim, marginTop: 6 }}>{sub}</div>
    </Panel>
  )
}

function AlertCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 10 }}>
      <Dot color={color} pulse={count > 0} size={8} />
      <div>
        <div style={{ fontSize: 9.5, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: count > 0 ? color : T.txt }}>{count}</div>
      </div>
    </div>
  )
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.min(100, Math.max(0, value))
  const r = 46
  const c = 2 * Math.PI * r
  const off = c - (v / 100) * c
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke={T.line} strokeWidth="8" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 55 55)" />
        <text x="55" y="60" textAnchor="middle" fontSize="18" fontWeight="700" fill={T.txt}>{v.toFixed(0)}%</text>
      </svg>
      <div style={{ fontSize: 11, color: T.dim, marginTop: -4 }}>{label}</div>
    </div>
  )
}

export default ProjectControl
