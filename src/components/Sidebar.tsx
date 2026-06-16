import React, { useEffect, useState, useRef } from 'react'
import { T } from './AcosUI'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  FileText, 
  PieChart, 
  Activity, 
  Settings,
  Calculator,
  Bot,
  Sparkles,
  Wand2,
  BookOpen,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { PageType } from '../App'

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
  isMobileOpen: boolean
  onMobileClose: () => void
  chatBadge?: number
  userEmail?: string
  onLogout?: () => void
  logo?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

interface MenuItem {
  id: PageType
  icon: React.ReactNode
  label: string
  badgeKey?: 'chat'
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const DEFAULT_SECTIONS: MenuSection[] = [
  {
    title: 'PUSAT',
    items: [
      { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Command Center' },
      { id: 'chat-monitoring', icon: <MessageSquare size={20} />, label: 'Active Chats', badgeKey: 'chat' },
    ],
  },
  {
    title: 'SALES & KLIEN',
    items: [
      { id: 'pipeline', icon: <Users size={20} />, label: 'CRM & Leads' },
      { id: 'customer-crm', icon: <Sparkles size={20} />, label: 'Customer CRM (AI)' },
      { id: 'estimator', icon: <Calculator size={20} />, label: 'AI Estimator' },
    ],
  },
  {
    title: 'DOKUMEN',
    items: [
      { id: 'documents', icon: <FileText size={20} />, label: 'Dokumen & SPK' },
    ],
  },
  {
    title: 'INTELIJEN',
    items: [
      { id: 'analytics', icon: <PieChart size={20} />, label: 'Analitik & KPI' },
      { id: 'automation', icon: <Activity size={20} />, label: 'Pusat Automasi' },
      { id: 'ai-studio', icon: <Bot size={20} />, label: 'AI Studio' },
      { id: 'ai-content', icon: <Wand2 size={20} />, label: 'AI Content Engine' },
      { id: 'knowledge', icon: <BookOpen size={20} />, label: 'Knowledge AI' },
    ],
  },
  {
    title: 'SISTEM',
    items: [
      { id: 'settings', icon: <Settings size={20} />, label: 'Pengaturan' },
    ],
  },
]

// Load saved order per section from localStorage
const SIDEBAR_VERSION = '6' // bump this when menu structure changes
function loadSectionOrder(): Record<string, PageType[]> {
  try {
    const ver = localStorage.getItem('sidebar_version')
    if (ver !== SIDEBAR_VERSION) {
      // Menu structure changed — reset customizations
      localStorage.removeItem('sidebar_section_order')
      localStorage.removeItem('sidebar_hidden')
      localStorage.setItem('sidebar_version', SIDEBAR_VERSION)
      return {}
    }
    const raw = localStorage.getItem('sidebar_section_order')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveSectionOrder(data: Record<string, PageType[]>) {
  localStorage.setItem('sidebar_section_order', JSON.stringify(data))
}

function loadHidden(): Set<PageType> {
  try {
    const raw = localStorage.getItem('sidebar_hidden')
    if (raw) {
      // Only keep IDs that actually exist in DEFAULT_SECTIONS
      const allIds = new Set(DEFAULT_SECTIONS.flatMap((s) => s.items.map((i) => i.id)))
      const parsed = JSON.parse(raw) as string[]
      return new Set(parsed.filter((id) => allIds.has(id as PageType)) as PageType[])
    }
  } catch { /* ignore */ }
  return new Set()
}

function saveHidden(hidden: Set<PageType>) {
  localStorage.setItem('sidebar_hidden', JSON.stringify(Array.from(hidden)))
}

function getOrderedItems(section: MenuSection, sectionOrders: Record<string, PageType[]>): MenuItem[] {
  const saved = sectionOrders[section.title]
  if (!saved) return section.items
  // Maintain saved order, add new items at end
  const idSet = new Set(section.items.map((i) => i.id))
  const lookup = Object.fromEntries(section.items.map((i) => [i.id, i]))
  const ordered = saved.filter((id) => idSet.has(id)).map((id) => lookup[id]).filter(Boolean) as MenuItem[]
  const missing = section.items.filter((i) => !saved.includes(i.id))
  return [...ordered, ...missing]
}

const BrandMark: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M2 18L10 2L18 18"
      stroke="#3DB87A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M5 13H15" stroke="#3DB87A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  isMobileOpen,
  onMobileClose,
  chatBadge = 0,
  userEmail,
  onLogout,
  logo,
  collapsed = false,
  onToggleCollapse,
}) => {
  // Close drawer on Escape (mobile)
  useEffect(() => {
    if (!isMobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobileOpen, onMobileClose])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (isMobileOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isMobileOpen])

  const handleSelect = (id: PageType) => {
    onPageChange(id)
    onMobileClose()
  }

  // Customizable menu order + visibility (per section)
  const [sectionOrders, setSectionOrders] = useState<Record<string, PageType[]>>(() => loadSectionOrder())
  const [hidden, setHidden] = useState<Set<PageType>>(() => loadHidden())
  const [editMode, setEditMode] = useState(false)
  const dragRef = useRef<{ id: PageType; section: string } | null>(null)

  const handleDrop = (targetId: PageType, sectionTitle: string) => {
    const from = dragRef.current
    if (!from || from.id === targetId || from.section !== sectionTitle) return
    setSectionOrders((prev) => {
      const section = DEFAULT_SECTIONS.find((s) => s.title === sectionTitle)
      if (!section) return prev
      const current = getOrderedItems(section, prev).map((i) => i.id)
      const fromIdx = current.indexOf(from.id)
      const toIdx = current.indexOf(targetId)
      if (fromIdx < 0 || toIdx < 0) return prev
      current.splice(fromIdx, 1)
      current.splice(toIdx, 0, from.id)
      const next = { ...prev, [sectionTitle]: current }
      saveSectionOrder(next)
      return next
    })
    dragRef.current = null
  }

  const toggleHidden = (id: PageType) => {
    setHidden((prev: Set<PageType>) => {
      const next = new Set<PageType>(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveHidden(next)
      return next
    })
  }

  const handleReset = () => {
    setSectionOrders({})
    setHidden(new Set())
    saveSectionOrder({})
    saveHidden(new Set())
  }

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-brand-dark/50 z-40 md:hidden backdrop-blur-[1px]"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-[264px] ${collapsed ? 'md:w-[76px]' : 'md:w-[264px]'} flex flex-col z-50 transition-all duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: T.sidebar }}
      >
        {/* Logo */}
        <div className={`h-14 px-md flex items-center ${collapsed ? 'md:justify-center' : 'justify-between'} border-b flex-shrink-0`} style={{ borderColor: T.line }}>
          <div className={`flex items-center gap-sm min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-brand-accent/15 border border-brand-accent/25 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <BrandMark />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-serif-display text-[18px] leading-none truncate" style={{ color: T.txt }}>
                Sudut Ruang
              </h1>
              <span className="text-[10px] tracking-wide" style={{ color: T.dim }}>AI Ecosystem</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Collapse toggle (desktop) */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-2 rounded-lg hover:bg-black/10 transition-colors"
              style={{ color: T.dim }}
              aria-label={collapsed ? 'Lebarkan menu' : 'Perkecil menu'}
              title={collapsed ? 'Lebarkan menu' : 'Perkecil menu'}
            >
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
            {/* Close button (mobile only) */}
            <button
              onClick={onMobileClose}
              className="md:hidden -mr-1 p-2 rounded-lg hover:bg-black/10"
              style={{ color: T.dim }}
              aria-label="Tutup menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Nav — Sections preserved, items reorderable */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-sm">
          {editMode && (
            <div className="px-3 mb-2">
              <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${collapsed ? 'md:hidden' : ''}`} style={{ color: T.amber }}>MODE EDIT — Drag item dalam section</div>
            </div>
          )}
          {DEFAULT_SECTIONS.map((section) => {
            const items = getOrderedItems(section, sectionOrders)
            const visibleItems = editMode ? items : items.filter((i) => !hidden.has(i.id))
            if (!editMode && visibleItems.length === 0) return null
            return (
              <div key={section.title} className="mb-1">
                <p className={`px-md pt-md pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${collapsed ? 'md:hidden' : ''}`} style={{ color: T.dim }}>
                  {section.title}
                </p>
                {(editMode ? items : visibleItems).map((item) => {
                  const isActive = currentPage === item.id
                  const badge = item.badgeKey === 'chat' ? chatBadge : 0
                  const isHidden = hidden.has(item.id)
                  return (
                    <div
                      key={item.id}
                      draggable={editMode}
                      onDragStart={(e) => { dragRef.current = { id: item.id, section: section.title }; e.dataTransfer.effectAllowed = 'move' }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                      onDrop={(e) => { e.preventDefault(); handleDrop(item.id, section.title) }}
                      style={{ opacity: isHidden ? 0.4 : 1 }}
                    >
                      <button
                        onClick={() => editMode ? undefined : handleSelect(item.id)}
                        title={collapsed ? item.label : undefined}
                        className={`relative w-full flex items-center gap-sm px-md py-2.5 text-[13px] font-medium transition-colors ${collapsed ? 'md:justify-center md:px-0' : ''} ${
                          !editMode && isActive ? 'bg-brand-accent/12' : 'hover:bg-black/5'
                        }`}
                        style={{ color: !editMode && isActive ? (T.tint || T.sky) : T.sub, cursor: editMode ? 'grab' : 'pointer' }}
                      >
                        {!editMode && isActive && (
                          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-accent rounded-r" />
                        )}
                        {editMode && (
                          <span className={`flex-shrink-0 ${collapsed ? 'md:hidden' : ''}`} style={{ color: T.dim, cursor: 'grab', fontSize: 14 }}>⠿</span>
                        )}
                        <div className="flex items-center justify-center relative" style={{ color: !editMode && isActive ? T.sky : T.sub }}>
                          {item.icon}
                          {badge > 0 && collapsed && !editMode && (
                            <span className="hidden md:block absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-accent" />
                          )}
                        </div>
                        <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                        {editMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHidden(item.id) }}
                            className={`ml-auto flex-shrink-0 ${collapsed ? 'md:hidden' : ''}`}
                            title={isHidden ? 'Tampilkan' : 'Sembunyikan'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: isHidden ? T.dim : T.green, fontSize: 13 }}
                          >
                            {isHidden ? '○' : '●'}
                          </button>
                        )}
                        {!editMode && badge > 0 && (
                          <span className={`ml-auto bg-brand-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${collapsed ? 'md:hidden' : ''}`}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
          <div className={`px-md pt-3 ${collapsed ? 'md:hidden' : ''}`}>
            <button
              onClick={() => setEditMode(!editMode)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors"
              style={{ background: editMode ? `${T.amber}22` : T.inset, border: `1px solid ${editMode ? T.amber : T.line}`, color: editMode ? T.amber : T.dim, cursor: 'pointer' }}
            >
              {editMode ? '✓ Selesai' : '⚙ Atur Menu'}
            </button>
            {editMode && (
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-2 mt-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors"
                style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.dim, cursor: 'pointer' }}
              >
                ↺ Reset Default
              </button>
            )}
          </div>
        </nav>

        {/* Footer: status + user */}
        <div className="p-md space-y-sm" style={{ borderTop: `1px solid ${T.line}` }}>
          <div className={`flex items-center gap-xs ${collapsed ? 'md:hidden' : ''}`}>
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: T.dim }}>
              System Active
            </span>
          </div>
          <div className={`flex items-center gap-sm ${collapsed ? 'md:justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0">
              {(userEmail || 'SR').charAt(0).toUpperCase()}
            </div>
            <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
              <p className="text-[13px] font-medium truncate" style={{ color: T.txt }}>Admin Studio</p>
              <p className="text-[11px] truncate" style={{ color: T.dim }}>{userEmail || 'Owner'}</p>
            </div>
            <button
              onClick={onLogout}
              className={`p-2 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0 ${collapsed ? 'md:hidden' : ''}`}
              style={{ color: T.sub }}
              aria-label="Keluar"
              title="Keluar"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
