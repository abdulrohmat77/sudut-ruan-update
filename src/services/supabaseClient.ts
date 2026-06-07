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
  type: 'proposal' | 'invoice' | 'rab' | 'followup'
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
