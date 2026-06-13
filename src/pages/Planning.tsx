import { useEffect, useMemo, useState } from 'react'
import { T, Panel, Btn, ProgBar } from '../components/AcosUI'
import { PmisProjectService, PmisTaskService, DBPmisProject, DBPmisTask } from '../services/supabaseClient'
import { Loader2, Plus, Trash2, CalendarRange } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const STATUS_OPT = [
  { key: 'todo', label: 'Not Started', color: T.dim },
  { key: 'in_progress', label: 'In Progress', color: T.sky },
  { key: 'done', label: 'Completed', color: T.green },
]

const Planning = () => {
  const [projects, setProjects] = useState<DBPmisProject[]>([])
  const [tasks, setTasks] = useState<DBPmisTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selProject, setSelProject] = useState<string>('')
  const [newTask, setNewTask] = useState('')

  const load = async () => {
    setLoading(true)
    const [p, t] = await Promise.all([PmisProjectService.getAll(), PmisTaskService.getAll()])
    setProjects(p)
    setTasks(t)
    if (p.length > 0 && !selProject) setSelProject(p[0].id)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = tasks.filter((t) => t.project_id === selProject)
  const doneCount = filtered.filter((t) => t.status === 'done').length
  const progress = filtered.length > 0 ? Math.round((doneCount / filtered.length) * 100) : 0

  // Simple S-Curve data (simulated based on tasks created/done over time)
  const sCurveData = useMemo(() => {
    if (filtered.length === 0) return []
    // Group by creation week
    const sorted = [...filtered].sort((a, b) => a.created_at.localeCompare(b.created_at))
    const total = sorted.length
    const points: { label: string; planned: number; actual: number }[] = []
    const step = Math.ceil(total / 6) || 1
    for (let i = 0; i < total; i += step) {
      const slice = sorted.slice(0, i + step)
      const planned = Math.round(((i + step) / total) * 100)
      const actual = Math.round((slice.filter((t) => t.status === 'done').length / total) * 100)
      points.push({ label: `W${points.length + 1}`, planned: Math.min(planned, 100), actual: Math.min(actual, 100) })
    }
    return points
  }, [filtered])

  const handleAdd = async () => {
    if (!newTask.trim() || !selProject) return
    await PmisTaskService.insert({ project_id: selProject, title: newTask.trim() })
    setNewTask('')
    const t = await PmisTaskService.getAll()
    setTasks(t)
  }

  const handleStatus = async (id: string, status: 'todo' | 'in_progress' | 'done') => {
    await PmisTaskService.updateStatus(id, status)
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
  }

  const handleDelete = async (id: string) => {
    await PmisTaskService.delete(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const inputStyle: React.CSSProperties = { padding: '8px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 12, fontFamily: T.font, outline: 'none' }

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarRange size={22} color={T.sky} /> Planning & Scheduling
          </h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>WBS Tasks + S-Curve — data dari Supabase</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select style={{ ...inputStyle, minWidth: 180 }} value={selProject} onChange={(e) => setSelProject(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id} style={{ background: T.panel }}>{p.code} — {p.name}</option>)}
          </select>
          <Btn v="ghost" size="sm" icon="RefreshCw" onClick={load}>Refresh</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={24} className="animate-spin" style={{ color: T.sky }} /></div>
      ) : (
        <>
          {/* Progress + S-Curve */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Panel pad={16}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.txt, marginBottom: 8 }}>Task Progress</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: T.sky, fontFamily: T.mono }}>{progress}%</span>
                <span style={{ fontSize: 12, color: T.dim }}>{doneCount}/{filtered.length} selesai</span>
              </div>
              <ProgBar value={progress} color={T.sky} h={8} />
            </Panel>

            {sCurveData.length > 0 && (
              <Panel pad={16}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.txt, marginBottom: 8 }}>S-Curve</div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sCurveData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.line} />
                      <XAxis dataKey="label" fontSize={10} stroke={T.dim} />
                      <YAxis fontSize={10} stroke={T.dim} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, color: T.txt, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="planned" name="Planned" stroke={T.dim} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="actual" name="Actual" stroke={T.sky} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}
          </div>

          {/* Add task */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Tambah task baru..." />
            <button onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.sky, color: '#03203a', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              <Plus size={14} /> Tambah
            </button>
          </div>

          {/* Task list */}
          <Panel>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead style={{ borderBottom: `1px solid ${T.line}` }}>
                  <tr>
                    {['Status', 'Task', 'Progress', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 9.5, fontWeight: 700, color: T.dim, textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: T.dim, fontSize: 12 }}>Belum ada task. Tambahkan di atas.</td></tr>
                  ) : filtered.map((t) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                      <td style={{ padding: '8px 14px' }}>
                        <select value={t.status} onChange={(e) => handleStatus(t.id, e.target.value as any)} style={{ ...inputStyle, fontSize: 10, padding: '4px 8px', minWidth: 100, color: STATUS_OPT.find(s => s.key === t.status)?.color || T.dim }}>
                          {STATUS_OPT.map((s) => <option key={s.key} value={s.key} style={{ background: T.panel }}>{s.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 14px', fontSize: 12, color: t.status === 'done' ? T.dim : T.txt, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <ProgBar value={t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : 0} color={t.status === 'done' ? T.green : T.sky} h={4} style={{ width: 60 }} />
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim }} onMouseEnter={(e) => (e.currentTarget.style.color = T.red)} onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}>
                          <Trash2 size={14} />
                        </button>
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

export default Planning
