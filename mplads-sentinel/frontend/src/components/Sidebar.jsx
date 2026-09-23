import {
  LayoutDashboard, Table2, AlertTriangle, Map, ChevronRight, Shield,
  RefreshCw, Database, IndianRupee, Activity, BarChart3, User,
  ClipboardCheck, History, Scale, Lock, LogOut, X
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useRole } from '../context/RoleContext'

const ALL_NAV_SECTIONS = [
  {
    label: 'Governance',
    items: [
      { id: 'dashboard',     label: 'Executive Overview',        shortLabel: 'Dashboard',  icon: LayoutDashboard },
      { id: 'projects',      label: 'Projects Ledger',           shortLabel: 'Projects',   icon: Table2 },
      { id: 'anomalies',     label: 'Risk & Anomaly Center',     shortLabel: 'Anomalies',  icon: AlertTriangle, badge: 'AI' },
      { id: 'map',           label: 'Geospatial Intelligence',   shortLabel: 'Geo Map',    icon: Map },
    ],
  },
  {
    label: 'Fund Management',
    items: [
      { id: 'fund_flow',     label: 'Fund Utilization',          shortLabel: 'Fund Flow',  icon: IndianRupee },
      { id: 'work_progress', label: 'Work Progress',             shortLabel: 'Progress',   icon: Activity },
    ],
  },
  {
    label: 'Decision Support',
    items: [
      { id: 'case_management', label: 'Verification Cases',      shortLabel: 'Cases',      icon: ClipboardCheck, badge: 'ACTION' },
      { id: 'audit_trail',     label: 'Audit Trail',             shortLabel: 'Audit',      icon: History },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'analytics',     label: 'Cost & Delay Analytics',    shortLabel: 'Analytics',  icon: BarChart3 },
      { id: 'mp_report',     label: 'MP Performance Report',     shortLabel: 'MP Report',  icon: User },
    ],
  },
]

export default function Sidebar({ active, onChange, onRefresh, refreshing, mobileOpen, onCloseMobile }) {
  const { theme, toggleTheme } = useTheme()
  const { roleConfig, hasPageAccess, activeRole, currentUser, logout } = useRole()

  // Filter sections and items based on active role permissions
  const permittedSections = ALL_NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => hasPageAccess(item.id))
  })).filter(section => section.items.length > 0)

  const renderContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header — M-TRACE */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-surface-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-800 flex items-center justify-center shadow-md shadow-brand-500/20 ring-2 ring-brand-500/30 flex-shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white leading-tight tracking-tight text-base">M-TRACE</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  v3.0
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                MPLADS IntelliTrack · MoSPI
              </p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Active Role Jurisdiction Badge */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-surface-750/70 border-b border-slate-200 dark:border-surface-600">
          <div className="flex items-center gap-2">
            <span className="text-base">{roleConfig.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {roleConfig.shortLabel}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 uppercase font-semibold">
                  {roleConfig.level}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {roleConfig.jurisdictionLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-270px)]">
          {permittedSections.map((section, idx) => (
            <div key={idx}>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon
                  const isActive = active === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChange(item.id)
                        if (isMobile && onCloseMobile) onCloseMobile()
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                          isActive ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Profile & Controls Bottom Container */}
      <div>
        {/* User Identity Card */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.name || roleConfig.shortLabel}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {currentUser?.designation || roleConfig.label}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
              title="Sign Out of Session"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Bottom Theme & Refresh Controls */}
        <div className="px-3 py-2.5 border-t border-slate-200 dark:border-surface-600 space-y-1 bg-slate-50/50 dark:bg-surface-900/30">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 transition-all duration-150 cursor-pointer"
          >
            <span className="flex items-center gap-2 text-[12px]">
              <span className="text-[14px]">{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </span>
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 bg-white dark:bg-surface-600 px-2 py-0.5 rounded border border-slate-200 dark:border-surface-500">
              {theme}
            </span>
          </button>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="w-full flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 transition-all duration-150 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={`text-slate-400 flex-shrink-0 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
            <span>{refreshing ? 'Re-analyzing...' : 'Re-run AI Analysis'}</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-surface-800 border-r border-slate-200 dark:border-surface-600 flex-col transition-colors duration-200 select-none">
        {renderContent(false)}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-surface-800 shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-surface-600 animate-slideRight">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  )
}
