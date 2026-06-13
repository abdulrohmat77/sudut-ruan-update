import { useEffect, useState } from 'react'
import { T, Panel, Btn, ProgBar } from '../components/AcosUI'
import {
  PmisProjectService, PmisDailyReportService, PmisWeeklyReportService, PmisMonthlyReportService,
  DBPmisProject, DBPmisDailyReport, DBPmisWeeklyReport, DBPmisMonthlyReport,
} from '../services/supabaseClient'
import { FileText, Loader2, Plus, Download } from 'lucide-react'
import jsPDF from 'jspdf'

type ReportTab = 'daily' | 'weekly' | 'monthly'

const Reporting = () => {
  const [tab, setTab] = useState<ReportTab>('daily')
  const [projects, setProjects] = useState<DBPmisProject[]>([])
  const [daily, setDaily] = useState<DBPmisDailyReport[]>([])
  const [weekly, setWeekly] = useState<DBPmisWeeklyReport[]>([])
  const [monthly, setMonthly] = useState<DBPmisMonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selProject, setSelProject] = useState<string>('all')

  // Add modals
  const [showAddDaily, setShowAddDaily] = useState(false)
  const [showAddWeekly, setShowAddWeekly] = useState(false)
  const [showAddMonthly, setShowAddMonthly] = useState(false)
  const [saving, setSaving] = useState(false)

  // Daily form
  const [dForm, setDForm] = useState({ project_id: '', report_date: new Date().toISOString().slice(0, 10), weather: '', manpower_count: '', progress_percent: '', work_summary: '', issues: '', next_day_plan: '' })
  // Weekly form
  const [wForm, setWForm] = useState({ project_id: '', week_start: '', week_end: '', summary: '', planned_progress: '', actual_progress: '' })
  // Monthly form
  const [mForm, setMForm] = useState({ project_id: '', month: new Date().toISOString().slice(0, 7), executive_summary: '' })

  const load = async () => {
    setLoading(true)
    const [p, d, w, m] = await Promise.all([
      PmisProjectService.getAll(),
      PmisDailyReportService.getAll(),
      PmisWeeklyReportService.getAll(),
      PmisMonthlyReportService.getAll(),
    ])
    setProjects(p)
    setDaily(d)
    setWeekly(w)
    setMonthly(m)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || '—'

  const filteredDaily = selProject === 'all' ? daily : daily.filter((r) => r.project_id === selProject)
  const filteredWeekly = selProject === 'all' ? weekly : weekly.filter((r) => r.project_id === selProject)
  const filteredMonthly = selProject === 'all' ? monthly : monthly.filter((r) => r.project_id === selProject)

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { draft: T.dim, submitted: T.sky, approved: T.green, rejected: T.red }
    return <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, background: `${colors[s] || T.dim}22`, color: colors[s] || T.dim, border: `1px solid ${colors[s] || T.dim}55` }}>{s}</span>
  }

  // ── Handlers ──
  const handleAddDaily = async () => {
    if (!dForm.project_id || !dForm.report_date || saving) return
    setSaving(true)
    await PmisDailyReportService.insert({
      project_id: dForm.project_id,
      report_date: dForm.report_date,
      weather: dForm.weather || null,
      manpower_count: Number(dForm.manpower_count) || 0,
      work_summary: dForm.work_summary || null,
      issues: dForm.issues || null,
      next_day_plan: dForm.next_day_plan || null,
      progress_percent: Number(dForm.progress_percent) || null,
      status: 'draft',
    })
    setDForm({ project_id: '', report_date: new Date().toISOString().slice(0, 10), weather: '', manpower_count: '', progress_percent: '', work_summary: '', issues: '', next_day_plan: '' })
    setShowAddDaily(false)
    setSaving(false)
    load()
  }

  const handleAddWeekly = async () => {
    if (!wForm.project_id || !wForm.week_start || !wForm.week_end || saving) return
    setSaving(true)
    const planned = Number(wForm.planned_progress) || 0
    const actual = Number(wForm.actual_progress) || 0
    await PmisWeeklyReportService.insert({
      project_id: wForm.project_id,
      week_start: wForm.week_start,
      week_end: wForm.week_end,
      summary: wForm.summary || null,
      planned_progress: planned,
      actual_progress: actual,
      variance: actual - planned,
      status: 'draft',
    })
    setWForm({ project_id: '', week_start: '', week_end: '', summary: '', planned_progress: '', actual_progress: '' })
    setShowAddWeekly(false)
    setSaving(false)
    load()
  }

  const handleAddMonthly = async () => {
    if (!mForm.project_id || !mForm.month || saving) return
    setSaving(true)
    await PmisMonthlyReportService.insert({
      project_id: mForm.project_id,
      month: mForm.month + '-01',
      executive_summary: mForm.executive_summary || null,
      financial_summary: {},
      schedule_summary: {},
      status: 'draft',
    })
    setMForm({ project_id: '', month: new Date().toISOString().slice(0, 7), executive_summary: '' })
    setShowAddMonthly(false)
    setSaving(false)
    load()
  }

  // ── Export PDF ──
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const title = tab === 'daily' ? 'Daily Report' : tab === 'weekly' ? 'Weekly Report' : 'Monthly Report'
    const data = tab === 'daily' ? filteredDaily : tab === 'weekly' ? filteredWeekly : filteredMonthly

    doc.setFontSize(18)
    doc.text(`${title} — Sudut Ruang Arsitek`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} · ${data.length} laporan`, 14, 28)

    let y = 36

    if (tab === 'daily') {
      (data as DBPmisDailyReport[]).forEach((r, i) => {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${i + 1}. ${r.report_date} — ${projectName(r.project_id)}`, 14, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`Cuaca: ${r.weather || '-'} | Manpower: ${r.manpower_count} | Progress: ${r.progress_percent ?? 0}%`, 14, y); y += 5
        if (r.work_summary) { const lines = doc.splitTextToSize(`Pekerjaan: ${r.work_summary}`, 180); doc.text(lines, 14, y); y += lines.length * 4 }
        if (r.issues) { const lines = doc.splitTextToSize(`Isu: ${r.issues}`, 180); doc.text(lines, 14, y); y += lines.length * 4 }
        if (r.next_day_plan) { const lines = doc.splitTextToSize(`Rencana esok: ${r.next_day_plan}`, 180); doc.text(lines, 14, y); y += lines.length * 4 }
        y += 4
      })
    } else if (tab === 'weekly') {
      (data as DBPmisWeeklyReport[]).forEach((r, i) => {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${i + 1}. ${r.week_start} — ${r.week_end} · ${projectName(r.project_id)}`, 14, y); y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`Planned: ${r.planned_progress ?? 0}% | Actual: ${r.actual_progress ?? 0}% | Variance: ${r.variance ?? 0}%`, 14, y); y += 5
        if (r.summary) { const lines = doc.splitTextToSize(r.summary, 180); doc.text(lines, 14, y); y += lines.length * 4 }
        y += 4
      })
    } else {
      (data as DBPmisMonthlyReport[]).forEach((r, i) => {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${i + 1}. ${r.month} · ${projectName(r.project_id)}`, 14, y); y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        if (r.executive_summary) { const lines = doc.splitTextToSize(r.executive_summary, 180); doc.text(lines, 14, y); y += lines.length * 4 }
        y += 4
      })
    }

    doc.save(`${title.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: T.font, outline: 'none' }

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'daily', label: 'Daily Report' },
    { id: 'weekly', label: 'Weekly Report' },
    { id: 'monthly', label: 'Monthly Report' },
  ]

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={22} color={T.sky} /> Reporting
          </h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>Buat & lihat laporan harian, mingguan, bulanan. Bisa export PDF.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn v="ghost" size="sm" icon="RefreshCw" onClick={load}>Refresh</Btn>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter + Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${tab === t.id ? T.sky : T.line}`, background: tab === t.id ? `${T.sky}18` : 'transparent', color: tab === t.id ? T.sky : T.dim, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{t.label}</button>
        ))}
        <select style={{ ...inputStyle, width: 'auto', minWidth: 160, marginLeft: 'auto' }} value={selProject} onChange={(e) => setSelProject(e.target.value)}>
          <option value="all" style={{ background: T.panel }}>Semua Proyek</option>
          {projects.map((p) => <option key={p.id} value={p.id} style={{ background: T.panel }}>{p.code} — {p.name}</option>)}
        </select>
        <button
          onClick={() => tab === 'daily' ? setShowAddDaily(true) : tab === 'weekly' ? setShowAddWeekly(true) : setShowAddMonthly(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.sky, color: '#03203a', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
        >
          <Plus size={14} /> Tambah {tab === 'daily' ? 'Daily' : tab === 'weekly' ? 'Weekly' : 'Monthly'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={24} className="animate-spin" style={{ color: T.sky }} /></div>
      ) : tab === 'daily' ? (
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead style={{ borderBottom: `1px solid ${T.line}` }}>
                <tr>
                  {['Tanggal', 'Proyek', 'Cuaca', 'Manpower', 'Pekerjaan', 'Progress', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', fontSize: 9.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDaily.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Belum ada daily report. Klik "+ Tambah Daily" untuk mulai.</td></tr>
                ) : filteredDaily.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.txt, fontFamily: T.mono, whiteSpace: 'nowrap' }}>{r.report_date}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.sub }}>{projectName(r.project_id)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.dim }}>{r.weather || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.txt }}>{r.manpower_count}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11.5, color: T.sub, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.work_summary || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ProgBar value={Number(r.progress_percent) || 0} color={T.sky} h={4} style={{ width: 50 }} />
                        <span style={{ fontSize: 11, fontFamily: T.mono, color: T.txt }}>{r.progress_percent ?? 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : tab === 'weekly' ? (
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead style={{ borderBottom: `1px solid ${T.line}` }}>
                <tr>
                  {['Minggu', 'Proyek', 'Ringkasan', 'Planned', 'Actual', 'Variance', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', fontSize: 9.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredWeekly.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Belum ada weekly report.</td></tr>
                ) : filteredWeekly.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.txt, fontFamily: T.mono, whiteSpace: 'nowrap' }}>{r.week_start} — {r.week_end}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.sub }}>{projectName(r.project_id)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11.5, color: T.sub, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: T.mono, color: T.dim }}>{r.planned_progress ?? 0}%</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: T.mono, color: T.sky }}>{r.actual_progress ?? 0}%</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: T.mono, color: (Number(r.variance) || 0) >= 0 ? T.green : T.red }}>{r.variance ?? 0}%</td>
                    <td style={{ padding: '10px 14px' }}>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead style={{ borderBottom: `1px solid ${T.line}` }}>
                <tr>
                  {['Bulan', 'Proyek', 'Executive Summary', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', fontSize: 9.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Belum ada monthly report.</td></tr>
                ) : filteredMonthly.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.txt, fontFamily: T.mono }}>{r.month}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.sub }}>{projectName(r.project_id)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11.5, color: T.sub, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.executive_summary || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── Add Daily Report Modal ── */}
      {showAddDaily && (
        <Modal title="Daily Report Baru" onClose={() => setShowAddDaily(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Project</label>
              <select style={inputStyle} value={dForm.project_id} onChange={(e) => setDForm({ ...dForm, project_id: e.target.value })}>
                <option value="" style={{ background: T.panel }}>Pilih project</option>
                {projects.map((p) => <option key={p.id} value={p.id} style={{ background: T.panel }}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Tanggal</label><input type="date" style={inputStyle} value={dForm.report_date} onChange={(e) => setDForm({ ...dForm, report_date: e.target.value })} /></div>
              <div><label style={labelStyle}>Cuaca</label><input style={inputStyle} value={dForm.weather} onChange={(e) => setDForm({ ...dForm, weather: e.target.value })} placeholder="Cerah / Hujan" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Manpower</label><input type="number" style={inputStyle} value={dForm.manpower_count} onChange={(e) => setDForm({ ...dForm, manpower_count: e.target.value })} /></div>
              <div><label style={labelStyle}>Progress %</label><input type="number" style={inputStyle} value={dForm.progress_percent} onChange={(e) => setDForm({ ...dForm, progress_percent: e.target.value })} /></div>
            </div>
            <div><label style={labelStyle}>Pekerjaan Hari Ini</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={dForm.work_summary} onChange={(e) => setDForm({ ...dForm, work_summary: e.target.value })} /></div>
            <div><label style={labelStyle}>Isu / Kendala</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={dForm.issues} onChange={(e) => setDForm({ ...dForm, issues: e.target.value })} /></div>
            <div><label style={labelStyle}>Rencana Esok</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={dForm.next_day_plan} onChange={(e) => setDForm({ ...dForm, next_day_plan: e.target.value })} /></div>
            <button onClick={handleAddDaily} disabled={saving || !dForm.project_id} style={submitBtnStyle(saving)}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </Modal>
      )}

      {/* ── Add Weekly Report Modal ── */}
      {showAddWeekly && (
        <Modal title="Weekly Report Baru" onClose={() => setShowAddWeekly(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Project</label>
              <select style={inputStyle} value={wForm.project_id} onChange={(e) => setWForm({ ...wForm, project_id: e.target.value })}>
                <option value="" style={{ background: T.panel }}>Pilih project</option>
                {projects.map((p) => <option key={p.id} value={p.id} style={{ background: T.panel }}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Minggu Mulai</label><input type="date" style={inputStyle} value={wForm.week_start} onChange={(e) => setWForm({ ...wForm, week_start: e.target.value })} /></div>
              <div><label style={labelStyle}>Minggu Akhir</label><input type="date" style={inputStyle} value={wForm.week_end} onChange={(e) => setWForm({ ...wForm, week_end: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Planned Progress %</label><input type="number" style={inputStyle} value={wForm.planned_progress} onChange={(e) => setWForm({ ...wForm, planned_progress: e.target.value })} /></div>
              <div><label style={labelStyle}>Actual Progress %</label><input type="number" style={inputStyle} value={wForm.actual_progress} onChange={(e) => setWForm({ ...wForm, actual_progress: e.target.value })} /></div>
            </div>
            <div><label style={labelStyle}>Ringkasan</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={wForm.summary} onChange={(e) => setWForm({ ...wForm, summary: e.target.value })} /></div>
            <button onClick={handleAddWeekly} disabled={saving || !wForm.project_id} style={submitBtnStyle(saving)}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </Modal>
      )}

      {/* ── Add Monthly Report Modal ── */}
      {showAddMonthly && (
        <Modal title="Monthly Report Baru" onClose={() => setShowAddMonthly(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Project</label>
              <select style={inputStyle} value={mForm.project_id} onChange={(e) => setMForm({ ...mForm, project_id: e.target.value })}>
                <option value="" style={{ background: T.panel }}>Pilih project</option>
                {projects.map((p) => <option key={p.id} value={p.id} style={{ background: T.panel }}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Bulan</label><input type="month" style={inputStyle} value={mForm.month} onChange={(e) => setMForm({ ...mForm, month: e.target.value })} /></div>
            <div><label style={labelStyle}>Executive Summary</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={mForm.executive_summary} onChange={(e) => setMForm({ ...mForm, executive_summary: e.target.value })} /></div>
            <button onClick={handleAddMonthly} disabled={saving || !mForm.project_id} style={submitBtnStyle(saving)}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Shared styles & components ──
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }
const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: T.sky, color: '#03203a', fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, marginTop: 4 })

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: T.txt, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.dim, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Reporting
