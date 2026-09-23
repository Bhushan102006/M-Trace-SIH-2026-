import { useState, lazy, Suspense, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProjectsTable from './pages/ProjectsTable'
import AnomaliesPage from './pages/AnomaliesPage'
import GeoMap from './pages/GeoMap'
import FundFlow from './pages/FundFlow'
import WorkProgress from './pages/WorkProgress'
import Analytics from './pages/Analytics'
import MPReport from './pages/MPReport'
import CaseManagement from './pages/CaseManagement'
import AuditTrailPage from './pages/AuditTrailPage'
import { refreshData } from './api'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { RoleProvider, useRole, ROLE_DEFINITIONS } from './context/RoleContext'
import {
  Sun, Moon, RefreshCw, Shield, Bell, Search, CheckCircle2, UserCheck,
  ChevronRight, ChevronDown, Sparkles, SlidersHorizontal, Scale,
  Lock, AlertTriangle, ArrowRight, ShieldAlert, LogOut, Menu, Table2,
  LayoutDashboard, Activity
} from 'lucide-react'

const PAGES = {
  dashboard:       Dashboard,
  projects:        ProjectsTable,
  anomalies:       AnomaliesPage,
  map:             GeoMap,
  fund_flow:       FundFlow,
  work_progress:   WorkProgress,
  analytics:       Analytics,
  mp_report:       MPReport,
  case_management: CaseManagement,
  audit_trail:     AuditTrailPage,
}

const PAGE_META = {
  dashboard:       { title: 'Executive Overview',           desc: 'Governance dashboard with risk intelligence & anomaly monitoring' },
  projects:        { title: 'Projects Ledger',              desc: 'Searchable ledger of all MPLADS projects across jurisdictions' },
  anomalies:       { title: 'Risk & Anomaly Intelligence',  desc: 'AI-detected deviations for human review & verification' },
  map:             { title: 'Geospatial Intelligence',      desc: 'Constituency-level project mapping with risk visualization' },
  fund_flow:       { title: 'Fund Utilization Flow',        desc: 'Sanctioned → Released → Expended → Utilised tracking' },
  work_progress:   { title: 'Work Progress Tracker',        desc: 'Physical vs financial progress · Milestone intelligence' },
  analytics:       { title: 'Cost & Delay Analytics',       desc: 'Benchmark patterns · FY trends · Regional comparison' },
  mp_report:       { title: 'MP Performance Report',        desc: 'Per-MP fund utilization, project portfolio & risk profile' },
  case_management: { title: 'Verification Cases',           desc: 'Human-in-the-loop decision-support case management' },
  audit_trail:     { title: 'Audit Trail',                  desc: 'Immutable administrative action log for governance transparency' },
}

function RoleSwitcher({ onRoleSwitch }) {
  const { activeRole, switchRole, roles } = useRole()
  const [isOpen, setIsOpen] = useState(false)
  const currentRole = roles[activeRole]

  const handleSelect = (id) => {
    switchRole(id)
    setIsOpen(false)
    if (onRoleSwitch) onRoleSwitch(id)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-500 bg-slate-50 dark:bg-surface-700 hover:bg-slate-100 dark:hover:bg-surface-600 transition-all text-sm shadow-2xs"
      >
        <span className="text-base leading-none">{currentRole.icon}</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs hidden sm:inline">
          {currentRole.shortLabel}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-surface-700 border border-slate-200 dark:border-surface-500 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-surface-600 bg-slate-50 dark:bg-surface-800">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Select Governance Authority / Role
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Jurisdiction and feature permissions update automatically
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-surface-600">
              {Object.entries(roles).map(([id, role]) => (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-surface-600 transition-colors ${
                    activeRole === id ? 'bg-brand-50 dark:bg-brand-600/15' : ''
                  }`}
                >
                  <span className="text-xl mt-0.5">{role.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold ${activeRole === id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {role.label}
                      </p>
                      {activeRole === id && (
                        <CheckCircle2 size={14} className="text-brand-600 dark:text-brand-400 flex-shrink-0 ml-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {role.description}
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300 capitalize">
                      {role.jurisdictionLabel}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AccessDeniedView({ page, roleConfig, onNavigateAllowed }) {
  const meta = PAGE_META[page] || { title: page, desc: '' }
  const firstAllowed = roleConfig.allowedPages[0] || 'projects'
  const firstAllowedMeta = PAGE_META[firstAllowed] || { title: firstAllowed }

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-surface-900">
      <div className="max-w-md w-full bg-white dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-600 shadow-xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto shadow-xs">
          <Lock size={28} />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full">
            Statutory Access Control
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
            Access Restricted: {meta.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Under MPLADS governance guidelines, this module is not accessible to the <strong>{roleConfig.label}</strong> role.
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-surface-700/50 rounded-xl border border-slate-200 dark:border-surface-600 text-left text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Jurisdiction Policy:</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            {roleConfig.description}
          </p>
        </div>

        <button
          onClick={() => onNavigateAllowed(firstAllowed)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md transition-colors"
        >
          <span>Return to Permitted View ({firstAllowedMeta.title})</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

function MainLayout() {
  const [page,       setPage]       = useState('dashboard')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme }      = useTheme()
  const { activeRole, roleConfig, hasPageAccess, roles, currentUser, logout } = useRole()

  // When switching role, if current page is not allowed, automatically jump to first permitted page
  const handleRoleSwitch = (newRoleId) => {
    const newRole = roles[newRoleId]
    if (newRole && !newRole.allowedPages.includes(page)) {
      setPage(newRole.allowedPages[0])
    }
    setRefreshKey(k => k + 1)
  }

  // Ensure current page is valid for current role
  useEffect(() => {
    if (!hasPageAccess(page)) {
      setPage(roleConfig.allowedPages[0])
    }
  }, [activeRole])

  const isAllowed = hasPageAccess(page)
  const Page = PAGES[page] || Dashboard
  const meta = PAGE_META[page] || { title: page, desc: '' }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshData()
      setRefreshKey(k => k + 1)
    } catch (e) {
      console.error('Refresh failed', e)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      {/* Sidebar Navigation (role-filtered with mobile drawer) */}
      <Sidebar
        active={page}
        onChange={p => setPage(p)}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Governance Principle Banner */}
        <div className="h-8 px-4 sm:px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-800 dark:via-indigo-800 dark:to-blue-900 flex items-center justify-between text-white/90 text-[11px] font-medium flex-shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Scale size={13} className="text-blue-200 flex-shrink-0" />
            <span className="truncate">Decision-Support: <strong>AI Detects Anomalies</strong> · <strong>Human Authorities Verify</strong></span>
          </div>
          <span className="hidden md:inline-block font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded text-blue-100">
            {roleConfig.jurisdictionLabel}
          </span>
        </div>

        {/* Top Command Bar */}
        <header className="h-14 px-3 sm:px-6 border-b border-slate-200 dark:border-surface-600 bg-white/90 dark:bg-surface-800/90 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 z-20 transition-colors duration-200 flex-shrink-0">
          {/* Breadcrumb & Context */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors"
              title="Open Navigation Menu"
            >
              <Menu size={19} />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">M-TRACE</span>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="font-medium text-slate-600 dark:text-slate-300">{roleConfig.shortLabel}</span>
              <ChevronRight size={12} className="text-slate-400" />
            </div>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 rounded-md capitalize truncate max-w-[150px] sm:max-w-none">
              {meta.title}
            </span>
          </div>

          {/* Right Utilities */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Quick Search Shortcut */}
            {page !== 'projects' && hasPageAccess('projects') && (
              <button
                onClick={() => setPage('projects')}
                className="hidden md:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-surface-700 hover:bg-slate-200/80 dark:hover:bg-surface-600 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-surface-500 transition-colors"
                title="Search projects & contractors"
              >
                <Search size={13} />
                <span>Search records…</span>
              </button>
            )}

            {/* User Identity Pill */}
            {currentUser && (
              <div className="hidden xl:flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-100 dark:bg-surface-700 border border-slate-200 dark:border-surface-600 text-xs">
                <div className="w-6 h-6 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {currentUser.name ? currentUser.name[0] : 'U'}
                </div>
                <div className="text-left leading-none">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[130px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[130px]">
                    {currentUser.designation}
                  </p>
                </div>
              </div>
            )}

            {/* Role Switcher */}
            <RoleSwitcher onRoleSwitch={handleRoleSwitch} />

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-600 transition-all duration-150 shadow-xs"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun size={17} className="text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon size={17} className="text-slate-700 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Re-run Analysis"
              className="p-2 rounded-xl border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-600 transition-all duration-150 shadow-xs disabled:opacity-50"
              title="Re-generate data and re-run AI analysis"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin text-brand-600' : ''} />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold shadow-2xs transition-all"
              title="Sign Out of Session"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Container with Route Guard */}
        <div className="flex-1 overflow-hidden flex flex-col relative pb-16 md:pb-0">
          {isAllowed ? (
            <Page key={`${refreshKey}-${activeRole}`} onNavigate={p => setPage(p)} />
          ) : (
            <AccessDeniedView
              page={page}
              roleConfig={roleConfig}
              onNavigateAllowed={p => setPage(p)}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation Bar (Thumb friendly) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-surface-800/95 backdrop-blur-md border-t border-slate-200 dark:border-surface-600 px-3 py-1 flex items-center justify-around text-[10px] shadow-lg">
          {activeRole === 'contractor' ? (
            <>
              <button
                onClick={() => setPage('projects')}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors ${page === 'projects' ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Table2 size={18} />
                <span>Projects</span>
              </button>
              <button
                onClick={() => setPage('work_progress')}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors ${page === 'work_progress' ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Activity size={18} />
                <span>Progress</span>
              </button>
              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
              >
                <Menu size={18} />
                <span>Menu</span>
              </button>
            </>
          ) : (
            <>
              {hasPageAccess('dashboard') && (
                <button
                  onClick={() => setPage('dashboard')}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${page === 'dashboard' ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <LayoutDashboard size={18} />
                  <span>Overview</span>
                </button>
              )}
              {hasPageAccess('projects') && (
                <button
                  onClick={() => setPage('projects')}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${page === 'projects' ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <Table2 size={18} />
                  <span>Ledger</span>
                </button>
              )}
              {hasPageAccess('anomalies') && (
                <button
                  onClick={() => setPage('anomalies')}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${page === 'anomalies' ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <AlertTriangle size={18} />
                  <span>Anomalies</span>
                </button>
              )}
              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
              >
                <Menu size={18} />
                <span>More</span>
              </button>
            </>
          )}
        </nav>
      </main>
    </div>
  )
}

function RootApp() {
  const { isAuthenticated } = useRole()
  if (!isAuthenticated) {
    return <LoginPage />
  }
  return <MainLayout />
}

export default function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <RootApp />
      </RoleProvider>
    </ThemeProvider>
  )
}
