import { createClient } from '@supabase/supabase-js'

// Supabase project URL + anon key.
// Prefer environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY);
// fall back to the public project defaults so the app still boots without a .env.
// NOTE: the anon key is a public client key — never put the service_role key here.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://wbfqudrzwsnlzevxjlkm.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiZnF1ZHJ6d3NubHpldnhqbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTY2NjUsImV4cCI6MjA5NTI3MjY2NX0.6ceWsWJ2g9ilLdHvKgolh7rKt5X8JEQyBHwDEhGJ4lc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// ============================================================
// Types
// ============================================================
export interface DBConversation {
  id: string
  client_name: string
  source: 'whatsapp' | 'instagram'
  mode: 'ai' | 'manual'
  status: 'active' | 'idle' | 'archived'
  last_message: string | null
  last_message_at: string
  unread_count: number
  human_operator: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DBMessage {
  id: string
  conversation_id: string
  content: string
  role: 'client' | 'ai' | 'human'
  source: string
  ai_confidence: number | null
  needs_human_review: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface DBDocument {
  id: string
  conversation_id: string | null
  client_phone: string | null
  client_name: string | null
  type: 'proposal' | 'invoice' | 'rab' | 'followup' | 'spk'
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  file_url: string | null
  proposal_no: string | null
  data: Record<string, unknown>
  created_at: string
  sent_at: string | null
  valid_until: string | null
}

export interface DBTemplate {
  id: string
  type: string
  name: string
  content: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DBQuickReply {
  id: string
  title: string
  content: string
  category: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface DBPrompt {
  key: string
  title: string
  content: string
  description: string | null
  is_active: boolean
  updated_at: string
}

export interface DBClient {
  id: string
  name: string | null
  phone: string | null
  ig_username: string | null
  source: string
  status: string
  building_type: string | null
  tier: string | null
  area_sqm: number | null
  rab_avg: number | null
  fee_avg: number | null
  last_proposal_no: string | null
  last_contact_at: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================================
// Conversation Service
// ============================================================
export const ConversationService = {
  async getAll(): Promise<DBConversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('getAll conversations error:', error)
      return []
    }
    return data || []
  },

  async getMessages(conversationId: string): Promise<DBMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('getMessages error:', error)
      return []
    }
    return data || []
  },

  async upsertConversation(conv: Partial<DBConversation> & { id: string }) {
    const { error } = await supabase
      .from('conversations')
      .upsert({ ...conv, updated_at: new Date().toISOString() })

    if (error) console.error('upsert conversation error:', error)
  },

  async insertMessage(msg: Omit<DBMessage, 'id' | 'created_at'>) {
    const { error } = await supabase.from('messages').insert(msg)
    if (error) console.error('insert message error:', error)
  },

  async toggleMode(conversationId: string, mode: 'ai' | 'manual') {
    const { error } = await supabase
      .from('conversations')
      .update({ mode, updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (error) console.error('toggle mode error:', error)
  },

  async markRead(conversationId: string) {
    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId)

    if (error) console.error('mark read error:', error)
  },

  async deleteConversation(conversationId: string) {
    // messages ikut terhapus otomatis lewat FK `on delete cascade`
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) console.error('delete conversation error:', error)
    return { error }
  },

  async deleteMany(conversationIds: string[]) {
    if (conversationIds.length === 0) return { error: null }
    // messages ikut terhapus otomatis lewat FK `on delete cascade`
    const { error } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds)

    if (error) console.error('delete many conversations error:', error)
    return { error }
  },

  // Realtime subscription
  subscribeToConversations(callback: (conv: DBConversation) => void) {
    const channel = supabase.channel('conversations-changes')
    channel.on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'conversations' },
      (payload: any) => callback(payload.new as DBConversation)
    )
    channel.subscribe()
    return channel
  },

  subscribeToMessages(conversationId: string, callback: (msg: DBMessage) => void) {
    const channel = supabase.channel(`messages-${conversationId}`)
    channel.on(
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => callback(payload.new as DBMessage)
    )
    channel.subscribe()
    return channel
  },
}

// ============================================================
// Template Service
// ============================================================
export const TemplateService = {
  async getAll(): Promise<DBTemplate[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('type')

    if (error) {
      console.error('getAll templates error:', error)
      return []
    }
    return data || []
  },

  async getByType(type: string): Promise<DBTemplate[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)

    if (error) return []
    return data || []
  },

  async upsert(template: Partial<DBTemplate> & { type: string; name: string; content: string }) {
    const { data, error } = await supabase
      .from('templates')
      .upsert({ ...template, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) console.error('upsert template error:', error)
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('templates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) console.error('delete template error:', error)
  },

  // Fill template dengan data
  fillTemplate(template: string, data: Record<string, string>): string {
    let filled = template
    Object.entries(data).forEach(([key, value]) => {
      filled = filled.replace(new RegExp(`{${key}}`, 'g'), value)
    })
    return filled
  },
}

// ============================================================
// Quick Reply Service
// ============================================================
export const QuickReplyService = {
  async getAll(): Promise<DBQuickReply[]> {
    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) return []
    return data || []
  },

  async upsert(qr: Partial<DBQuickReply> & { title: string; content: string }) {
    const { data, error } = await supabase
      .from('quick_replies')
      .upsert(qr)
      .select()
      .single()

    if (error) console.error('upsert quick reply error:', error)
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('quick_replies')
      .update({ is_active: false })
      .eq('id', id)

    if (error) console.error('delete quick reply error:', error)
  },
}

// ============================================================
// Document Service
// ============================================================
export const DocumentService = {
  async getAll(): Promise<DBDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  },

  async getByClient(phone: string): Promise<DBDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('client_phone', phone)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  },

  async insert(doc: Omit<DBDocument, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('documents')
      .insert(doc)
      .select()
      .single()

    if (error) console.error('insert document error:', error)
    return data
  },

  async updateStatus(id: string, status: DBDocument['status'], fileUrl?: string) {
    const { error } = await supabase
      .from('documents')
      .update({
        status,
        file_url: fileUrl,
        sent_at: status === 'sent' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)

    if (error) console.error('update document status error:', error)
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) console.error('delete document error:', error)
    return { error }
  },
}

// ============================================================
// Client Service
// ============================================================
export const ClientService = {
  async getAll(): Promise<DBClient[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('last_contact_at', { ascending: false })

    if (error) return []
    return data || []
  },

  async upsert(client: Partial<DBClient> & { id: string }) {
    const { error } = await supabase
      .from('clients')
      .upsert({ ...client, updated_at: new Date().toISOString() })

    if (error) console.error('upsert client error:', error)
  },
}

// ============================================================
// PMIS Project Control Service (Executive Dashboard)
// ============================================================
export interface DBPmisProject {
  id: string
  code: string
  name: string
  description: string | null
  client_name: string | null
  location: string | null
  contract_value: number
  currency: string
  start_date: string | null
  end_date: string | null
  actual_start: string | null
  actual_end: string | null
  status: string
  progress_percent: number
  planned_progress: number
  created_at: string
  updated_at: string
}

export interface DBPmisInvoice {
  id: string
  project_id: string
  invoice_no: string
  amount: number
  tax_amount: number
  issued_date: string | null
  due_date: string | null
  paid_date: string | null
  status: string
  notes: string | null
  created_at: string
}

export const PmisProjectService = {
  async getAll(): Promise<DBPmisProject[]> {
    const { data, error } = await supabase
      .from('pmis_projects')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) { console.error('pmis_projects getAll error:', error); return [] }
    return data || []
  },

  async upsert(project: Partial<DBPmisProject> & { code: string; name: string }) {
    const { error } = await supabase
      .from('pmis_projects')
      .upsert({ ...project, updated_at: new Date().toISOString() }, { onConflict: 'code' })
    if (error) console.error('pmis_projects upsert error:', error)
    return { error }
  },

  async delete(id: string) {
    const { error } = await supabase.from('pmis_projects').delete().eq('id', id)
    if (error) console.error('pmis_projects delete error:', error)
    return { error }
  },
}

export const PmisInvoiceService = {
  async getAll(): Promise<DBPmisInvoice[]> {
    const { data, error } = await supabase
      .from('pmis_invoices')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('pmis_invoices getAll error:', error); return [] }
    return data || []
  },

  async getByProject(projectId: string): Promise<DBPmisInvoice[]> {
    const { data, error } = await supabase
      .from('pmis_invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) return []
    return data || []
  },

  async upsert(inv: Partial<DBPmisInvoice> & { project_id: string; invoice_no: string; amount: number }) {
    const { error } = await supabase.from('pmis_invoices').upsert(inv)
    if (error) console.error('pmis_invoices upsert error:', error)
    return { error }
  },

  async delete(id: string) {
    const { error } = await supabase.from('pmis_invoices').delete().eq('id', id)
    if (error) console.error('pmis_invoices delete error:', error)
    return { error }
  },
}

// ============================================================
// PMIS Task Service
// ============================================================
export interface DBPmisTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  sort_order: number
  created_at: string
  updated_at: string
}

export const PmisTaskService = {
  async getAll(): Promise<DBPmisTask[]> {
    const { data, error } = await supabase
      .from('pmis_tasks')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) { console.error('pmis_tasks getAll error:', error); return [] }
    return data || []
  },

  async getByProject(projectId: string): Promise<DBPmisTask[]> {
    const { data, error } = await supabase
      .from('pmis_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
    if (error) return []
    return data || []
  },

  async insert(task: { project_id: string; title: string; description?: string }) {
    const { data, error } = await supabase
      .from('pmis_tasks')
      .insert({ ...task, status: 'todo', updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) console.error('pmis_tasks insert error:', error)
    return { data, error }
  },

  async updateStatus(id: string, status: 'todo' | 'in_progress' | 'done') {
    const { error } = await supabase
      .from('pmis_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('pmis_tasks updateStatus error:', error)
    return { error }
  },

  async delete(id: string) {
    const { error } = await supabase.from('pmis_tasks').delete().eq('id', id)
    if (error) console.error('pmis_tasks delete error:', error)
    return { error }
  },
}

// ============================================================
// PMIS Report Services (Daily / Weekly / Monthly)
// ============================================================
export interface DBPmisDailyReport {
  id: string
  project_id: string
  report_date: string
  weather: string | null
  manpower_count: number
  work_summary: string | null
  issues: string | null
  next_day_plan: string | null
  progress_percent: number | null
  status: string
  created_at: string
  updated_at: string
}

export interface DBPmisWeeklyReport {
  id: string
  project_id: string
  week_start: string
  week_end: string
  summary: string | null
  planned_progress: number | null
  actual_progress: number | null
  variance: number | null
  status: string
  created_at: string
}

export interface DBPmisMonthlyReport {
  id: string
  project_id: string
  month: string
  executive_summary: string | null
  financial_summary: Record<string, unknown>
  schedule_summary: Record<string, unknown>
  status: string
  created_at: string
}

export const PmisDailyReportService = {
  async getAll(): Promise<DBPmisDailyReport[]> {
    const { data, error } = await supabase.from('pmis_daily_reports').select('*').order('report_date', { ascending: false })
    if (error) { console.error('pmis_daily_reports getAll error:', error); return [] }
    return data || []
  },
  async getByProject(projectId: string): Promise<DBPmisDailyReport[]> {
    const { data, error } = await supabase.from('pmis_daily_reports').select('*').eq('project_id', projectId).order('report_date', { ascending: false })
    if (error) return []
    return data || []
  },
  async insert(report: Omit<DBPmisDailyReport, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('pmis_daily_reports').insert({ ...report, updated_at: new Date().toISOString() }).select().single()
    if (error) console.error('pmis_daily_reports insert error:', error)
    return { data, error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('pmis_daily_reports').delete().eq('id', id)
    return { error }
  },
}

export const PmisWeeklyReportService = {
  async getAll(): Promise<DBPmisWeeklyReport[]> {
    const { data, error } = await supabase.from('pmis_weekly_reports').select('*').order('week_start', { ascending: false })
    if (error) { console.error('pmis_weekly_reports getAll error:', error); return [] }
    return data || []
  },
  async getByProject(projectId: string): Promise<DBPmisWeeklyReport[]> {
    const { data, error } = await supabase.from('pmis_weekly_reports').select('*').eq('project_id', projectId).order('week_start', { ascending: false })
    if (error) return []
    return data || []
  },
  async insert(report: Omit<DBPmisWeeklyReport, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('pmis_weekly_reports').insert(report).select().single()
    if (error) console.error('pmis_weekly_reports insert error:', error)
    return { data, error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('pmis_weekly_reports').delete().eq('id', id)
    return { error }
  },
}

export const PmisMonthlyReportService = {
  async getAll(): Promise<DBPmisMonthlyReport[]> {
    const { data, error } = await supabase.from('pmis_monthly_reports').select('*').order('month', { ascending: false })
    if (error) { console.error('pmis_monthly_reports getAll error:', error); return [] }
    return data || []
  },
  async getByProject(projectId: string): Promise<DBPmisMonthlyReport[]> {
    const { data, error } = await supabase.from('pmis_monthly_reports').select('*').eq('project_id', projectId).order('month', { ascending: false })
    if (error) return []
    return data || []
  },
  async insert(report: Omit<DBPmisMonthlyReport, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('pmis_monthly_reports').insert(report).select().single()
    if (error) console.error('pmis_monthly_reports insert error:', error)
    return { data, error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('pmis_monthly_reports').delete().eq('id', id)
    return { error }
  },
}

// ============================================================
// PMIS Deliverables Service (Design Monitoring)
// ============================================================
export interface DBPmisDeliverable {
  id: string
  project_id: string
  phase_key: string
  title: string
  category: string
  status: string
  due_date: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export const PmisDeliverableService = {
  async getAll(): Promise<DBPmisDeliverable[]> {
    const { data, error } = await supabase.from('pmis_deliverables').select('*').order('sort_order', { ascending: true })
    if (error) { console.error('pmis_deliverables getAll error:', error); return [] }
    return data || []
  },
  async getByProject(projectId: string): Promise<DBPmisDeliverable[]> {
    const { data, error } = await supabase.from('pmis_deliverables').select('*').eq('project_id', projectId).order('sort_order', { ascending: true })
    if (error) return []
    return data || []
  },
  async insert(d: { project_id: string; phase_key: string; title: string; category?: string; due_date?: string }) {
    const { data, error } = await supabase.from('pmis_deliverables').insert({ ...d, status: 'todo', updated_at: new Date().toISOString() }).select().single()
    if (error) console.error('pmis_deliverables insert error:', error)
    return { data, error }
  },
  async updateStatus(id: string, status: string) {
    const { error } = await supabase.from('pmis_deliverables').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) console.error('pmis_deliverables updateStatus error:', error)
    return { error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('pmis_deliverables').delete().eq('id', id)
    return { error }
  },
}

// ============================================================
// AI Content Engine Service (konten IG generate AI)
// ============================================================
export interface DBAiContent {
  id: string
  topic: string | null
  caption: string | null
  hashtags: string | null
  image_prompt: string | null
  image_url: string | null
  platform: string
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
  scheduled_at: string | null
  posted_at: string | null
  post_result: string | null
  created_at: string
  updated_at: string
}

export const AiContentService = {
  async getAll(): Promise<DBAiContent[]> {
    const { data, error } = await supabase.from('ai_contents').select('*').order('created_at', { ascending: false })
    if (error) { console.error('ai_contents getAll error:', error); return [] }
    return data || []
  },
  async insert(row: Partial<DBAiContent>) {
    const { data, error } = await supabase.from('ai_contents').insert({ ...row, updated_at: new Date().toISOString() }).select().single()
    if (error) console.error('ai_contents insert error:', error)
    return { data, error }
  },
  async update(id: string, patch: Partial<DBAiContent>) {
    const { error } = await supabase.from('ai_contents').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) console.error('ai_contents update error:', error)
    return { error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('ai_contents').delete().eq('id', id)
    return { error }
  },
}

// ============================================================
// AI Config Service
// ============================================================
export interface DBAiSummary {
  id?: string
  conversation_id: string
  tanggal: string | null
  nama: string | null
  phone: string | null
  channel: string | null
  project_type: string | null
  lokasi: string | null
  luas_m2: string | null
  estimasi_value: string | null
  status: string | null
  design_stage: string | null
  progress_pct: string | null
  ringkasan: string | null
  created_at?: string
  updated_at?: string
}

export const AiSummaryService = {
  async getAll(): Promise<DBAiSummary[]> {
    const { data, error } = await supabase
      .from('ai_summaries')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('getAll ai_summaries error:', error)
      return []
    }
    return data || []
  },

  async upsert(row: Partial<DBAiSummary> & { conversation_id: string }) {
    const { error } = await supabase
      .from('ai_summaries')
      .upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: 'conversation_id' },
      )

    if (error) console.error('upsert ai_summary error:', error)
    return { error }
  },

  async delete(conversationId: string) {
    const { error } = await supabase
      .from('ai_summaries')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) console.error('delete ai_summary error:', error)
    return { error }
  },
}

// ============================================================
// AI Skills Service (Knowledge Base — skill/keterampilan AI)
// ============================================================
export interface DBAiSkill {
  id: string
  title: string
  description: string | null
  content: string | null
  category: string | null
  tags: string[]
  file_url: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export const AiSkillService = {
  async getAll(includeInactive = false): Promise<DBAiSkill[]> {
    let q = supabase.from('ai_skills').select('*').order('created_at', { ascending: false })
    if (!includeInactive) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) { console.error('ai_skills getAll error:', error); return [] }
    return (data as DBAiSkill[]) || []
  },
  async insert(row: Partial<DBAiSkill> & { title: string }) {
    const { data, error } = await supabase.from('ai_skills').insert({ ...row, updated_at: new Date().toISOString() }).select().single()
    if (error) console.error('ai_skills insert error:', error)
    return { data: data as DBAiSkill | null, error }
  },
  async update(id: string, patch: Partial<DBAiSkill>) {
    const { error } = await supabase.from('ai_skills').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) console.error('ai_skills update error:', error)
    return { error }
  },
  async remove(id: string) {
    const { error } = await supabase.from('ai_skills').delete().eq('id', id)
    if (error) console.error('ai_skills delete error:', error)
    return { error }
  },
  /** Upload file ke bucket "ai-skills". Mengembalikan { publicUrl, path }. */
  async uploadFile(file: File): Promise<{ publicUrl: string; path: string } | null> {
    const ts = Date.now()
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    const path = `${ts}-${safeName}`
    const { error } = await supabase.storage.from('ai-skills').upload(path, file, { upsert: false })
    if (error) { console.error('ai-skills upload error:', error); return null }
    const { data } = supabase.storage.from('ai-skills').getPublicUrl(path)
    return { publicUrl: data.publicUrl, path }
  },
  /** Hapus file di storage berdasarkan path relatif (mis. "1718...nama.docx"). */
  async removeFileByPath(path: string) {
    const { error } = await supabase.storage.from('ai-skills').remove([path])
    if (error) console.error('ai-skills remove file error:', error)
  },
}

// ============================================================
// AI Config Service
// ============================================================
export const AIConfigService = {
  async get(key: string): Promise<string | null> {
    const { data } = await supabase
      .from('ai_config')
      .select('value')
      .eq('key', key)
      .single()

    return data?.value || null
  },

  async getAll(): Promise<Record<string, string>> {
    const { data } = await supabase.from('ai_config').select('key, value')
    if (!data) return {}
    return Object.fromEntries(data.map((r) => [r.key, r.value]))
  },

  async set(key: string, value: string) {
    const { error } = await supabase
      .from('ai_config')
      .upsert({ key, value, updated_at: new Date().toISOString() })

    if (error) console.error('set ai config error:', error)
  },
}

// ============================================================
// Prompt Service
// ============================================================
export const PromptService = {
  async getAll(): Promise<DBPrompt[]> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('title')

    if (error) {
      console.error('getAll prompts error:', error)
      return []
    }
    return data || []
  },

  async get(key: string): Promise<DBPrompt | null> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('key', key)
      .single()

    if (error) return null
    return data
  },

  async save(prompt: { key: string; title: string; content: string; description?: string }) {
    const { error } = await supabase
      .from('prompts')
      .upsert({ ...prompt, updated_at: new Date().toISOString() })

    if (error) console.error('save prompt error:', error)
    return { error }
  },
}
