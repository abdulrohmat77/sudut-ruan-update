import React, { useEffect } from 'react'
import { T } from './AcosUI'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  FileText, 
  PieChart, 
  Activity, 
  Settings
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

const sections: MenuSection[] = [
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
    ],
  },
  {
    title: 'SISTEM',
    items: [
      { id: 'settings', icon: <Settings size={20} />, label: 'Pengaturan' },
    ],
  },
]

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
        className={`fixed left-0 top-0 h-full w-[264px] flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: T.sidebar }}
      >
        {/* Logo */}
        <div className="h-14 px-md flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: T.line }}>
          <div className="flex items-center gap-sm min-w-0">
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-sm">
          {sections.map((section) => (
            <div key={section.title} className="mb-1">
              <p className="px-md pt-md pb-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: T.dim }}>
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = currentPage === item.id
                const badge = item.badgeKey === 'chat' ? chatBadge : 0
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`relative w-full flex items-center gap-sm px-md py-2.5 text-[13px] font-medium transition-colors ${
                      isActive ? 'bg-brand-accent/12' : 'hover:bg-black/5'
                    }`}
                    style={{ color: isActive ? (T.tint || T.sky) : T.sub }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-accent rounded-r" />
                    )}
                    <div
                      className="flex items-center justify-center"
                      style={{ color: isActive ? T.sky : T.sub }}
                    >
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto bg-brand-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer: status + user */}
        <div className="p-md space-y-sm" style={{ borderTop: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-xs">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: T.dim }}>
              System Active
            </span>
          </div>
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0">
              {(userEmail || 'SR').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate" style={{ color: T.txt }}>Admin Studio</p>
              <p className="text-[11px] truncate" style={{ color: T.dim }}>{userEmail || 'Owner'}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
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
