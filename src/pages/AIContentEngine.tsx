import { useEffect, useState } from 'react'
import { T, Panel, Btn } from '../components/AcosUI'
import { AiContentService, DBAiContent } from '../services/supabaseClient'
import { n8nService } from '../services/n8nWebhookService'
import { Sparkles, Loader2, Trash2, Image as ImageIcon, Calendar, Wand2 } from 'lucide-react'

const STATUS = {
  draft: { label: 'Draft', color: T.dim },
  scheduled: { label: 'Terjadwal', color: T.amber },
  posted: { label: 'Terposting', color: T.green },
  failed: { label: 'Gagal', color: T.red },
}

const AIContentEngine = () => {
  const [contents, setContents] = useState<DBAiContent[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [err, setErr] = useState('')

  // Generate form
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('Profesional & inspiratif')

  const load = async () => {
    setLoading(true)
    setContents(await AiContentService.getAll())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return
    setGenerating(true)
    setErr('')
    const res = await n8nService.generateContent({ topic: topic.trim(), tone, platform: 'instagram' })
    if (res.success && res.data) {
      const d = res.data
      await AiContentService.insert({
        topic: topic.trim(),
        caption: d.caption || null,
        hashtags: d.hashtags || null,
        image_prompt: d.image_prompt || null,
        image_url: d.image_url || null,
        platform: 'instagram',
        status: 'draft',
      })
      setTopic('')
      load()
    } else {
      setErr(res.error || 'Gagal generate konten. Pastikan workflow n8n /generate-content aktif.')
    }
    setGenerating(false)
  }

  const handleSchedule = async (c: DBAiContent) => {
    const val = prompt('Jadwalkan posting (format: YYYY-MM-DD HH:MM)', new Date().toISOString().slice(0, 16).replace('T', ' '))
    if (!val) return
    const dt = new Date(val.replace(' ', 'T'))
    if (isNaN(dt.getTime())) { alert('Format tanggal salah'); return }
    await AiContentService.update(c.id, { status: 'scheduled', scheduled_at: dt.toISOString() })
    load()
  }

  const handleStatus = async (c: DBAiContent, status: DBAiContent['status']) => {
    await AiContentService.update(c.id, { status })
    load()
  }

  const handleDelete = async (id: string) => {
    await AiContentService.delete(id)
    setContents((prev) => prev.filter((c) => c.id !== id))
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: T.font, outline: 'none' }

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wand2 size={22} color={T.sky} /> AI Content Engine
          </h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>Generate caption + gambar IG dengan AI, jadwalkan, auto-post.</div>
        </div>
        <Btn v="ghost" size="sm" icon="RefreshCw" onClick={load}>Refresh</Btn>
      </div>

      {/* Generator */}
      <Panel pad={18} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} color={T.sky} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>Generate Konten Baru</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Topik / Brief</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Mis. Tips memilih material lantai untuk rumah tropis" />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tone / Gaya</label>
              <input style={inputStyle} value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Profesional & inspiratif" />
            </div>
            <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: T.sky, color: '#03203a', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1 }}>
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {err && <div style={{ fontSize: 12, color: T.red, lineHeight: 1.5 }}>{err}</div>}
        </div>
      </Panel>

      {/* Content gallery */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={24} className="animate-spin" style={{ color: T.sky }} /></div>
      ) : contents.length === 0 ? (
        <Panel pad={40}>
          <div style={{ textAlign: 'center', color: T.dim, fontSize: 13 }}>
            <ImageIcon size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            Belum ada konten. Generate konten pertama di atas.
          </div>
        </Panel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {contents.map((c) => {
            const st = STATUS[c.status] || STATUS.draft
            return (
              <Panel key={c.id} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Image */}
                <div style={{ aspectRatio: '1/1', background: T.inset, position: 'relative', overflow: 'hidden' }}>
                  {c.image_url ? (
                    <img src={c.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim }}>
                      <ImageIcon size={32} style={{ opacity: 0.4 }} />
                    </div>
                  )}
                  <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: `${st.color}dd`, color: '#fff' }}>{st.label}</span>
                </div>
                {/* Body */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {c.topic && <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.topic}</div>}
                  <div style={{ fontSize: 12.5, color: T.txt, lineHeight: 1.5, maxHeight: 90, overflow: 'hidden' }}>{c.caption || '—'}</div>
                  {c.hashtags && <div style={{ fontSize: 11, color: T.sky, lineHeight: 1.4 }}>{c.hashtags}</div>}
                  {c.scheduled_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.amber }}>
                      <Calendar size={12} /> {new Date(c.scheduled_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${T.line}` }}>
                    {c.status === 'draft' && (
                      <button onClick={() => handleSchedule(c)} title="Jadwalkan" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', background: `${T.amber}18`, color: T.amber, border: `1px solid ${T.amber}44`, borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                        <Calendar size={13} /> Jadwalkan
                      </button>
                    )}
                    {c.status === 'scheduled' && (
                      <button onClick={() => handleStatus(c, 'draft')} title="Batalkan jadwal" style={{ flex: 1, padding: '7px', background: T.inset, color: T.dim, border: `1px solid ${T.line}`, borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                        Batal Jadwal
                      </button>
                    )}
                    {c.image_url && (
                      <a href={c.image_url} target="_blank" rel="noopener noreferrer" title="Buka gambar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', background: T.inset, color: T.sky, border: `1px solid ${T.line}`, borderRadius: 7, textDecoration: 'none' }}>
                        <ImageIcon size={13} />
                      </a>
                    )}
                    <button onClick={() => handleDelete(c.id)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', background: 'transparent', color: T.dim, border: `1px solid ${T.line}`, borderRadius: 7, cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = T.red)} onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AIContentEngine
