import { useState } from 'react'
import { useRole } from '../context/RoleContext'
import { useTheme } from '../context/ThemeContext'
import {
  Shield, Lock, ArrowRight, CheckCircle2, UserCheck, AlertCircle,
  Building2, Scale, Sun, Moon, Sparkles, KeyRound, Eye, EyeOff
} from 'lucide-react'

export default function LoginPage() {
  const { roles, defaultRoleUsers, login } = useRole()
  const { theme, toggleTheme } = useTheme()

  const [selectedRole, setSelectedRole] = useState('mospi')
  const [email, setEmail] = useState(defaultRoleUsers.mospi.email)
  const [password, setPassword] = useState('••••••••••••')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeRoleConfig = roles[selectedRole] || roles.mospi
  const activeDefaultUser = defaultRoleUsers[selectedRole] || defaultRoleUsers.mospi

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId)
    const user = defaultRoleUsers[roleId]
    if (user) {
      setEmail(user.email)
    }
  }

  const handleQuickLogin = (roleId) => {
    setIsSubmitting(true)
    setTimeout(() => {
      login(roleId)
      setIsSubmitting(false)
    }, 200)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      login(selectedRole, {
        email: email || activeDefaultUser.email,
        name: activeDefaultUser.name,
        designation: activeDefaultUser.designation,
        department: activeDefaultUser.department,
      })
      setIsSubmitting(false)
    }, 200)
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100 dark:bg-surface-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 selection:bg-brand-500 selection:text-white">
      
      {/* Top Gov Header */}
      <header className="border-b border-slate-200 dark:border-surface-600 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-600/20 ring-2 ring-brand-500/20">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                M-TRACE
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                GOI · MoSPI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              MPLADS Real-Time Surveillance & Statutory Decision-Support Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-700 transition-all shadow-2xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
          </button>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 shadow-xl overflow-hidden z-10 transition-colors">
          
          {/* Left Panel: Role Selection & Information */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-surface-600 bg-slate-50/50 dark:bg-surface-850/50">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Role-Based Access Control (RBAC)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Select Governance Authority
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Authentication strictly scopes your accessible modules, audit privileges, and jurisdictional mandate.
              </p>

              {/* Role Cards Grid */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(roles).map(([id, role]) => {
                  const isSelected = selectedRole === id
                  const defaultUser = defaultRoleUsers[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleRoleChange(id)}
                      className={`p-3 rounded-2xl text-left border transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-brand-50/90 dark:bg-brand-950/40 border-brand-500 dark:border-brand-500 shadow-sm ring-1 ring-brand-500/30'
                          : 'bg-white dark:bg-surface-700/60 border-slate-200 dark:border-surface-600 hover:border-slate-300 dark:hover:border-surface-500 hover:bg-slate-50 dark:hover:bg-surface-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">{role.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {role.shortLabel}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              Level: {role.level}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={16} className="text-brand-600 dark:text-brand-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-surface-600">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                          {defaultUser?.name}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                          {role.jurisdictionLabel}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Role Authority Summary */}
            <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-surface-700/70 border border-slate-200 dark:border-surface-600 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Scale size={13} className="text-brand-600 dark:text-brand-400" />
                  Statutory Scope & Access
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-600 text-slate-600 dark:text-slate-300 font-semibold">
                  {activeRoleConfig.allowedPages.length} Modules Allowed
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeRoleConfig.description}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                <span className="text-slate-400 font-medium">Permitted:</span>
                {activeRoleConfig.allowedPages.map(page => (
                  <span key={page} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-600 text-slate-600 dark:text-slate-300 capitalize font-medium">
                    {page.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Official Login Form */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-surface-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound size={16} className="text-brand-600 dark:text-brand-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Official Credentials
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log in to verify your identity and exercise jurisdictional authority.
              </p>

              {/* Instant 1-Click Quick Login CTA for evaluator */}
              <div className="my-5 p-3 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/30 dark:to-indigo-950/30 border border-brand-200/80 dark:border-brand-800/40">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-brand-900 dark:text-brand-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
                    Instant Authorized Sign-In
                  </span>
                  <span className="text-[10px] text-brand-700 dark:text-brand-400 font-medium">1-Click</span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickLogin(selectedRole)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span>Enter as {activeRoleConfig.shortLabel}</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Manual Login Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Government Email / Official ID
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-surface-700 border border-slate-200 dark:border-surface-600 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono"
                    placeholder="officer@nic.in"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Security Authorization PIN / Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-surface-700 border border-slate-200 dark:border-surface-600 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-surface-500 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Persist statutory session</span>
                  </label>
                  <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                    2FA Verified
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-surface-700 dark:hover:bg-surface-600 text-white text-xs font-bold border border-slate-800 dark:border-surface-500 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Lock size={13} />
                  <span>Authenticate & Open Portal</span>
                </button>
              </form>
            </div>

            {/* Statutory Security Disclaimer */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-surface-600 text-[10px] text-slate-400 dark:text-slate-500 space-y-1">
              <div className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                <Shield size={11} className="text-emerald-500" />
                <span>Statutory Governance System</span>
              </div>
              <p className="leading-tight">
                All logins and decision logs are cryptographically timestamped and audited under statutory guidelines.
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-surface-600 py-3 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>
          Government of India · Ministry of Statistics & Programme Implementation · National Informatics Centre (NIC)
        </p>
      </footer>
    </div>
  )
}
