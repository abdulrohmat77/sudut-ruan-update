import { useEffect, useMemo, useState } from 'react'
import { T, Bars } from '../components/AcosUI'
import { ClientService, DBClient, DocumentService, DBDocument } from '../services/supabaseClient'
import {
  FolderKanban, Loader2, RefreshCw, ListTodo, Wallet, Plus, Trash2, CheckCircle2, Circle,
} from 'lucide-react'

// ── Pipeline lifecycle (mengikuti alur build-space-ai: Lead → … → Selesai) ──
interface Stage {
  key: string
  label: string
  color: string
  match: string[]
}

const STAGES: Stage[] = [
  { key: 'lead', label: 'Lead', color: '#9DBAD2', match: ['lead', 'baru', 'new'] },
  { key: 'estimasi', label: 'Estimasi', color: '#4AB3D8', match: ['estimasi', 'estimation', 'qualified'] },
  { key: 'proposal', label: 'Proposal', color: '#5FD4FF', match: ['proposal'] },
  { key: 'negosiasi', label: 'Negosiasi', color: '#FBBF24', match: ['negosiasi', 'negotiation'] },
  { key: 'spk', label: 'SPK / Kontrak', color: '#A78BFA', match: ['spk', 'kontrak', 'approved', 'deal', 'won'] },
  { key: 'berjalan', label: 'Berjalan', color: '#34D399', match: ['berjalan', 'design', 'construction', 'progress', 'project'] },
  { key: 'selesai', label: 'Selesai', color: '#16a34a', match: ['selesai', 'completed', 'done'] },
]

const formatIDRShort = (n: number) => {
  if (!n) return 'Rp 0'
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)} M`
  if (n >= 1e6) return `Rp ${Math.round(n / 1e6)} jt`
  if (n >= 1e3) return `Rp ${Math.round(n / 1e3)} rb`
  return `Rp ${n}`
}
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0)

const stageOf = (status: string | null): string => {
  const s = (status || '').toLowerCase().trim()
  const found = STAGES.find((st) => st.match.some((m) => s.includes(m)))
  return found ? found.key : 'lead'
}

const amountOf = (doc: DBDocument): number => {
  const d = (doc.data || {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0)
  return num(d.total) || num(d.amount) || num(d.totalAvg) || num(d.contractValue) || 0
}

// ── Tasks (disimpan lokal — tidak butuh tabel Supabase) ──
interface Task {
  id: string
  title: string
  done: boolean
  project: string
  createdAt: string
}
const TASKS_KEY = 'sra_project_tasks'
const loadTasks = (): Task[] => {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]')
  } catch {
    return []
  }
}

type Tab = 'board' | 'tasks' | 'revenue'

const Projects = () => {
  const [clients, setClients] = useState<DBClient[]>([])
  const [invoices, setInvoices] = useState<DBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('board')

  // tasks
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks())
  const [newTask, setNewTask] = useState('')
  const [newTaskProject, setNewTaskProject] = useState('')

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  }, [tasks])

  const load = async () => {
    setLoading(true)
    const [c, docs] = await Promise.all([ClientService.getAll(), DocumentService.getAll()])
    setClients(c)
    setInvoices(docs.filter((d) => d.type === 'invoice'))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const grouped = useMemo(() => {
    const g: Record<string, DBClient[]> = {}
    STAGES.forEach((s) => (g[s.key] = []))
    clients.forEach((c) => {
      const key = stageOf(c.status)
      ;(g[key] || g.lead).push(c)
    })
    return g
  }, [clients])

  const totalValue = useMemo(() => clients.reduce((sum, c) => sum + (c.rab_avg || c.fee_avg || 0), 0), [clients])

  // ── Revenue calc ──
  const revenue = useMemo(() => {
    let total = 0
    let paid = 0
    invoices.forEach((d) => {
      if (d.status === 'rejected') return
      const a = amountOf(d)
      total += a
      if (d.status === 'accepted') paid += a
    })
    // monthly paid (6 bulan terakhir)
    const now = new Date()
    const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const months: { key: string; m: string; v: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${dt.getFullYear()}-${dt.getMonth()}`, m: BULAN[dt.getMonth()], v: 0 })
    }
    invoices.forEach((d) => {
      if (d.status !== 'accepted') return
      const dt = new Date(d.created_at)
      const key = `${dt.getFullYear()}-${dt.getMonth()}`
      const bucket = months.find((mo) => mo.key === key)
      if (bucket) bucket.v += Math.round(amountOf(d) / 1e6)
    })
    return { total, paid, outstanding: total - paid, months }
  }, [invoices])

  const activeProjects = useMemo(
    () => clients.filter((c) => ['spk', 'berjalan'].includes(stageOf(c.status))).length,
    [clients],
  )

  const addTask = () => {
    const title = newTask.trim()
    if (!title) return
    setTasks((prev) => [
      { id: `t-${Date.now()}`, title, done: false, project: newTaskProject.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ])
    setNewTask('')
    setNewTaskProject('')
  }
  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id))

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'board', label: 'Papan Proyek', icon: <FolderKanban size={16} /> },
    { id: 'tasks', label: 'Tugas', icon: <ListTodo size={16} /> },
    { id: 'revenue', label: 'Pendapatan', icon: <Wallet size={16} /> },
  ]

  const taskDoneCount = tasks.filter((t) => t.done).length

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: T.bgGrad }}>
      {/* Header */}
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.txt, margin: 0, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderKanban size={22} color={T.sky} /> Projects
          </h1>
          <p style={{ fontSize: 13, color: T.dim, margin: '4px 0 0' }}>
            Papan proyek, tugas, & pendapatan — {clients.length} klien · {formatIDRShort(totalValue)}
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: T.inset, color: T.txt, borderRadius: 10, border: `1px solid ${T.line}`, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.sky)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexShrink: 0 }}>
        {tabs.map((tb) => {
          const on = tab === tb.id
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1px solid ${on ? T.sky : T.line}`, background: on ? `${T.sky}18` : 'transparent', color: on ? T.sky : T.dim, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
            >
              {tb.icon}{tb.label}
              {tb.id === 'tasks' && tasks.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, background: on ? T.sky : T.line, color: on ? '#03203a' : T.dim, padding: '1px 6px', borderRadius: 99 }}>{taskDoneCount}/{tasks.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={26} className="animate-spin" style={{ color: T.sky }} />
        </div>
      ) : tab === 'board' ? (
        // ── PAPAN PROYEK (Kanban) ──
        <div className="custom-scrollbar" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 12, paddingBottom: 8 }}>
          {STAGES.map((stage) => {
            const items = grouped[stage.key] || []
            const colValue = items.reduce((s, c) => s + (c.rab_avg || c.fee_avg || 0), 0)
            const stageIdx = STAGES.findIndex((s) => s.key === stage.key)
            const progress = Math.round(((stageIdx + 1) / STAGES.length) * 100)
            return (
              <div key={stage.key} style={{ minWidth: 268, width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.txt, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stage.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.dim }}>{items.length}</span>
                </div>
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12, padding: 8, minHeight: 120 }}>
                  {items.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: T.dim, fontSize: 11 }}>—</div>
                  ) : (
                    items.map((c) => {
                      const value = c.rab_avg || c.fee_avg || 0
                      return (
                        <div key={c.id} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 12 }}>
                          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.dim }}>{c.building_type || c.source || 'Klien'}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginTop: 2 }}>{c.name || 'Tanpa nama'}</div>
                          {c.tier && <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>{c.tier}{c.area_sqm ? ` · ${c.area_sqm} m²` : ''}</div>}
                          <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.sky, marginTop: 8 }}>{formatIDRShort(value)}</div>
                          <div style={{ height: 5, borderRadius: 999, background: T.track, overflow: 'hidden', marginTop: 8 }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: stage.color, borderRadius: 999 }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.dim, marginTop: 4 }}>
                            <span>{c.source || '—'}</span><span>{progress}%</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: T.dim, textAlign: 'right', marginTop: 6, paddingRight: 4 }}>{formatIDRShort(colValue)}</div>
              </div>
            )
          })}
        </div>
      ) : tab === 'tasks' ? (
        // ── TUGAS ──
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Add task */}
            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Tugas baru… (mis. Survey lokasi Villa Wijaya)"
                style={{ flex: '2 1 240px', padding: '10px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: T.font, outline: 'none' }}
              />
              <input
                value={newTaskProject}
                onChange={(e) => setNewTaskProject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Proyek (opsional)"
                style={{ flex: '1 1 140px', padding: '10px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: T.font, outline: 'none' }}
              />
              <button
                onClick={addTask}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: T.sky, color: '#03203a', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                <Plus size={16} /> Tambah
              </button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 40, textAlign: 'center', color: T.dim, fontSize: 13 }}>
                <ListTodo size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                Belum ada tugas. Tambahkan tugas pertama di atas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 14px' }}>
                    <button onClick={() => toggleTask(t.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: t.done ? T.green : T.dim }}>
                      {t.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.done ? T.dim : T.txt, textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
                      {t.project && <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>{t.project}</div>}
                    </div>
                    <button onClick={() => removeTask(t.id)} title="Hapus" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.dim, display: 'flex' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ── PENDAPATAN ──
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Total Nilai Proyek', value: formatIDR(totalValue), color: T.sky },
                { label: 'Pendapatan Terbayar', value: formatIDR(revenue.paid), color: T.green },
                { label: 'Outstanding', value: formatIDR(revenue.outstanding), color: T.amber },
                { label: 'Proyek Aktif', value: String(activeProjects), color: T.tint },
              ].map((k) => (
                <div key={k.label} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginTop: 8, letterSpacing: -0.5, fontFamily: T.mono }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 14 }}>Pendapatan Terbayar — 6 Bulan (juta Rp)</div>
              <Bars data={revenue.months} h={160} fmt={(v: number) => `${v}`} />
            </div>

            {/* Nilai per tahap */}
            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 14 }}>Nilai Pipeline per Tahap</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STAGES.map((s) => {
                  const items = grouped[s.key] || []
                  const v = items.reduce((sum, c) => sum + (c.rab_avg || c.fee_avg || 0), 0)
                  const pct = totalValue > 0 ? Math.round((v / totalValue) * 100) : 0
                  return (
                    <div key={s.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                        <span style={{ color: T.sub, fontWeight: 600 }}>{s.label} <span style={{ color: T.dim }}>· {items.length}</span></span>
                        <span style={{ fontFamily: T.mono, color: T.txt }}>{formatIDRShort(v)}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: T.track, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 999 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects
