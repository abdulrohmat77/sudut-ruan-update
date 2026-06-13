import { useEffect, useMemo, useState } from 'react'
import { T, Panel, Btn, ProgBar } from '../components/AcosUI'
import { PmisProjectService, PmisDeliverableService, DBPmisProject, DBPmisDeliverable } from '../services/supabaseClient'
import { Loader2, Plus, Trash2, Compass } from 'lucide-react'

const PHASES = [
  { key: 'konsep', label: 'Konsep Desain' },
  { key: 'schematic', label: 'Schematic Design' },
  { key: 'dd', label: 'Design Development' },
  { key: 'detail', label: 'Detail Drawing' },
  { key: 'final', label: 'Finalisasi & Serah Terima' },
]

const STATUS_OPT = [
  { key: 'todo', label: 'Belum Mulai', color: T.dim },
  { key: 'in_progress', label: 'Dikerjakan', color: T.sky },
  { key: 'in_review', label: 'Review', color: T.amber },
  { key: 'approved', label: 'Disetujui', color: T.green },
  { key: 'revisi', label: 'Revisi', color: T.red },
]

const DesignMonitoring = () => {
  const [projects, setProjects] = useState<DBPmisProject[]>([])
  const [deliverables, setDeliverables] = useState<DBPmisDeliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [selProject, setSelProject] = useState<string>('')
  const [newTitle, setNewTitle] = useState('')
  const [newPhase, setNewPhase] = useState('konsep')

  const load = async () => {
    setLoading(true)
    const [p, d] = await Promise.all([PmisProjectService.getAll(), PmisDeliverableService.getAll()])
    setProjects(p)
    setDeliverables(d)
    if (p.length > 0 && !selProject) setSelProject(p[0].id)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = deliverables.filter((d) => d.project_id === selProject)
  const grouped = useMemo(() => {
    const m: Record<string, DBPmisDeliverable[]> = {}
    PHASES.forEach((ph) => (m[ph.key] = []))
    filtered.forEach((d) => (m[d.phase_key] ||= []).push(d))
    return m
  }, [filtered])

  const overall = useMemo(() => {
    if (filtered.length === 0) return 0
    return Math.round((filtered.filter((d) => d.status === 'approved').length / filtered.length) * 100)
  }, [filtered])

  const handleAdd = async () => {
    if (!newTitle.trim() || !selProject) return
    await PmisDeliverableService.insert({ project_id: selProject, phase_key: newPhase, title: newTitle.trim() })
    setNewTitle('')
    const d = await PmisDeliverableService.getAll()
    setDeliverables(d)
  }

  const handleStatus = async (id: string, status: string) => {
    await PmisDeliverableService.updateStatus(id, status)
    setDeliverables((prev) => prev.map((d) => d.id === id ? { ...d, status } : d))
  }

  const handleDelete = async (id: string) => {
    await PmisDeliverableService.delete(id)
    setDeliverables((prev) => prev.filter((d) => d.id !== id))
  }

  const inputStyle: React.CSSProperties = { padding: '8px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 12, fontFamily: T.font, outline: 'none' }

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Compass size={22} color={T.sky} /> Design Monitoring
          </h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>Track deliverable per tahap desain — progress otomatis</div>
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
          {/* Overall progress */}
          <Panel pad={16} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>Overall Design Progress</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.sky, fontFamily: T.mono }}>{overall}%</span>
              <span style={{ fontSize: 11, color: T.dim }}>({filtered.filter(d => d.status === 'approved').length}/{filtered.length} disetujui)</span>
            </div>
            <ProgBar value={overall} color={T.sky} h={6} style={{ marginTop: 8 }} />
          </Panel>

          {/* Add deliverable */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select style={{ ...inputStyle, minWidth: 140 }} value={newPhase} onChange={(e) => setNewPhase(e.target.value)}>
              {PHASES.map((ph) => <option key={ph.key} value={ph.key} style={{ background: T.panel }}>{ph.label}</option>)}
            </select>
            <input style={{ ...inputStyle, flex: 1, minWidth: 200 }} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Nama deliverable baru..." />
            <button onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.sky, color: '#03203a', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              <Plus size={14} /> Tambah
            </button>
          </div>

          {/* Phases */}
          {PHASES.map((ph) => {
            const items = grouped[ph.key] || []
            const approved = items.filter((d) => d.status === 'approved').length
            const pct = items.length > 0 ? Math.round((approved / items.length) * 100) : 0
            return (
              <Panel key={ph.key} style={{ marginBottom: 12 }}>
                <div style={{ padding: '14px 16px', borderBottom: items.length > 0 ? `1px solid ${T.line}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>{ph.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProgBar value={pct} color={T.green} h={4} style={{ width: 60 }} />
                    <span style={{ fontSize: 11, fontFamily: T.mono, color: T.dim }}>{approved}/{items.length}</span>
                  </div>
                </div>
                {items.length > 0 && (
                  <div style={{ padding: '8px 16px 14px' }}>
                    {items.map((d) => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.line}` }}>
                        <select
                          value={d.status}
                          onChange={(e) => handleStatus(d.id, e.target.value)}
                          style={{ ...inputStyle, fontSize: 10, padding: '4px 8px', minWidth: 100, color: STATUS_OPT.find(s => s.key === d.status)?.color || T.dim }}
                        >
                          {STATUS_OPT.map((s) => <option key={s.key} value={s.key} style={{ background: T.panel }}>{s.label}</option>)}
                        </select>
                        <span style={{ flex: 1, fontSize: 12, color: d.status === 'approved' ? T.dim : T.txt, textDecoration: d.status === 'approved' ? 'line-through' : 'none' }}>{d.title}</span>
                        <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim }} onMouseEnter={(e) => (e.currentTarget.style.color = T.red)} onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )
          })}
        </>
      )}
    </div>
  )
}

export default DesignMonitoring
