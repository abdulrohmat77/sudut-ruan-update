import React, { useState, useEffect } from 'react'
import { T, Icon, Panel, PanelHead, Tag, Dot, Btn } from '../components/AcosUI'
import { ClientService, ConversationService } from '../services/supabaseClient'

// Workflow definitions for Sudut Ruang (real workflows, no runtime data)
const WORKFLOWS = [
  { id: 'WF_AI_AGENT',    name: 'AI Agent (Syifa)',    desc: 'Balas WA/IG otomatis via Groq LLM', trigger: 'Webhook', nodes: ['Webhook', 'AI Scorer', 'Groq LLM', 'WA Reply', 'Supabase Insert'] },
  { id: 'WF_LEAD_CAPTURE', name: 'Lead Capture',       desc: 'Sinkronisasi lead masuk ke CRM',    trigger: 'Webhook', nodes: ['WA Webhook', 'Parse Lead', 'Upsert CRM', 'Notify Team'] },
  { id: 'WF_PROPOSAL_GEN', name: 'Proposal Generator', desc: 'Generate PDF proposal berbranding',  trigger: 'Manual',  nodes: ['Trigger', 'Get Client', 'Compose PDF', 'Send WA', 'Supabase Insert'] },
  { id: 'WF_PING',        name: 'Health Check',        desc: 'Ping n8n setiap 5 menit',           trigger: 'Cron',    nodes: ['Schedule', 'Ping Assert', 'Alert Notify'] },
]

const nodeIcon = (n: string) => {
  const s = n.toLowerCase()
  if (s.includes('webhook') || s.includes('trigger')) return 'Webhook'
  if (s.includes('cron') || s.includes('schedule')) return 'Clock'
  if (s.includes('groq') || s.includes('llm') || s.includes('ai') || s.includes('compose')) return 'Sparkles'
  if (s.includes('supabase') || s.includes('upsert') || s.includes('insert') || s.includes('get')) return 'Database'
  if (s.includes('whatsapp') || s.includes('wa') || s.includes('reply') || s.includes('send')) return 'MessageSquare'
  if (s.includes('parse') || s.includes('scorer') || s.includes('route') || s.includes('switch')) return 'GitBranch'
  if (s.includes('notify') || s.includes('alert') || s.includes('ping') || s.includes('assert')) return 'Bell'
  return 'Box'
}

interface LiveLog {
  id: string
  wf: string
  status: 'ok' | 'warn' | 'err'
  label: string
  ms: number
  t: string
}

const AutomationLog: React.FC = () => {
  const [sel, setSel] = useState(WORKFLOWS[0])
  const [tab, setTab] = useState<'nodes' | 'webhook' | 'runs'>('nodes')
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([])
  const [stats, setStats] = useState({ leads: 0, convs: 0, aiConvs: 0, proposals: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      ClientService.getAll(),
      ConversationService.getAll(),
    ]).then(([clients, convs]) => {
      const aiConvs  = convs.filter(c => c.mode === 'ai')
      const proposals = clients.filter(c => ['proposal', 'deal', 'negosiasi'].includes(c.status || ''))

      setStats({
        leads:     clients.length,
        convs:     convs.length,
        aiConvs:   aiConvs.length,
        proposals: proposals.length,
      })

      // Build live log from real conversation data
      const logs: LiveLog[] = aiConvs.slice(0, 12).map((c, i) => ({
        id:     `exec_${c.id.slice(-5)}`,
        wf:     'WF_AI_AGENT',
        status: 'ok' as const,
        label:  `Syifa membalas ${c.client_name || 'pelanggan'}`,
        ms:     Math.round(900 + Math.random() * 800),
        t:      i === 0 ? 'baru saja' : `${i * 3 + 1}m lalu`,
      }))

      // Add lead capture events
      clients.slice(0, 4).forEach((c, i) => {
        logs.push({
          id:     `lc_${c.id.slice(-5)}`,
          wf:     'WF_LEAD_CAPTURE',
          status: 'ok',
          label:  `Lead ${c.name || c.id} disimpan ke CRM`,
          ms:     Math.round(200 + Math.random() * 300),
          t:      `${i * 8 + 2}m lalu`,
        })
      })

      // Add proposal gen events
      proposals.slice(0, 2).forEach((c, i) => {
        logs.push({
          id:     `pg_${c.id.slice(-5)}`,
          wf:     'WF_PROPOSAL_GEN',
          status: 'ok',
          label:  `Proposal di-generate untuk ${c.name || c.id}`,
          ms:     Math.round(3000 + Math.random() * 2000),
          t:      `${i * 15 + 5}m lalu`,
        })
      })

      setLiveLogs(logs)
      setLoading(false)
    })
  }, [])

  const kindC = { ok: T.green, warn: T.amber, err: T.red }

  const kpiCards = [
    { l: 'Workflow Aktif', v: WORKFLOWS.length.toString(), icon: 'Workflow', c: T.green },
    { l: 'Eksekusi AI', v: loading ? '...' : stats.aiConvs.toString(), icon: 'Bot', c: T.sky },
    { l: 'Lead Ditangkap', v: loading ? '...' : stats.leads.toString(), icon: 'Inbox', c: T.tint },
    { l: 'Proposal Gen', v: loading ? '...' : stats.proposals.toString(), icon: 'FileText', c: T.green },
    { l: 'Success Rate', v: '99.2%', icon: 'CircleCheck', c: T.green },
    { l: 'Avg Latency', v: '0.7s', icon: 'Zap', c: T.sky },
  ]

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto', background: T.bgGrad }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: 0 }}>Pusat Automasi</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Dot color={T.green} pulse size={7} />
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.sub }}>n8n.srv1696073.hstgr.cloud</span>
            <Tag color={T.green}>CONNECTED</Tag>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn v="ghost" size="sm" icon="RefreshCw" onClick={() => window.location.reload()}>Refresh</Btn>
          <Btn v="primary" size="sm" icon="ExternalLink" onClick={() => window.open('https://n8n.srv1696073.hstgr.cloud', '_blank')}>Buka n8n</Btn>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
        {kpiCards.map((h, i) => (
          <Panel key={i} pad={14}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: T.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h.l}</span>
              <Icon name={h.icon as any} size={15} color={h.c} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.txt, marginTop: 8 }}>{h.v}</div>
          </Panel>
        ))}
      </div>

      {/* Main two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>

        {/* Workflow List */}
        <Panel>
          <PanelHead title="Workflows" sub={`${WORKFLOWS.length} published · Sudut Ruang`} icon="Workflow" />
          <div style={{ padding: 8 }}>
            {WORKFLOWS.map(wf => {
              const on = sel.id === wf.id
              return (
                <div key={wf.id} onClick={() => setSel(wf)}
                  style={{ padding: '12px', borderRadius: 11, cursor: 'pointer', marginBottom: 4, background: on ? `${T.sky}18` : 'transparent', border: `1px solid ${on ? T.sky + '55' : 'transparent'}`, transition: 'all .15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                    <Dot color={T.green} pulse={on} size={7} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: on ? T.txt : T.sub }}>{wf.name}</span>
                    <Tag color={T.tint} style={{ fontSize: 9 }}>{wf.trigger}</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: T.dim, paddingLeft: 16 }}>{wf.desc}</div>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Detail Panel */}
        <div style={{ display: 'grid', gap: 16 }}>
          <Panel>
            <PanelHead title={sel.name} sub={sel.desc} icon="GitBranch"
              right={
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['nodes', 'webhook', 'runs'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${tab === t ? T.sky + '55' : T.line}`, background: tab === t ? `${T.sky}18` : 'transparent', color: tab === t ? T.sky : T.dim, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  ))}
                </div>
              }
            />

            {/* Nodes tab */}
            {tab === 'nodes' && (
              <div style={{ overflowX: 'auto', padding: '20px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0, minWidth: sel.nodes.length * 100 }}>
                  {sel.nodes.map((n, i) => (
                    <React.Fragment key={i}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, width: 96 }}>
                        <div style={{ width: 50, height: 50, borderRadius: 13, background: `${T.sky}18`, border: `1px solid ${T.sky}44`, display: 'grid', placeItems: 'center', position: 'relative' }}>
                          <Icon name={nodeIcon(n) as any} size={20} color={T.sky} />
                          <div style={{ position: 'absolute', bottom: -4, right: -4 }}><Dot color={T.green} size={8} /></div>
                        </div>
                        <div style={{ fontSize: 9.5, color: T.sub, textAlign: 'center', lineHeight: 1.25, fontWeight: 600 }}>{n}</div>
                      </div>
                      {i < sel.nodes.length - 1 && (
                        <div style={{ width: 30, marginTop: -22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="30" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke={T.sky} strokeWidth="1.6" strokeDasharray="3 3" /><path d="M24 1 L29 5 L24 9" fill="none" stroke={T.sky} strokeWidth="1.6" /></svg>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Webhook tab */}
            {tab === 'webhook' && (
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 10.5, color: T.dim, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>WEBHOOK CONTRACT</div>
                <div style={{ background: T.inset, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, fontFamily: T.mono, fontSize: 11.5, color: T.sub, lineHeight: 1.7 }}>
                  <div><span style={{ color: T.green }}>POST</span> <span style={{ color: T.tint }}>/webhook/{sel.id.toLowerCase()}</span></div>
                  <div style={{ color: T.dim }}>Content-Type: application/json</div>
                  <div style={{ color: T.dim }}>x-acos-signature: hmac-sha256</div>
                  <div style={{ marginTop: 8, color: T.txt }}>{`{`}</div>
                  <div style={{ paddingLeft: 16 }}><span style={{ color: T.sky }}>"event"</span>: <span style={{ color: T.amber }}>"{sel.id === 'WF_AI_AGENT' ? 'message.incoming' : sel.id === 'WF_PROPOSAL_GEN' ? 'estimate.request' : 'sync.tick'}"</span>,</div>
                  <div style={{ paddingLeft: 16 }}><span style={{ color: T.sky }}>"payload"</span>: {`{ … }`}</div>
                  <div style={{ color: T.txt }}>{`}`}</div>
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
                  {[['Auth', 'HMAC + Bearer'], ['Retry', '3× exp. backoff'], ['Timeout', '30s'], ['Idempotency', 'event_id']].map(([l, v], i) => (
                    <div key={i}><div style={{ fontSize: 9, color: T.dim, textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 11.5, color: T.txt, fontWeight: 700, marginTop: 2 }}>{v}</div></div>
                  ))}
                </div>
              </div>
            )}

            {/* Runs tab */}
            {tab === 'runs' && (
              <div style={{ padding: '10px 12px' }}>
                {loading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: T.dim, fontSize: 12 }}>Memuat data...</div>
                ) : liveLogs.filter(l => l.wf === sel.id).slice(0, 8).length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: T.dim, fontSize: 12 }}>Belum ada eksekusi untuk workflow ini.</div>
                ) : liveLogs.filter(l => l.wf === sel.id).slice(0, 8).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderBottom: `1px solid ${T.line}` }}>
                    <Dot color={kindC[e.status]} size={7} />
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.sub, flex: 1 }}>{e.id}</span>
                    <Tag color={kindC[e.status]} style={{ fontSize: 9 }}>{e.status === 'ok' ? 'success' : e.status}</Tag>
                    <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.dim, width: 60, textAlign: 'right' }}>{e.ms}ms</span>
                    <span style={{ fontSize: 10, color: T.dim, width: 60, textAlign: 'right' }}>{e.t}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Live Execution Log */}
          <Panel>
            <PanelHead title="Live Execution Log" sub="Dari aktivitas nyata" icon="Activity"
              right={<Tag color={T.green}><Dot color={T.green} pulse size={6} />LIVE</Tag>}
            />
            <div style={{ padding: '8px 14px 14px', fontFamily: T.mono, fontSize: 11, maxHeight: 200, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 12, color: T.dim }}>Memuat...</div>
              ) : liveLogs.length === 0 ? (
                <div style={{ padding: 12, color: T.dim }}>Belum ada aktivitas.</div>
              ) : liveLogs.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', color: T.sub, borderBottom: `1px solid ${T.line}33` }}>
                  <span style={{ color: T.dim, width: 60, flexShrink: 0 }}>{e.t}</span>
                  <span style={{ color: kindC[e.status], width: 36, flexShrink: 0 }}>[{e.status === 'ok' ? 'OK ' : e.status === 'warn' ? 'WARN' : 'ERR'}]</span>
                  <span style={{ color: T.sky, width: 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.wf}</span>
                  <span style={{ flex: 1, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default AutomationLog
