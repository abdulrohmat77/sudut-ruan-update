/**
 * n8n Webhook Integration Service
 *
 * Endpoint mapping (sesuai workflow di /n8n-workflows):
 *  - WF1 (Incoming Message)   : trigger by WhatsApp Business Cloud (tidak dipanggil dari dashboard)
 *  - WF2 (Estimator)          : POST {base}/wa-estimator
 *  - WF3 (Proposal)           : POST {base}/wa-proposal
 *  - WF4 (Supabase Sync Hub)  : POST {base}/incoming-conversation
 *  - WF0 (Dashboard Message)  : POST {base}/dashboard-message  (kirim WA dari operator)
 *  - Toggle mode              : POST {base}/toggle-mode
 *
 * Webhook base URL diambil dari (urutan prioritas):
 *  1. Argument `setBaseUrl()` saat runtime (dari Settings page → ai_config.webhook_url)
 *  2. import.meta.env.VITE_N8N_WEBHOOK_URL
 *  3. Default: 'https://n8n.srv1696073.hstgr.cloud/webhook'
 */

import { Conversation, Message, ConversationMode } from '../types/chat'

const DEFAULT_BASE_URL = 'https://n8n.srv1696073.hstgr.cloud/webhook'

const ENDPOINTS = {
  sendMessage: '/dashboard-message',
  toggleMode: '/toggle-mode',
  getConversations: '/get-conversations',
  getMessages: '/get-messages',
  triggerEstimator: '/wa-estimator',
  triggerProposal: '/wa-proposal',
  syncConversation: '/incoming-conversation',
  ping: '/ping',
} as const

class N8NWebhookService {
  private baseUrl: string

  constructor() {
    this.baseUrl =
      (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) || DEFAULT_BASE_URL
  }

  /** Update base URL dari Settings page (akan di-cache di localStorage) */
  setBaseUrl(url: string) {
    if (!url) return
    this.baseUrl = url.replace(/\/+$/, '') // trim trailing slash
    try {
      localStorage.setItem('n8n_base_url', this.baseUrl)
    } catch {
      // ignore (private mode etc.)
    }
  }

  getBaseUrl(): string {
    // Cek localStorage (di-set dari Settings) supaya konsisten cross-refresh
    try {
      const cached = localStorage.getItem('n8n_base_url')
      if (cached) return cached
    } catch {
      // ignore
    }
    return this.baseUrl
  }

  private url(endpoint: string): string {
    return `${this.getBaseUrl()}${endpoint}`
  }

  /** Send message dari dashboard ke client (WA/IG) via n8n WF0 */
  async sendMessageToClient(payload: {
    conversationId: string
    clientPhoneOrUsername: string
    message: string
    source: 'whatsapp' | 'instagram'
    senderRole: 'ai' | 'human'
    humanOperator?: string
    mediaUrl?: string
    mediaType?: string
    fileName?: string
  }) {
    try {
      const response = await fetch(this.url(ENDPOINTS.sendMessage), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: payload.conversationId,
          destination: payload.source,
          recipient: payload.clientPhoneOrUsername,
          message: payload.message,
          sender: payload.senderRole,
          operator: payload.humanOperator,
          mediaUrl: payload.mediaUrl,
          mediaType: payload.mediaType,
          fileName: payload.fileName,
          timestamp: new Date().toISOString(),
          metadata: {
            sessionId: this.getSessionId(),
            // dashboardSent flag → biar n8n WF0 bisa skip duplicate Supabase insert
            dashboardSent: true,
            mediaUrl: payload.mediaUrl,
            mediaType: payload.mediaType,
            fileName: payload.fileName,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json().catch(() => ({}))
      return {
        success: true,
        messageId: result.messageId || `msg-${Date.now()}`,
        deliveryStatus: result.deliveryStatus || 'sent',
      }
    } catch (error) {
      console.error('[n8n] sendMessageToClient failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: `local-${Date.now()}`,
      }
    }
  }

  /** Toggle AI ↔ Manual mode lewat n8n */
  async toggleConversationMode(payload: {
    conversationId: string
    newMode: ConversationMode
    triggeredBy?: string
  }) {
    try {
      const response = await fetch(this.url(ENDPOINTS.toggleMode), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: payload.conversationId,
          mode: payload.newMode,
          triggeredBy: payload.triggeredBy || 'dashboard-operator',
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error(`Toggle mode failed: ${response.status}`)
      return await response.json().catch(() => ({ success: true }))
    } catch (error) {
      console.error('[n8n] toggleConversationMode failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'unknown' }
    }
  }

  /** Trigger WF2 — Auto Estimator (alternative path bila WF1 belum extract data lengkap) */
  async triggerEstimator(payload: {
    from: string
    clientName: string
    extracted: {
      building_type?: string
      tier?: string
      area_sqm?: number | null
      service_type?: string
    }
  }) {
    try {
      const response = await fetch(this.url(ENDPOINTS.triggerEstimator), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Trigger estimator failed: ${response.status}`)
      return { success: true }
    } catch (error) {
      console.error('[n8n] triggerEstimator failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'unknown' }
    }
  }

  /** Trigger WF3 — Proposal Generator dari dashboard */
  async triggerProposal(payload: {
    from: string
    clientName: string
    extracted: {
      building_type?: string
      tier?: string
      area_sqm?: number | null
      service_type?: string
    }
  }) {
    try {
      const response = await fetch(this.url(ENDPOINTS.triggerProposal), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Trigger proposal failed: ${response.status}`)
      return { success: true }
    } catch (error) {
      console.error('[n8n] triggerProposal failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'unknown' }
    }
  }

  /** Sinkronisasi data dashboard → Supabase via WF4 (alternative dari direct Supabase write) */
  async syncToSupabase(payload: {
    conversationId: string
    clientName?: string
    source?: 'whatsapp' | 'instagram'
    lastMessage?: string
    intent?: string
    mode?: ConversationMode
    needsHuman?: boolean
    metadata?: Record<string, unknown>
  }) {
    try {
      const response = await fetch(this.url(ENDPOINTS.syncConversation), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
      })
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`)
      return { success: true }
    } catch (error) {
      console.error('[n8n] syncToSupabase failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'unknown' }
    }
  }

  /** Health-check webhook (dipanggil dari Settings page) */
  async ping(timeoutMs = 5000): Promise<boolean> {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(this.url(ENDPOINTS.ping), {
        method: 'GET',
        signal: ctrl.signal,
      }).catch(() => null)
      clearTimeout(timer)
      if (res && res.status < 500) return true
    } catch {
      // ignore
    }
    // Fallback: probe base URL
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(this.getBaseUrl(), {
        method: 'GET',
        signal: ctrl.signal,
      }).catch(() => null)
      clearTimeout(timer)
      return !!(res && res.status < 500)
    } catch {
      return false
    }
  }

  /** Get all active conversations (legacy n8n endpoint, dashboard sekarang baca langsung dari Supabase) */
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await fetch(this.url(ENDPOINTS.getConversations))
      if (!response.ok) throw new Error(`Get conversations failed: ${response.status}`)
      const data = await response.json()
      return this.normalizeConversations(data.conversations || [])
    } catch (error) {
      console.error('[n8n] getConversations failed:', error)
      return []
    }
  }

  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    try {
      const response = await fetch(
        `${this.url(ENDPOINTS.getMessages)}/${encodeURIComponent(conversationId)}?limit=${limit}`,
      )
      if (!response.ok) throw new Error(`Get messages failed: ${response.status}`)
      const data = await response.json()
      return this.normalizeMessages(data.messages || [])
    } catch (error) {
      console.error('[n8n] getMessages failed:', error)
      return []
    }
  }

  /**
   * Placeholder untuk listener pesan masuk via WebSocket/SSE.
   * Saat ini dashboard pakai polling Supabase → handler ini tidak dipakai.
   */
  setupIncomingMessageListener(_callback: (message: unknown) => void) {
    // Intentional no-op: incoming message dideteksi via polling Supabase tabel `messages`.
    // Bisa diganti ke WebSocket di masa depan.
  }

  private normalizeConversations(data: any[]): Conversation[] {
    return data.map((conv) => ({
      id: conv.id || conv.conversationId,
      clientName: conv.clientName || conv.client_name,
      source: conv.source || 'whatsapp',
      status: conv.status || 'active',
      mode: conv.mode || 'ai',
      lastMessage: conv.lastMessage || conv.last_message || '',
      lastMessageTime: new Date(conv.lastMessageTime || conv.last_message_time || Date.now()),
      unreadCount: conv.unreadCount || conv.unread_count || 0,
      metadata: {
        phoneNumber: conv.metadata?.phoneNumber || conv.phone_number,
        igUsername: conv.metadata?.igUsername || conv.ig_username,
        projectType: conv.metadata?.projectType || conv.project_type,
        estimatedValue: conv.metadata?.estimatedValue || conv.estimated_value,
      },
      messages: [],
      humanOperator: conv.humanOperator || conv.human_operator,
    }))
  }

  private normalizeMessages(data: any[]): Message[] {
    return data.map((msg) => ({
      id: msg.id || msg.messageId,
      conversationId: msg.conversationId || msg.conversation_id,
      content: msg.content || msg.message,
      role: msg.role || msg.sender,
      timestamp: new Date(msg.timestamp || msg.created_at || Date.now()),
      source: msg.source || 'whatsapp',
      aiConfidence: msg.aiConfidence || msg.ai_confidence,
      metadata: msg.metadata,
    }))
  }

  private getSessionId(): string {
    try {
      let sessionId = localStorage.getItem('dashboard-session-id')
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        localStorage.setItem('dashboard-session-id', sessionId)
      }
      return sessionId
    } catch {
      return `session-${Date.now()}`
    }
  }
}

// Singleton
export const n8nService = new N8NWebhookService()
export default n8nService
