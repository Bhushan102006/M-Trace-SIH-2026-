import { useEffect, useState } from 'react'
import {
  IndianRupee, TrendingUp, TrendingDown, Layers, ArrowRight,
  BarChart3, AlertCircle, CheckCircle2, Clock
} from 'lucide-react'
import { fetchFundFlow, fetchMPSummary, INR } from '../api'
import { useTheme } from '../context/ThemeContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, LineChart, Line
} from 'recharts'

function UtilGauge({ pct, size = 'md' }) {
  const clamped = Math.min(pct || 0, 100)
  const color = clamped >= 80 ? '#10b981' : clamped >= 50 ? '#f59e0b' : '#ef4444'
  const radius = size === 'sm' ? 28 : 40
  const stroke = size === 'sm' ? 5 : 7
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div className="relative flex items-center justify-center">
      <svg width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2}>
        <circle
          cx={radius + stroke} cy={radius + stroke} r={radius}
          fill="none" stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-100 dark:text-surface-600"
        />
        <circle
          cx={radius + stroke} cy={radius + stroke} r={radius}
          fill="none" stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span
        className={`absolute font-bold font-mono ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
        style={{ color }}
      >
        {clamped.toFixed(0)}%
      </span>
    </div>
  )
}

function FunnelStep({ label, value, total, color, icon: Icon }) {
  const pct = total > 0 ? (value / total * 100).toFixed(1) : 0
  const width = total > 0 ? Math.max((value / total) * 100, 4) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
          <Icon size={13} style={{ color }} />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 dark:text-white">{INR(value)}</span>
          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">({pct}%)</span>
        </div>
      </div>
      <div className="h-3 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function FundFlow() {
  const [data,      setData]      = useState(null)
  const [mpData,    setMpData]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('fy')   // 'fy' | 'state' | 'mp'
  const { isDark } = useTheme()

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchFundFlow(), fetchMPSummary()])
      .then(([fd, mp]) => {
        setData(fd)
        setMpData(mp || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const tooltipBg     = isDark ? '#1e1e35' : '#ffffff'
  const tooltipBorder = isDark ? '#2e2e50' : '#e2e8f0'
  const tooltipText   = isDark ? '#f8fafc' : '#0f172a'
  const gridColor     = isDark ? '#252540' : '#f1f5f9'
  const tickColor     = isDark ? '#94a3b8' : '#64748b'

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading fund utilization data…</p>
        </div>
      </div>
    )
  }

  const overall = data?.overall || {}
  const fyData  = (data?.by_fy || []).map(row => ({
    ...row,
    sanctioned_cr: +(row.sanctioned / 1e7).toFixed(2),
    released_cr:   +(row.released   / 1e7).toFixed(2),
    utilised_cr:   +(row.utilised   / 1e7).toFixed(2),
  }))
  const stateData = (data?.by_state || []).slice(-12).map(row => ({
    ...row,
    state_short: row.state?.split(' ').map(w => w[0]).join(''),
  }))
  const topMPs = mpData.slice(0, 12)

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 py-7 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Fund Utilization Flow</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              Live Tracking
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            End-to-end fund journey: Sanctioned → Released → Expended → Utilised across all MPs, States & Financial Years
          </p>
        </div>

        {/* Funnel Overview Card */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Layers size={15} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Portfolio Fund Flow Funnel</h3>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-mono">All Financial Years</span>
          </div>
          <div className="space-y-4">
            <FunnelStep
              label="Total Sanctioned"
              value={overall.sanctioned}
              total={overall.sanctioned}
              color="#6366f1"
              icon={IndianRupee}
            />
            <FunnelStep
              label="Funds Released"
              value={overall.released}
              total={overall.sanctioned}
              color="#10b981"
              icon={TrendingUp}
            />
            <FunnelStep
              label="Amount Expended"
              value={overall.expended}
              total={overall.sanctioned}
              color="#f59e0b"
              icon={BarChart3}
            />
            <FunnelStep
              label="Amount Utilised"
              value={overall.utilised}
              total={overall.sanctioned}
              color="#ef4444"
              icon={CheckCircle2}
            />
          </div>

          {/* Summary pills */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-surface-600">
            {[
              { label: 'Release Rate',   value: `${overall.release_pct}%`,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { label: 'Expenditure %',  value: `${overall.expend_pct}%`,   color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { label: 'Utilisation %',  value: `${overall.utilised_pct}%`, color: 'text-brand-600 dark:text-brand-400',    bg: 'bg-brand-50 dark:bg-brand-500/10' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl px-3 py-2.5 text-center`}>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabbed Charts */}
        <div className="card">
          {/* Tab bar */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Breakdown Analysis</h3>
            <div className="flex bg-slate-100 dark:bg-surface-700 p-0.5 rounded-xl text-xs">
              {[
                { id: 'fy',    label: 'By Financial Year' },
                { id: 'state', label: 'By State' },
                { id: 'mp',    label: 'By MP' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* FY Chart */}
          {activeTab === 'fy' && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fyData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="financial_year" tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '12px' }}
                  formatter={(v, n) => [`₹${v}Cr`, n]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: tickColor }} />
                <Bar dataKey="sanctioned_cr" name="Sanctioned (Cr)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="released_cr"   name="Released (Cr)"   fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="utilised_cr"   name="Utilised (Cr)"   fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* State Chart */}
          {activeTab === 'state' && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">States sorted by utilization rate (lowest → highest). Underutilized states shown in red.</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stateData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} unit="%" domain={[0, 100]} />
                  <YAxis dataKey="state" type="category" tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} width={58} />
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '12px' }}
                    formatter={v => [`${v.toFixed(1)}%`, 'Utilisation']}
                  />
                  <Bar dataKey="util_pct" name="Utilisation %" radius={[0, 4, 4, 0]}>
                    {stateData.map((entry, i) => (
                      <Cell key={i} fill={entry.util_pct >= 75 ? '#10b981' : entry.util_pct >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* MP Chart */}
          {activeTab === 'mp' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-surface-600">
                    <th className="pb-3 pr-4 font-semibold">{"Hon'ble MP"}</th>
                    <th className="pb-3 pr-4 font-semibold">Projects</th>
                    <th className="pb-3 pr-4 font-semibold">Sanctioned</th>
                    <th className="pb-3 pr-4 font-semibold">Utilised</th>
                    <th className="pb-3 pr-4 font-semibold">Util. Rate</th>
                    <th className="pb-3 pr-4 font-semibold">Flagged</th>
                    <th className="pb-3 font-semibold text-right">Gauge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-surface-600/50">
                  {topMPs.map(mp => (
                    <tr key={mp.mp_name} className="table-row">
                      <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-200">{mp.mp_name}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{mp.total_projects}</td>
                      <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-brand-300">{INR(mp.total_sanctioned)}</td>
                      <td className="py-3 pr-4 font-mono text-slate-700 dark:text-slate-300">{INR(mp.total_utilised)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(mp.utilisation_pct || 0, 100)}%`,
                                background: mp.utilisation_pct >= 75 ? '#10b981' : mp.utilisation_pct >= 50 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {(mp.utilisation_pct || 0).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {mp.flagged_count > 0
                          ? <span className="badge-medium">{mp.flagged_count}</span>
                          : <span className="badge-low">Clean</span>
                        }
                      </td>
                      <td className="py-3 flex justify-end">
                        <UtilGauge pct={mp.utilisation_pct || 0} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Underutilized Funds Alert */}
        <div className="card border-amber-200/60 dark:border-amber-700/30 bg-amber-50/30 dark:bg-amber-950/10">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Underutilized States Alert</h3>
            <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-semibold">Funds Below 50% Utilization</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(data?.by_state || [])
              .filter(s => s.util_pct < 50)
              .slice(0, 6)
              .map(s => (
                <div key={s.state} className="bg-white dark:bg-surface-700 border border-amber-200/70 dark:border-amber-700/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.state}</p>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{(s.util_pct || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(s.util_pct || 0, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{s.projects} projects</span>
                    <span>{INR(s.sanctioned)} sanctioned</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  )
}
