import { useEffect, useState } from 'react'
import { T, Panel, Btn, ProgBar, Tag } from '../components/AcosUI'
import { PmisProjectService, PmisTaskService, DBPmisProject, DBPmisTask } from '../services/supabaseClient'
import { Plus, Trash2, CheckCircle2, Circle, Loader2, FolderKanban } from 'lucide-react'

const statusColor: Record<string, string> = { planning: T.dim, active: T.sky, on_hold: T.amber, completed: T.green, cancelled: T.red }
const statusLabel: Record<string, string> = { planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Selesai', cancelled: 'Cancelled' }

const fmtRp = (v: number) => {
  if (!v) return 'Rp 0'
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`
  if (v >= 1e6) return `Rp ${Math.round(v / 1e6)}jt`
  return `Rp ${new Intl.NumberFormat('id-ID').format(v)}`
}

const Projects = () => {
  const [projects, setProjects] = useState<DBPmisProject[]>([])
  const [tasks, setTasks] = useState<DBPmisTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selProject, setSelProject] = useState<string | null>(null)

  // Add project form
  const [showAddProject, setShowAddProject] = useState(false)
  const [pForm, setPForm] = useState({ code: '', name: '', client_name: '', location: '', contract_value: '', status: 'active', description: '', owner_name: '', owner_email: '', owner_wa: '' })
  const [savingP, setSavingP] = useState(false)

  // Auto-generate code
  const autoCode = () => {
    const year = new Date().getFullYear()
    const num = String(projects.length + 1).padStart(3, '0')
    return `SRA-${year}-${num}`
  }

  // Add task form
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [savingT, setSavingT] = useState(false)

  const load = async () => {
    setLoading(true)
    const [p, t] = await Promise.all([PmisProjectService.getAll(), PmisTaskService.getAll()])
    setProjects(p)
    setTasks(t)
    if (p.length > 0 && !selProject) setSelProject(p[0].id)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Progress dihitung dari tugas done / total per project
  const progressOf = (projectId: string) => {
    const pt = tasks.filter((t) => t.project_id === projectId)
    if (pt.length === 0) return 0
    return Math.round((pt.filter((t) => t.status === 'done').length / pt.length) * 100)
  }

  const selectedTasks = tasks.filter((t) => t.project_id === selProject)
  const selP = projects.find((p) => p.id === selProject)

  const handleAddProject = async () => {
    if (!pForm.name.trim() || savingP) return
    setSavingP(true)
    const code = pForm.code.trim() || autoCode()
    await PmisProjectService.upsert({
      code,
      name: pForm.name.trim(),
      client_name: pForm.client_name.trim() || null,
      location: pForm.location.trim() || null,
      contract_value: Number(pForm.contract_value) || 0,
      status: pForm.status,
      description: pForm.description.trim() || null,
    } as any)
    setPForm({ code: '', name: '', client_name: '', location: '', contract_value: '', status: 'active', description: '', owner_name: '', owner_email: '', owner_wa: '' })
    setShowAddProject(false)
    setSavingP(false)
    load()
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !selProject || savingT) return
    setSavingT(true)
    await PmisTaskService.insert({ project_id: selProject, title: newTaskTitle.trim() })
    setNewTaskTitle('')
    setSavingT(false)
    // Reload tasks
    const t = await PmisTaskService.getAll()
    setTasks(t)
  }

  const toggleTask = async (task: DBPmisTask) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await PmisTaskService.updateStatus(task.id, newStatus)
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    // Update progress on project
    const pt = tasks.map((t) => t.id === task.id ? { ...t, status: newStatus } : t).filter((t) => t.project_id === task.project_id)
    const pct = pt.length > 0 ? Math.round((pt.filter((t) => t.status === 'done').length / pt.length) * 100) : 0
    const proj = projects.find((p) => p.id === task.project_id)
    if (proj) {
      PmisProjectService.upsert({ code: proj.code, name: proj.name, progress_percent: pct })
      setProjects((prev) => prev.map((p) => p.id === task.project_id ? { ...p, progress_percent: pct } : p))
    }
  }

  const deleteTask = async (id: string) => {
    await PmisTaskService.delete(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const deleteProject = async (id: string) => {
    await PmisProjectService.delete(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (selProject === id) setSelProject(projects.find((p) => p.id !== id)?.id || null)
    setTasks((prev) => prev.filter((t) => t.project_id !== id))
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: T.font, outline: 'none' }

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderKanban size={22} color={T.sky} /> Projects
          </h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>{projects.length} proyek · Progress dihitung otomatis dari tugas</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn v="ghost" size="sm" icon="RefreshCw" onClick={load}>Refresh</Btn>
          <Btn v="primary" size="sm" icon="Plus" onClick={() => setShowAddProject(true)}>Tambah Project</Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={24} className="animate-spin" style={{ color: T.sky, margin: '0 auto' }} /></div>
      ) : projects.length === 0 ? (
        <Panel pad={40}>
          <div style={{ textAlign: 'center', color: T.dim, fontSize: 13 }}>
            <FolderKanban size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontWeight: 700, color: T.sub, marginBottom: 8 }}>Belum ada project</div>
            Klik "Tambah Project" untuk membuat proyek pertama. Jalankan <code>pmis_projects.sql</code> + <code>pmis_tasks.sql</code> di Supabase SQL Editor bila belum.
            <div style={{ marginTop: 14 }}><Btn v="primary" size="sm" icon="Plus" onClick={() => setShowAddProject(true)}>Tambah Project</Btn></div>
          </div>
        </Panel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
          {/* LEFT — Project List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((p) => {
              const pct = progressOf(p.id)
              const isSel = p.id === selProject
              const taskCount = tasks.filter((t) => t.project_id === p.id).length
              const doneCount = tasks.filter((t) => t.project_id === p.id && t.status === 'done').length
              return (
                <div key={p.id} onClick={() => setSelProject(p.id)} style={{ background: isSel ? `${T.sky}12` : T.panel, border: `1px solid ${isSel ? T.sky : T.line}`, borderRadius: 12, padding: 14, cursor: 'pointer', borderLeft: `3px solid ${isSel ? T.sky : 'transparent'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: T.mono, color: T.dim }}>{p.code}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginTop: 2 }}>{p.name}</div>
                    </div>
                    <span style={{ fontSize: 8.5, fontWeight: 900, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, background: `${statusColor[p.status] || T.dim}22`, color: statusColor[p.status] || T.dim, border: `1px solid ${statusColor[p.status] || T.dim}55` }}>{statusLabel[p.status] || p.status}</span>
                  </div>
                  {p.client_name && <div style={{ fontSize: 11, color: T.dim, marginBottom: 6 }}>{p.client_name}{p.location ? ` · ${p.location}` : ''}</div>}
                  <ProgBar value={pct} color={T.sky} h={5} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5 }}>
                    <span style={{ color: T.dim }}>{doneCount}/{taskCount} tugas</span>
                    <span style={{ color: T.sky, fontWeight: 700, fontFamily: T.mono }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT — Selected Project Detail + Tasks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selP ? (
              <>
                {/* Project header */}
                <Panel pad={18}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: T.mono, color: T.dim }}>{selP.code}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: T.txt }}>{selP.name}</div>
                      <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>{selP.client_name || '—'}{selP.location ? ` · ${selP.location}` : ''}</div>
                    </div>
                    <button onClick={() => deleteProject(selP.id)} title="Hapus project" style={{ background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 8, padding: 8, cursor: 'pointer', color: T.dim }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = `${T.red}55` }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.dim; e.currentTarget.style.borderColor = T.line }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase' }}>Nilai Kontrak</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.sky, fontFamily: T.mono, marginTop: 2 }}>{fmtRp(Number(selP.contract_value) || 0)}</div>
                    </div>
                    <div style={{ background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase' }}>Status</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: statusColor[selP.status] || T.dim, marginTop: 2 }}>{statusLabel[selP.status] || selP.status}</div>
                    </div>
                    <div style={{ background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase' }}>Progress</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.txt, fontFamily: T.mono, marginTop: 2 }}>{progressOf(selP.id)}%</div>
                    </div>
                  </div>
                  <ProgBar value={progressOf(selP.id)} color={T.sky} h={6} />
                </Panel>

                {/* Tasks */}
                <Panel pad={18}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>Tugas ({selectedTasks.filter(t => t.status === 'done').length}/{selectedTasks.length})</span>
                  </div>

                  {/* Add task */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                      placeholder="Tugas baru..."
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={handleAddTask} disabled={savingT || !newTaskTitle.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: T.sky, color: '#03203a', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: savingT ? 0.6 : 1 }}>
                      <Plus size={14} /> Tambah
                    </button>
                  </div>

                  {selectedTasks.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: T.dim, fontSize: 12, border: `1px dashed ${T.line}`, borderRadius: 10 }}>
                      Belum ada tugas. Tambahkan tugas pertama.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedTasks.map((t) => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 9 }}>
                          <button onClick={() => toggleTask(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: t.status === 'done' ? T.green : T.dim }}>
                            {t.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: t.status === 'done' ? T.dim : T.txt, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</div>
                          </div>
                          {t.status === 'done' && <Tag color={T.green} style={{ fontSize: 8 }}>Done</Tag>}
                          <button onClick={() => deleteTask(t.id)} title="Hapus" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.dim, display: 'flex' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </>
            ) : (
              <Panel pad={40}>
                <div style={{ textAlign: 'center', color: T.dim, fontSize: 12 }}>Pilih project di sebelah kiri.</div>
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowAddProject(false)}>
          <Panel pad={24} style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: T.txt, margin: 0 }}>Buat Project Baru</h3>
                <p style={{ fontSize: 12, color: T.dim, margin: '4px 0 0' }}>Isi data dasar proyek. Tahapan SOP akan otomatis dibuat.</p>
              </div>
              <button onClick={() => setShowAddProject(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim, fontSize: 20 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Kode Proyek</label>
                  <input style={inputStyle} value={pForm.code} onChange={(e) => setPForm({ ...pForm, code: e.target.value })} placeholder={autoCode()} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Nilai Kontrak (IDR)</label>
                  <input type="number" style={inputStyle} value={pForm.contract_value} onChange={(e) => setPForm({ ...pForm, contract_value: e.target.value })} placeholder="Rp 0" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Nama Proyek</label>
                <input style={inputStyle} value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} placeholder="Villa Tropis Ubud" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Klien</label>
                  <input style={inputStyle} value={pForm.client_name} onChange={(e) => setPForm({ ...pForm, client_name: e.target.value })} placeholder="Bpk. Budi" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Lokasi</label>
                  <input style={inputStyle} value={pForm.location} onChange={(e) => setPForm({ ...pForm, location: e.target.value })} placeholder="Ubud, Bali" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Deskripsi</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} placeholder="Deskripsi singkat proyek..." />
              </div>

              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Owner / Klien Penerima Laporan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Nama Owner</label>
                    <input style={inputStyle} value={pForm.owner_name} onChange={(e) => setPForm({ ...pForm, owner_name: e.target.value })} placeholder="Nama owner / PIC klien" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>Email Owner</label>
                      <input type="email" style={inputStyle} value={pForm.owner_email} onChange={(e) => setPForm({ ...pForm, owner_email: e.target.value })} placeholder="owner@example.com" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.txt, display: 'block', marginBottom: 6 }}>WhatsApp Owner</label>
                      <input style={inputStyle} value={pForm.owner_wa} onChange={(e) => setPForm({ ...pForm, owner_wa: e.target.value })} placeholder="+6281234567890" />
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: T.dim, margin: 0 }}>Digest harian & alert akan dikirim otomatis ke email / WhatsApp ini.</p>
                </div>
              </div>

              <button
                onClick={handleAddProject}
                disabled={savingP || !pForm.name.trim()}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: T.sky, color: '#03203a', fontWeight: 700, fontSize: 14, cursor: savingP ? 'not-allowed' : 'pointer', opacity: savingP ? 0.6 : 1, marginTop: 4 }}
              >
                {savingP ? 'Menyimpan...' : 'Simpan Project'}
              </button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

export default Projects
