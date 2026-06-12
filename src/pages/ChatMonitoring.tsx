  import React, { useState, useEffect, useRef } from 'react'
import { DBConversation, DBMessage, ConversationService, QuickReplyService, DBQuickReply } from '../services/supabaseClient'
import { T, Icon, Avatar, Tag, ProgBar, Btn, Dot, Panel, statusColor } from '../components/AcosUI'
import { n8nService } from '../services/n8nWebhookService'
import type { ConversationAnalysis } from '../services/n8nWebhookService'

type MobileView = 'list' | 'chat' | 'panel'

interface ChatMonitoringProps {
  initialSearch?: string
  searchNonce?: number
  targetConversationId?: string | null
  targetNonce?: number
}

const ChatMonitoring: React.FC<ChatMonitoringProps> = ({
  initialSearch,
  searchNonce,
  targetConversationId,
  targetNonce,
}) => {
  const [conversations, setConversations] = useState<DBConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DBMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filterSource, setFilterSource] = useState<'all' | 'whatsapp' | 'instagram'>('all')
  const [search, setSearch] = useState('')
  const [quickReplies, setQuickReplies] = useState<DBQuickReply[]>([])
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [loading, setLoading] = useState(true)
  const [togglingMode, setTogglingMode] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('list')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // AI Analyst (rangkuman percakapan → spreadsheet)
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisErr, setAnalysisErr] = useState('')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [unseenCount, setUnseenCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)
  const prevSelectedIdRef = useRef<string | null>(null)

  const selectedConv = conversations.find((c) => c.id === selectedId) || null
  const convPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedIdRef = useRef<string | null>(null)

  useEffect(() => {
    loadConversations()
    loadQuickReplies()
    convPollRef.current = setInterval(loadConversations, 3000)
    return () => { if (convPollRef.current) clearInterval(convPollRef.current) }
  }, [])

  useEffect(() => {
    if (searchNonce && searchNonce > 0) setSearch(initialSearch || '')
  }, [searchNonce])

  useEffect(() => {
    if (targetNonce && targetNonce > 0 && targetConversationId) {
      setSelectedId(targetConversationId)
      selectedIdRef.current = targetConversationId
      setMobileView('chat')
    }
  }, [targetNonce])

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId)
      ConversationService.markRead(selectedId)
      if (msgPollRef.current) clearInterval(msgPollRef.current)
      msgPollRef.current = setInterval(() => loadMessages(selectedId), 3000)
    }
    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current) }
  }, [selectedId])

  // Reset / load AI Analyst saat ganti percakapan (ambil dari metadata bila ada).
  useEffect(() => {
    setAnalysisErr('')
    const conv = conversations.find((c) => c.id === selectedId)
    const saved = (conv?.metadata as Record<string, unknown> | undefined)?.aiAnalysis
    setAnalysis(saved ? (saved as ConversationAnalysis) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const handleAnalyze = async () => {
    if (!selectedConv) return
    setAnalyzing(true)
    setAnalysisErr('')
    const meta = (selectedConv.metadata || {}) as Record<string, string>
    const res = await n8nService.analyzeConversation({
      conversationId: selectedConv.id,
      clientName: selectedConv.client_name || '',
      phone: meta.phoneNumber || selectedConv.id,
      channel: selectedConv.source || 'whatsapp',
      transcript: messages.map((m) => ({ role: m.role, content: m.content })),
    })
    setAnalyzing(false)
    if (res.success && res.data) {
      const data = res.data
      setAnalysis(data)
      // Persist ke metadata supaya tetap ada saat reload.
      ConversationService.upsertConversation({
        id: selectedConv.id,
        metadata: { ...(selectedConv.metadata || {}), aiAnalysis: data },
      })
    } else {
      setAnalysisErr(res.error || 'Gagal menganalisa percakapan.')
    }
  }

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isNearBottom = distanceFromBottom < 80
    setShouldAutoScroll(isNearBottom)
    if (isNearBottom) setUnseenCount(0)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    setShouldAutoScroll(true)
    setUnseenCount(0)
  }

  useEffect(() => {
    if (prevSelectedIdRef.current !== selectedId) {
      prevSelectedIdRef.current = selectedId
      prevMessageCountRef.current = messages.length
      setShouldAutoScroll(true)
      setUnseenCount(0)
      const t = setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }) }, 50)
      return () => clearTimeout(t)
    }
    if (messages.length > prevMessageCountRef.current) {
      const newCount = messages.length - prevMessageCountRef.current
      if (shouldAutoScroll) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      } else {
        setUnseenCount((prev) => prev + newCount)
      }
      prevMessageCountRef.current = messages.length
    }
  }, [messages, selectedId, shouldAutoScroll])

  const loadConversations = async () => {
    const data = await ConversationService.getAll()
    setConversations(data)
    if (data.length > 0 && !selectedIdRef.current) {
      setSelectedId(data[0].id)
      selectedIdRef.current = data[0].id
    }
    setLoading(false)
  }

  const loadMessages = async (convId: string) => {
    const data = await ConversationService.getMessages(convId)
    setMessages(data)
  }

  const loadQuickReplies = async () => {
    const data = await QuickReplyService.getAll()
    setQuickReplies(data)
  }

  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    selectedIdRef.current = id
    setMobileView('chat')
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)))
  }

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !selectedFile) || !selectedConv || uploading) return
    setUploading(true)

    let mediaUrl = ''
    let mediaType = ''
    let fileName = ''
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) mediaType = 'image'
      else if (selectedFile.type.startsWith('audio/')) mediaType = 'audio'
      else mediaType = 'document'
      
      fileName = selectedFile.name

      try {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('upload_preset', 'dashboard_uploads')
        
        const uploadType = mediaType === 'document' ? 'raw' : 'auto'
        const res = await fetch(`https://api.cloudinary.com/v1_1/dtfmjwofq/${uploadType}/upload`, {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (data.secure_url) {
          if (data.resource_type === 'image' && data.format !== 'pdf') {
            const parts = data.secure_url.split('/upload/')
            mediaUrl = parts[0] + '/upload/f_auto,q_auto/' + parts[1]
          } else {
            mediaUrl = data.secure_url
          }
        } else {
          console.error('Cloudinary Upload error:', data)
        }
      } catch (err) {
        console.error('Upload exception:', err)
      }
    }

    const text = messageInput.trim() || ''
    if (!text && !mediaUrl) {
      setUploading(false)
      return
    }

    const msg: Omit<DBMessage, 'id' | 'created_at'> = {
      conversation_id: selectedConv.id,
      content: text,
      role: 'human',
      source: selectedConv.source,
      ai_confidence: null,
      needs_human_review: false,
      metadata: { dashboardSent: true, mediaUrl, mediaType, fileName },
    }
    setMessageInput('')
    setSelectedFile(null)
    
    await ConversationService.insertMessage(msg)
    await ConversationService.upsertConversation({
      id: selectedConv.id,
      last_message: text,
      last_message_at: new Date().toISOString(),
    })

    const meta = (selectedConv.metadata || {}) as Record<string, any>
    const recipient = meta.phoneNumber || meta.igUsername || selectedConv.id

    await n8nService.sendMessageToClient({
      conversationId: selectedConv.id,
      clientPhoneOrUsername: recipient,
      message: text,
      source: selectedConv.source,
      senderRole: 'human',
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? mediaType : undefined,
      fileName: mediaUrl ? fileName : undefined,
    })

    loadMessages(selectedConv.id)
    setUploading(false)
  }

  const handleToggleMode = async () => {
    if (!selectedConv || togglingMode) return
    const newMode = selectedConv.mode === 'ai' ? 'manual' : 'ai'
    setTogglingMode(true)
    setConversations((prev) => prev.map((c) => (c.id === selectedConv.id ? { ...c, mode: newMode } : c)))
    
    await ConversationService.toggleMode(selectedConv.id, newMode)
    
    await n8nService.toggleConversationMode({
      conversationId: selectedConv.id,
      newMode: newMode,
      triggeredBy: 'dashboard-operator'
    })

    setTogglingMode(false)
  }

  const handleDeleteConversation = async () => {
    if (!deleteConfirmId || deleting) return
    setDeleting(true)

    const { error } = await ConversationService.deleteConversation(deleteConfirmId)

    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== deleteConfirmId))
      if (selectedId === deleteConfirmId) {
        setSelectedId(null)
        selectedIdRef.current = null
        setMessages([])
        setMobileView('list')
      }
      setDeleteConfirmId(null)
    }

    setDeleting(false)
  }

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || deleting) return
    setDeleting(true)

    const ids = Array.from(selectedIds)
    const { error } = await ConversationService.deleteMany(ids)

    if (!error) {
      setConversations((prev) => prev.filter((c) => !selectedIds.has(c.id)))
      if (selectedId && selectedIds.has(selectedId)) {
        setSelectedId(null)
        selectedIdRef.current = null
        setMessages([])
        setMobileView('list')
      }
      setSelectedIds(new Set())
      setSelectMode(false)
      setShowBulkConfirm(false)
    }

    setDeleting(false)
  }

  const filtered = conversations
    .filter((c) => (filterSource === 'all' ? true : c.source === filterSource))
    .filter((c) => search.trim() ? (c.client_name || '').toLowerCase().includes(search.toLowerCase()) || c.id.includes(search) : true)

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatTimeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 1) return 'baru'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}j`
    return `${Math.floor(hours / 24)}h`
  }

  const meta = (selectedConv?.metadata || {}) as Record<string, string>
  const projectType = meta.projectType || meta.buildingType
  const estimatedValue = meta.estimatedValue

  const listVisibility = mobileView === 'list' ? 'flex' : 'hidden md:flex'
  const chatVisibility = mobileView === 'chat' ? 'flex' : 'hidden md:flex'
  const panelVisibility = mobileView === 'panel' ? 'flex' : 'hidden xl:flex'

  const aiConfidence = (() => {
    const aiMsgs = messages.filter((m) => m.role === 'ai' && m.ai_confidence)
    if (aiMsgs.length === 0) return null
    const avg = aiMsgs.reduce((s, m) => s + (m.ai_confidence || 0), 0) / aiMsgs.length
    return Math.round(avg * 100)
  })()

  return (
    <div style={{ display: "flex", height: "100%", background: T.bgGrad, overflow: "hidden" }}>
      {/* ── Column 1: Conversation List ───────────────────────── */}
      <div
        className={listVisibility}
        style={{
          width: isMobile && mobileView === 'list' ? '100%' : 280,
          maxWidth: isMobile && mobileView === 'list' ? '100%' : 280,
          flexShrink: 0,
          flexDirection: "column",
          background: T.sidebar,
          borderRight: `1px solid ${T.line}`,
          zIndex: 10
        }}
      >
        <div style={{ padding: "16px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: T.txt }}>Percakapan</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!selectMode && <Tag color={T.sky}><Dot color={T.sky} pulse size={6} />{conversations.filter(c => c.status === 'active').length} online</Tag>}
              <button
                onClick={toggleSelectMode}
                title={selectMode ? "Batal pilih" : "Pilih percakapan"}
                style={{ background: selectMode ? `${T.sky}18` : "transparent", border: `1px solid ${selectMode ? T.sky : T.line}`, color: selectMode ? T.sky : T.dim, borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, fontFamily: T.font, whiteSpace: "nowrap" }}
              >
                <Icon name={selectMode ? "X" : "CheckSquare"} size={12} color="currentColor" />
                {selectMode ? "Batal" : "Pilih"}
              </button>
            </div>
          </div>

          {selectMode && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", background: T.inset, border: `1px solid ${T.line}`, borderRadius: 9, marginBottom: 12 }}>
              <button
                onClick={() => setSelectedIds((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)))}
                style={{ background: "transparent", border: "none", color: T.sky, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: T.font, display: "flex", alignItems: "center", gap: 5 }}
              >
                <Icon name={selectedIds.size === filtered.length && filtered.length > 0 ? "CheckSquare" : "Square"} size={13} color={T.sky} />
                {selectedIds.size === filtered.length && filtered.length > 0 ? "Batal semua" : "Pilih semua"}
              </button>
              <button
                onClick={() => setShowBulkConfirm(true)}
                disabled={selectedIds.size === 0}
                style={{ background: selectedIds.size > 0 ? T.red : T.line, border: "none", color: selectedIds.size > 0 ? "#fff" : T.dim, borderRadius: 7, padding: "5px 10px", cursor: selectedIds.size > 0 ? "pointer" : "not-allowed", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, fontFamily: T.font }}
              >
                <Icon name="Trash2" size={12} color={selectedIds.size > 0 ? "#fff" : T.dim} />
                Hapus ({selectedIds.size})
              </button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 9, padding: "8px 12px", marginBottom: 12 }}>
            <Icon name="Search" size={15} color={T.dim} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / nomor..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.txt, fontSize: 11, fontFamily: T.font }} />
            {search && <Icon name="X" size={14} color={T.dim} onClick={() => setSearch('')} style={{ cursor: "pointer" }} />}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(['all', 'whatsapp', 'instagram'] as const).map((s) => (
              <button key={s} onClick={() => setFilterSource(s)} style={{ flex: 1, padding: "5px", borderRadius: 6, border: `1px solid ${filterSource === s ? T.sky : T.line}`, background: filterSource === s ? "rgba(74,179,216,0.14)" : "transparent", color: filterSource === s ? T.sky : T.dim, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: T.font, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {s === 'all' ? `Semua` : s === 'whatsapp' ? 'WA' : 'IG'}
              </button>
            ))}
          </div>
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: "center", color: T.dim, fontSize: 11 }}>Memuat...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: T.dim, fontSize: 11 }}>Belum ada percakapan</div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selectedId === conv.id
              const isChecked = selectedIds.has(conv.id)
              return (
                <div key={conv.id} onClick={() => selectMode ? toggleSelectId(conv.id) : handleSelectConversation(conv.id)} className="ac-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", cursor: "pointer", background: selectMode && isChecked ? "rgba(248,113,113,0.08)" : isSelected ? "rgba(74,179,216,0.06)" : "transparent", borderLeft: `3px solid ${selectMode && isChecked ? T.red : isSelected ? T.sky : "transparent"}`, borderBottom: `1px solid ${T.line}` }}>
                  {selectMode && (
                    <Icon name={isChecked ? "CheckSquare" : "Square"} size={18} color={isChecked ? T.red : T.dim} style={{ flexShrink: 0 }} />
                  )}
                  <div style={{ position: "relative" }}>
                    <Avatar initials={(conv.client_name || '?').charAt(0).toUpperCase()} color={statusColor[conv.status] || T.sky} size={36} />
                    <span style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: conv.source === 'whatsapp' ? T.green : T.red, border: `2px solid ${T.panel}`, display: "grid", placeItems: "center", fontSize: 7, fontWeight: 800, color: "#fff" }}>
                      {conv.source === 'whatsapp' ? 'W' : 'I'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.client_name || 'Pelanggan'}</span>
                      <span style={{ fontSize: 9.5, color: conv.unread_count > 0 && !isSelected ? T.sky : T.dim, fontWeight: 700 }}>{formatTimeAgo(conv.last_message_at)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: conv.unread_count > 0 && !isSelected ? T.txt : T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.last_message || '—'}</span>
                      {conv.unread_count > 0 && !isSelected ? (
                        <span style={{ background: T.sky, color: "#000", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>{conv.unread_count}</span>
                      ) : (
                        <Dot color={conv.mode === 'ai' ? T.sky : T.amber} size={6} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Column 2: Chat Thread ─────────────────────────────── */}
      <div className={chatVisibility} style={{ flex: 1, flexDirection: "column", minWidth: 0, position: "relative" }}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: T.panel, borderBottom: `1px solid ${T.line}`, zIndex: 10 }}>
              <div className="md:hidden" onClick={() => setMobileView('list')} style={{ cursor: "pointer", color: T.dim }}><Icon name="ArrowLeft" size={18} color={T.dim} /></div>
              <div
                onClick={() => setMobileView('panel')}
                title="Lihat info kontak & rangkuman AI"
                style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              >
                <Avatar initials={(selectedConv.client_name || '?').charAt(0).toUpperCase()} color={statusColor[selectedConv.status] || T.sky} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedConv.client_name || 'Pelanggan'}</div>
                  <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono }}>{selectedConv.source.toUpperCase()} · {selectedConv.id}</div>
                </div>
              </div>
              <Btn v={selectedConv.mode === 'ai' ? 'primary' : 'ghost'} size="sm" icon={selectedConv.mode === 'ai' ? "UserSquare" : "Bot"} onClick={handleToggleMode} disabled={togglingMode}>
                {selectedConv.mode === 'ai' ? 'Ambil Alih' : 'Kembali ke AI'}
              </Btn>
              <button
                onClick={() => setDeleteConfirmId(selectedConv.id)}
                title="Hapus percakapan"
                style={{ background: "transparent", border: `1px solid ${T.line}`, width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "grid", placeItems: "center", color: T.dim, flexShrink: 0, transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = `${T.red}55` }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.dim; e.currentTarget.style.borderColor = T.line }}
              >
                <Icon name="Trash2" size={15} color="currentColor" />
              </button>
              <div className="xl:hidden" onClick={() => setMobileView('panel')} style={{ cursor: "pointer", marginLeft: 8 }}><Icon name="Info" size={18} color={T.dim} /></div>
            </div>

            {/* Mode strip */}
            <div style={{ padding: "6px", textAlign: "center", background: selectedConv.mode === 'ai' ? "rgba(74,179,216,0.15)" : "rgba(245,158,11,0.15)", borderBottom: `1px solid ${selectedConv.mode === 'ai' ? T.sky : T.amber}33`, fontSize: 10, fontWeight: 700, color: selectedConv.mode === 'ai' ? T.sky : T.amber, textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Dot color={selectedConv.mode === 'ai' ? T.sky : T.amber} pulse={selectedConv.mode === 'ai'} size={6} />
              {selectedConv.mode === 'ai' ? 'AI sedang merespon otomatis' : 'Mode manual — AI dijeda'}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 12 }}>Belum ada pesan</div>
              ) : (
                messages.map((msg) => {
                  const isClient = msg.role === 'client'
                  return (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", maxWidth: "75%", alignSelf: isClient ? "flex-start" : "flex-end" }}>
                      <div style={{ padding: "10px 14px", borderRadius: 12, fontSize: 12.5, lineHeight: 1.5, background: isClient ? T.inset : (msg.role === 'ai' ? "rgba(74,179,216,0.15)" : T.sky), color: isClient ? T.txt : (msg.role === 'ai' ? T.txt : "#03203a"), border: `1px solid ${isClient ? T.line : (msg.role === 'ai' ? T.sky : "transparent")}`, borderBottomLeftRadius: isClient ? 2 : 12, borderBottomRightRadius: !isClient ? 2 : 12 }}>
                        {!isClient && (
                          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 4, color: msg.role === 'ai' ? T.sky : "rgba(0,0,0,0.5)" }}>
                            <Icon name={msg.role === 'ai' ? "Bot" : "UserSquare"} size={10} color={msg.role === 'ai' ? T.sky : "rgba(0,0,0,0.5)"} />
                            {msg.role === 'ai' ? 'AI Agent' : 'Operator'}
                            {msg.ai_confidence ? ` · ${Math.round(msg.ai_confidence * 100)}%` : ''}
                          </div>
                        )}
                        {(() => {
                          const meta = (msg.metadata || {}) as Record<string, unknown>
                          const str = (v: unknown) => (typeof v === 'string' ? v : '')
                          const pick = (...keys: string[]) => {
                            for (const k of keys) {
                              const v = str(meta[k]).trim()
                              if (v) return v
                            }
                            return ''
                          }
                          let mediaUrl = pick(
                            'mediaUrl', 'media_url', 'imageUrl', 'image_url', 'image',
                            'fileUrl', 'file_url', 'attachmentUrl', 'attachment_url', 'attachment', 'media', 'url',
                          )
                          const mediaType = pick('mediaType', 'media_type')
                          const content = str(msg.content).trim()
                          const imgRe = /\.(jpeg|jpg|gif|png|webp)(\?|$)/i
                          const fileRe = /\.(pdf|mp3|ogg|wav|m4a|opus|mp4|webm|doc|docx|xls|xlsx)(\?|$)/i
                          // Fallback: kalau body pesan sendiri adalah URL media.
                          if (!mediaUrl && /^https?:\/\/\S+$/i.test(content) && (imgRe.test(content) || fileRe.test(content))) {
                            mediaUrl = content
                          }
                          const isImage = !!mediaUrl && (imgRe.test(mediaUrl) || mediaType === 'image')
                          const showText = !!content && content !== mediaUrl
                          return (
                            <>
                              {showText && (
                                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                              )}
                              {mediaUrl && (
                                <div style={{ marginTop: showText ? 8 : 0 }}>
                                  {isImage ? (
                                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={mediaUrl}
                                        alt="attachment"
                                        loading="lazy"
                                        style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 220, objectFit: 'contain', display: 'block' }}
                                      />
                                    </a>
                                  ) : (
                                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.sky, textDecoration: 'underline', fontSize: 11, fontWeight: 600 }}>
                                      <Icon name="Paperclip" size={12} /> Buka Lampiran
                                    </a>
                                  )}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      <div style={{ fontSize: 9.5, color: T.dim, marginTop: 4, alignSelf: isClient ? "flex-start" : "flex-end", display: "flex", alignItems: "center", gap: 4 }}>
                        {formatTime(msg.created_at)}
                        {!isClient && <Icon name="CheckCheck" size={13} color={T.sky} style={{ opacity: 0.9 }} />}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* New messages pill */}
            {!shouldAutoScroll && unseenCount > 0 && (
              <button onClick={scrollToBottom} style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", background: T.panel, border: `1px solid ${T.sky}55`, color: T.sky, borderRadius: 999, cursor: "pointer", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <Icon name="ChevronDown" size={12} color={T.sky} /> {unseenCount} pesan baru
              </button>
            )}

            {/* Input */}
            <div style={{ padding: "12px 20px", background: T.panel, borderTop: `1px solid ${T.line}`, zIndex: 10 }}>
              {selectedConv.mode === 'ai' ? (
                <Btn v="primary" style={{ width: "100%", justifyContent: "center", background: "rgba(245,158,11,0.15)", color: T.amber, border: `1px solid ${T.amber}55` }} icon="UserSquare" onClick={handleToggleMode} disabled={togglingMode}>Ambil alih untuk membalas manual</Btn>
              ) : (
                <>
                  {showQuickReplies && quickReplies.length > 0 && (
                    <div className="custom-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
                      {quickReplies.map((qr) => (
                        <Tag key={qr.id} color={T.dim} onClick={() => { setMessageInput(qr.content); setShowQuickReplies(false); }} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>{qr.title}</Tag>
                      ))}
                    </div>
                  )}
                  {selectedFile && (
                    <div style={{ padding: "8px 12px", background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: T.txt }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icon name="FileText" size={14} color={T.sky} />
                        <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.name}</span>
                      </div>
                      <Icon name="X" size={14} color={T.dim} style={{ cursor: "pointer" }} onClick={() => setSelectedFile(null)} />
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 12, padding: "6px" }}>
                    <button onClick={() => setShowQuickReplies(!showQuickReplies)} style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: T.dim }}><Icon name="Zap" size={18} color={T.dim} /></button>
                    
                    <input type="file" ref={fileInputRef} hidden onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setShowAttachMenu(false); }} />
                    <div style={{ position: "relative" }}>
                      <button onClick={() => setShowAttachMenu(!showAttachMenu)} style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: selectedFile || showAttachMenu ? T.sky : T.dim }}>
                        <Icon name="Paperclip" size={18} color={selectedFile || showAttachMenu ? T.sky : T.dim} />
                      </button>
                      
                      {showAttachMenu && (
                        <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 8, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 4, minWidth: 160, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 50 }}>
                          {[
                            { id: 'image/*', icon: 'Image' as const, label: 'Gambar', color: T.sky },
                            { id: '*', icon: 'FileText' as const, label: 'Dokumen', color: "#3b82f6" },
                            { id: 'audio/*', icon: 'Headphones' as const, label: 'Audio', color: T.amber }
                          ].map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.accept = item.id;
                                  fileInputRef.current.click();
                                }
                              }}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, textAlign: "left" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = T.inset}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <Icon name={item.icon} size={16} color={item.color} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: T.txt }}>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <textarea rows={1} value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Ketik pesan..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.txt, fontSize: 12.5, fontFamily: T.font, resize: "none", maxHeight: 120, padding: "8px 0" }} disabled={uploading} />
                    
                    <button onClick={handleSendMessage} disabled={(!messageInput.trim() && !selectedFile) || uploading} style={{ background: (messageInput.trim() || selectedFile) ? T.sky : T.line, color: (messageInput.trim() || selectedFile) ? "#03203a" : T.dim, border: "none", width: 34, height: 34, borderRadius: 9, cursor: (messageInput.trim() || selectedFile) && !uploading ? "pointer" : "not-allowed", display: "grid", placeItems: "center" }}>
                      {uploading ? <Dot color="#03203a" pulse size={6} /> : <Icon name="Send" size={14} color={(messageInput.trim() || selectedFile) ? "#03203a" : T.dim} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 12, background: T.bgGrad }}>
            <div style={{ textAlign: "center" }}>
              <Icon name="MessageSquare" size={32} color={T.dim} style={{ opacity: 0.5, marginBottom: 12 }} />
              <div>Pilih percakapan untuk memulai</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Column 3: Contact / Control Panel ─────────────────── */}
      <div className={panelVisibility} style={{ width: isMobile && mobileView === 'panel' ? '100%' : 280, maxWidth: isMobile && mobileView === 'panel' ? '100%' : 280, flexShrink: 0, flexDirection: "column", background: T.sidebar, borderLeft: `1px solid ${T.line}`, zIndex: 10 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="xl:hidden" onClick={() => setMobileView('chat')} style={{ cursor: "pointer", color: T.dim }}><Icon name="ArrowLeft" size={18} color={T.dim} /></div>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.txt }}>Info Kontak</span>
        </div>
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {selectedConv ? (
            <>
              <div style={{ textAlign: "center", padding: "20px 10px", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, marginBottom: 16 }}>
                <Avatar initials={(selectedConv.client_name || '?').charAt(0).toUpperCase()} color={statusColor[selectedConv.status] || T.sky} size={64} />
                <div style={{ fontSize: 15, fontWeight: 800, color: T.txt, marginTop: 12 }}>{selectedConv.client_name || 'Pelanggan'}</div>
                <div style={{ fontSize: 11, color: T.dim, fontFamily: T.mono, marginTop: 4 }}>{selectedConv.id}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, border: `1px solid ${selectedConv.mode === 'ai' ? T.sky : T.amber}55`, background: selectedConv.mode === 'ai' ? "rgba(74,179,216,0.15)" : "rgba(245,158,11,0.15)", color: selectedConv.mode === 'ai' ? T.sky : T.amber, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12 }}>
                  <Icon name={selectedConv.mode === 'ai' ? "Bot" : "UserSquare"} size={12} color={selectedConv.mode === 'ai' ? T.sky : T.amber} />
                  {selectedConv.mode === 'ai' ? 'Ditangani AI' : 'Manual'}
                </div>
              </div>

              <Btn v={selectedConv.mode === 'ai' ? 'primary' : 'ghost'} style={{ width: "100%", justifyContent: "center", marginBottom: 16 }} icon={selectedConv.mode === 'ai' ? "UserSquare" : "Bot"} onClick={handleToggleMode} disabled={togglingMode}>
                {selectedConv.mode === 'ai' ? 'Ambil Alih Percakapan' : 'Kembalikan ke AI'}
              </Btn>

              {(projectType || estimatedValue) && (
                <Panel pad={16} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Info Proyek</div>
                  {projectType && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Icon name="Target" size={14} color={T.dim} /><span style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>{projectType}</span>
                    </div>
                  )}
                  {estimatedValue && (
                    <div style={{ paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
                      <div style={{ fontSize: 10, color: T.dim, marginBottom: 4 }}>Estimasi Budget</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.sky }}>{estimatedValue}</div>
                    </div>
                  )}
                </Panel>
              )}

              <Panel pad={16}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>AI Confidence</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.sky, fontFamily: T.mono }}>{aiConfidence !== null ? `${aiConfidence}%` : 'N/A'}</span>
                </div>
                <ProgBar value={aiConfidence ?? 0} color={T.sky} h={6} />
                <div style={{ fontSize: 10.5, color: T.dim, marginTop: 10, lineHeight: 1.4 }}>Rata-rata kepercayaan model AI untuk percakapan ini.</div>
              </Panel>

              {/* ── AI Analyst — Rangkuman Percakapan → Spreadsheet ── */}
              <Panel pad={16} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icon name="Sparkles" size={14} color={T.sky} />
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Analyst</span>
                </div>

                {!analysis ? (
                  <>
                    <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5, marginBottom: 12 }}>
                      Rangkum percakapan jadi data terstruktur (status, proyek, estimasi, progress) untuk dikirim ke spreadsheet.
                    </div>
                    <Btn v="primary" style={{ width: '100%', justifyContent: 'center' }} icon="Sparkles" onClick={handleAnalyze} disabled={analyzing || messages.length === 0}>
                      {analyzing ? 'Menganalisa...' : 'Generate Rangkuman'}
                    </Btn>
                  </>
                ) : (
                  <>
                    {analysis.status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, padding: '3px 10px', borderRadius: 999, background: `${statusColor[(analysis.status || '').toLowerCase()] || T.sky}22`, color: statusColor[(analysis.status || '').toLowerCase()] || T.sky, border: `1px solid ${statusColor[(analysis.status || '').toLowerCase()] || T.sky}55` }}>{analysis.status}</span>
                        {analysis.progress_pct !== undefined && analysis.progress_pct !== '' && (
                          <span style={{ fontSize: 11, color: T.dim, fontFamily: T.mono }}>{analysis.progress_pct}%</span>
                        )}
                      </div>
                    )}
                    {analysis.ringkasan && (
                      <div style={{ fontSize: 11.5, color: T.txt, lineHeight: 1.55, background: T.inset, border: `1px solid ${T.line}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>{analysis.ringkasan}</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                      {[
                        ['Proyek', analysis.project_type],
                        ['Lokasi', analysis.lokasi],
                        ['Luas', analysis.luas_m2 ? `${analysis.luas_m2} m²` : ''],
                        ['Estimasi', analysis.estimasi_value],
                        ['Tahap', analysis.design_stage],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
                          <span style={{ color: T.dim }}>{k}</span>
                          <span style={{ color: T.txt, fontWeight: 600, textAlign: 'right' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: T.green, marginBottom: 10 }}>
                      <Icon name="CheckCircle2" size={13} color={T.green} />
                      Tersimpan ke Dashboard & terkirim ke Spreadsheet
                    </div>
                    <Btn v="ghost" size="sm" style={{ width: '100%', justifyContent: 'center' }} icon="RefreshCw" onClick={handleAnalyze} disabled={analyzing}>
                      {analyzing ? 'Menganalisa...' : 'Generate Ulang'}
                    </Btn>
                  </>
                )}
                {analysisErr && (
                  <div style={{ fontSize: 10.5, color: T.red, marginTop: 10, lineHeight: 1.4 }}>{analysisErr}</div>
                )}
              </Panel>
            </>
          ) : (
            <div style={{ textAlign: "center", color: T.dim, fontSize: 11, marginTop: 40 }}>Pilih percakapan</div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {deleteConfirmId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.panel, padding: 32, borderRadius: 20, width: "100%", maxWidth: 400, border: `1px solid ${T.line}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${T.red}20`, color: T.red, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Icon name="Trash2" size={30} color={T.red} />
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 12px", color: T.txt }}>Hapus Percakapan?</h3>
            <p style={{ fontSize: 13, color: T.dim, margin: "0 0 24px", lineHeight: 1.5 }}>
              Seluruh pesan dalam percakapan ini akan ikut terhapus permanen dan tidak dapat dikembalikan.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDeleteConfirmId(null)} disabled={deleting} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${T.line}`, background: "transparent", color: T.txt, fontWeight: 700, fontSize: 13, cursor: deleting ? "not-allowed" : "pointer", fontFamily: T.font }}>
                Batal
              </button>
              <button onClick={handleDeleteConversation} disabled={deleting} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: T.red, color: "#fff", fontWeight: 700, fontSize: 13, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1, fontFamily: T.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {deleting ? <Dot color="#fff" pulse size={6} /> : <Icon name="Trash2" size={14} color="#fff" />}
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirmation Modal ────────────────────── */}
      {showBulkConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.panel, padding: 32, borderRadius: 20, width: "100%", maxWidth: 400, border: `1px solid ${T.line}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${T.red}20`, color: T.red, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Icon name="Trash2" size={30} color={T.red} />
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 12px", color: T.txt }}>Hapus {selectedIds.size} Percakapan?</h3>
            <p style={{ fontSize: 13, color: T.dim, margin: "0 0 24px", lineHeight: 1.5 }}>
              Seluruh pesan dari {selectedIds.size} percakapan terpilih akan ikut terhapus permanen dan tidak dapat dikembalikan.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowBulkConfirm(false)} disabled={deleting} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${T.line}`, background: "transparent", color: T.txt, fontWeight: 700, fontSize: 13, cursor: deleting ? "not-allowed" : "pointer", fontFamily: T.font }}>
                Batal
              </button>
              <button onClick={handleBulkDelete} disabled={deleting} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: T.red, color: "#fff", fontWeight: 700, fontSize: 13, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1, fontFamily: T.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {deleting ? <Dot color="#fff" pulse size={6} /> : <Icon name="Trash2" size={14} color="#fff" />}
                {deleting ? "Menghapus..." : "Ya, Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatMonitoring
