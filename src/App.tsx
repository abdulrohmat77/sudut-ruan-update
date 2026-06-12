import { useState, useEffect, useRef, Component, ReactNode } from 'react'
import { T, applyTheme } from './components/AcosUI'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import NotificationToasts from './components/NotificationToasts'
import Dashboard from './pages/Dashboard'
import ChatMonitoring from './pages/ChatMonitoring'
import Pipeline from './pages/Pipeline'
import Documents from './pages/Documents'
import Estimator from './pages/Estimator'
import Projects from './pages/Projects'
import Finance from './pages/Finance'
import AIStudio from './pages/AIStudio'
import Analytics from './pages/Analytics'
import AutomationLog from './pages/AutomationLog'
import Settings from './pages/Settings'
import LoginPage from './pages/LoginPage'
import InvoiceBuilder from './pages/InvoiceBuilder'
import SpkBuilder from './pages/SpkBuilder'
import ProposalBuilder from './pages/ProposalBuilder'
import CustomerCRM from './pages/CustomerCRM'
import { SpkPrefill, InvoicePrefill } from './services/spkData'
import { supabase, AIConfigService } from './services/supabaseClient'
import { authService } from './services/auth'
import { playNotificationSound, primeAudio, showBrowserNotification } from './services/notify'
import { AppNotification, ToastItem } from './types/notification'

export type PageType =
  | 'dashboard'
  | 'chat-monitoring'
  | 'pipeline'
  | 'customer-crm'
  | 'estimator'
  | 'documents'
  | 'finance'
  | 'projects'
  | 'ai-studio'
  | 'analytics'
  | 'automation'
  | 'settings'
  | 'invoice-builder'
  | 'spk-builder'
  | 'proposal-builder'

const pageTitles: Record<PageType, string> = {
  dashboard: 'Command Center',
  'chat-monitoring': 'Active Chats',
  pipeline: 'Client CRM',
  'customer-crm': 'Customer CRM',
  estimator: 'AI Estimator',
  documents: 'Dokumen & SPK',
  finance: 'Finance',
  projects: 'Projects',
  'ai-studio': 'AI Studio',
  analytics: 'Analitik & KPI',
  automation: 'Pusat Automasi',
  settings: 'Pengaturan',
  'invoice-builder': 'Buat Invoice',
  'spk-builder': 'Buat SPK',
  'proposal-builder': 'Proposal Generator',
}

class PageErrorBoundary extends Component<
  { children: ReactNode; pageKey: string },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode; pageKey: string }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }

  componentDidUpdate(prevProps: { pageKey: string }) {
    if (prevProps.pageKey !== this.props.pageKey && this.state.hasError) {
      this.setState({ hasError: false, error: '' })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-gutter">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-5xl text-error">error</span>
            <h3 className="text-headline-sm font-bold mt-md mb-sm">Halaman gagal dimuat</h3>
            <p className="text-body-md text-on-surface-variant mb-md">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-md py-2 bg-primary text-on-primary rounded-lg font-bold hover:opacity-90"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [authed, setAuthed] = useState<boolean>(() => authService.isAuthenticated())
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [spkPrefill, setSpkPrefill] = useState<SpkPrefill | null>(null)
  const [invoicePrefill, setInvoicePrefill] = useState<InvoicePrefill | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('sidebar_collapsed') === '1')
  const toggleSidebarCollapse = () =>
    setSidebarCollapsed((c) => {
      const next = !c
      localStorage.setItem('sidebar_collapsed', next ? '1' : '0')
      return next
    })
  const [chatBadge, setChatBadge] = useState(0)
  const [logo, setLogo] = useState<string>('')
  
  // ACOS Theme Logic — single source of truth in localStorage
  const [theme, setThemeState] = useState(() => localStorage.getItem('acos_theme') || 'Gelap')
  const [density, setDensityState] = useState(() => localStorage.getItem('acos_density') || 'Nyaman')
  
  // Apply theme IMMEDIATELY on first render (synchronous, before paint)
  applyTheme(localStorage.getItem('acos_theme') || 'Gelap', localStorage.getItem('acos_density') || 'Nyaman');

  // Search + conversation targeting for ChatMonitoring
  const [chatSearch, setChatSearch] = useState('')
  const [chatSearchNonce, setChatSearchNonce] = useState(0)
  const [chatTargetId, setChatTargetId] = useState<string | null>(null)
  const [chatTargetNonce, setChatTargetNonce] = useState(0)

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenRef = useRef<Map<string, string>>(new Map())
  const notifInitRef = useRef(false)
  const knownNotifIds = useRef<Set<string>>(new Set())

  const session = authService.getSession()

  // Unlock audio + load logo on first authed render
  useEffect(() => {
    if (!authed) return
    AIConfigService.get('company_logo').then((v) => v && setLogo(v))
    const unlock = () => primeAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    
    const themeListener = () => {
      // Read DIRECTLY from localStorage — always accurate, no stale closure
      const newTheme = localStorage.getItem('acos_theme') || 'Gelap'
      const newDensity = localStorage.getItem('acos_density') || 'Nyaman'
      // Apply IMMEDIATELY (sync) before React re-render
      applyTheme(newTheme, newDensity)
      // Then update state so components re-render with new T values
      setThemeState(newTheme)
      setDensityState(newDensity)
    };
    window.addEventListener('themeChanged', themeListener);
    
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('themeChanged', themeListener)
    }
  }, [authed])

  const dismissToast = (id: string) => setToasts((ts) => ts.filter((t) => t.id !== id))

  // Poll conversations: sidebar badge + new-message notifications
  useEffect(() => {
    if (!authed) return

    const poll = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id, client_name, last_message, last_message_at, unread_count')
        .order('last_message_at', { ascending: false })
        .limit(50)
      if (!data) return

      setChatBadge(data.filter((c) => (c.unread_count || 0) > 0).length)

      const fresh: AppNotification[] = []
      for (const c of data) {
        const prev = seenRef.current.get(c.id)
        const t: string = c.last_message_at || ''
        if (notifInitRef.current) {
          const isNew = prev === undefined || (t !== '' && t > prev)
          const notifId = `${c.id}-${t}`
          if (isNew && (c.unread_count || 0) > 0 && !knownNotifIds.current.has(notifId)) {
            knownNotifIds.current.add(notifId)
            fresh.push({
              id: notifId,
              conversationId: c.id,
              title: c.client_name || 'Pelanggan',
              body: c.last_message || 'Pesan baru masuk',
              time: t || new Date().toISOString(),
              read: false,
            })
          }
        }
        if (t) seenRef.current.set(c.id, t)
      }

      if (!notifInitRef.current) {
        notifInitRef.current = true
        return
      }

      if (fresh.length > 0) {
        setNotifications((prev) => [...fresh, ...prev].slice(0, 50))
        setToasts((prev) => [...prev, ...fresh.map((n) => ({ id: n.id, title: n.title, body: n.body }))])
        playNotificationSound()
        fresh.forEach((n) => showBrowserNotification(`Pesan baru — ${n.title}`, n.body))
        fresh.forEach((n) => setTimeout(() => dismissToast(n.id), 6000))
      }
    }

    poll()
    pollRef.current = setInterval(poll, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [authed])

  const handleLogout = () => {
    authService.logout()
    setAuthed(false)
    setCurrentPage('dashboard')
    setIsSidebarOpen(false)
    setNotifications([])
    setToasts([])
    notifInitRef.current = false
    seenRef.current.clear()
    knownNotifIds.current.clear()
  }

  const handleTopbarSearch = (query: string) => {
    setChatSearch(query)
    setChatSearchNonce((n) => n + 1)
    setCurrentPage('chat-monitoring')
  }

  const openConversation = (conversationId: string) => {
    setChatTargetId(conversationId)
    setChatTargetNonce((n) => n + 1)
    setNotifications((prev) =>
      prev.map((n) => (n.conversationId === conversationId ? { ...n, read: true } : n)),
    )
    setCurrentPage('chat-monitoring')
  }

  const handleToastClick = (toastId: string) => {
    const notif = notifications.find((n) => n.id === toastId)
    dismissToast(toastId)
    if (notif) openConversation(notif.conversationId)
  }

  const markAllNotificationsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  const clearNotifications = () => setNotifications([])

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />
      case 'chat-monitoring':
        return (
          <ChatMonitoring
            initialSearch={chatSearch}
            searchNonce={chatSearchNonce}
            targetConversationId={chatTargetId}
            targetNonce={chatTargetNonce}
          />
        )
      case 'pipeline':
        return <Pipeline />
      case 'customer-crm':
        return <CustomerCRM onNavigate={setCurrentPage} />
      case 'estimator':
        return <Estimator onCreateSpk={(p) => { setSpkPrefill(p); setCurrentPage('spk-builder') }} />
      case 'documents':
        return <Documents
          onNavigate={(p) => { if (p === 'spk-builder') setSpkPrefill(null); if (p === 'invoice-builder') setInvoicePrefill(null); setCurrentPage(p) }}
          onContinueToSpk={(p) => { setSpkPrefill(p); setCurrentPage('spk-builder') }}
          onContinueToInvoice={(p) => { setInvoicePrefill(p); setCurrentPage('invoice-builder') }}
        />
      case 'finance':
        return <Finance onNavigate={(p) => { if (p === 'invoice-builder') setInvoicePrefill(null); setCurrentPage(p) }} />
      case 'projects':
        return <Projects />
      case 'ai-studio':
        return <AIStudio />
      case 'invoice-builder':
        return <InvoiceBuilder prefill={invoicePrefill} onBack={() => setCurrentPage('documents')} />
      case 'spk-builder':
        return <SpkBuilder prefill={spkPrefill} onBack={() => setCurrentPage('documents')} onCreateInvoice={(p) => { setInvoicePrefill(p); setCurrentPage('invoice-builder') }} />
      case 'proposal-builder':
        return <ProposalBuilder onBack={() => setCurrentPage('documents')} onCreateSpk={(p) => { setSpkPrefill(p); setCurrentPage('spk-builder') }} />
      case 'analytics':
        return <Analytics />
      case 'automation':
        return <AutomationLog />
      case 'settings':
        return <Settings onLogoChange={setLogo} theme={theme} density={density} />
      default:
        return <Dashboard onNavigate={setCurrentPage} />
    }
  }

  const isFullscreenPage = currentPage === 'chat-monitoring'

  return (
    <div className="h-full overflow-hidden" style={{ background: T.bg, color: T.txt }}>
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
        chatBadge={chatBadge}
        userEmail={session?.email}
        onLogout={handleLogout}
        logo={logo}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <main className={`${sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-[264px]'} h-full flex flex-col min-h-0 transition-[margin] duration-300`}>
        <TopBar
          title={pageTitles[currentPage]}
          onMobileMenuClick={() => setIsSidebarOpen(true)}
          onSearch={handleTopbarSearch}
          notifications={notifications}
          onOpenConversation={openConversation}
          onMarkAllRead={markAllNotificationsRead}
          onClearNotifications={clearNotifications}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <PageErrorBoundary pageKey={currentPage}>
            {isFullscreenPage ? (
              <div className="h-full">{renderPage()}</div>
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar">{renderPage()}</div>
            )}
          </PageErrorBoundary>
        </div>
      </main>

      <NotificationToasts toasts={toasts} onClick={handleToastClick} onDismiss={dismissToast} />
    </div>
  )
}

export default App
