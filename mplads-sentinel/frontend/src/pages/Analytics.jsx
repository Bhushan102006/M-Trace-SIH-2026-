import { useEffect, useState } from 'react'
import {
  TrendingUp, Clock, AlertTriangle, BarChart3, IndianRupee,
  MapPin, Calendar, Activity
} from 'lucide-react'
import { fetchCostOverrun, fetchTimeline, INR } from '../api'
import { useTheme } from '../context/ThemeContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, PieChart, Pie, Legend
} from 'recharts'

function OverrunBandBadge({ band }) {
  if (!band || band === 'None') return <span className="badge-low">None</span>
  if (band.includes('Severe')) return <span className="badge-high">Severe</span>
  if (band.includes('High'))   return <span className="badge-high">High</span>
  if (band.includes('Moderate')) return <span className="badge-medium">Moderate</span>
  return <span className="badge-on-track">Low</span>
}

const BAND_COLORS = {
  'None':              '#10b981',
  'Low (≤10%)':        '#22d3ee',
  'Moderate (10-25%)': '#f59e0b',
  'High (25-40%)':     '#f97316',
  'Severe (>40%)':     '#ef4444',
}

export default function Analytics() {
  const [overrunData, setOverrunData] = useState(null)
  const [timeline,    setTimeline]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState('overrun')  // 'overrun' | 'timeline'
  const { isDark } = useTheme()

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCostOverrun(), fetchTimeline()])
      .then(([o, t]) => {
        setOverrunData(o)
        setTimeline(t)
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
          <p className="text-sm text-slate-400">Loading analytics data…</p>
        </div>
      </div>
    )
  }

  const overrunBands = (overrunData?.band_distribution || []).map(b => ({
    name:  b.band,
    value: b.count,
  }))

  const topOverrun = overrunData?.top_overrun || []
  const stateOverrun = (overrunData?.state_overrun || []).slice(0, 10)

  const fyData = (timeline?.by_fy || []).map(row => ({
    ...row,
    sanctioned_cr: +(row.total_sanctioned / 1e7).toFixed(2),
    utilised_cr:   +(row.total_utilised / 1e7).toFixed(2),
    overrun_cr:    +(row.cost_overrun / 1e7).toFixed(2),
  }))

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 py-7 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Cost & Delay Analytics</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
              Executive Insights
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overrun patterns, timeline trends, and cross-constituency cost deviations
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Cost Overrun',
              value: INR(overrunData?.total_overrun_amt),
              icon: TrendingUp, color: 'text-danger-600 dark:text-danger-400', bg: 'bg-danger-50 dark:bg-danger-500/10',
            },
            {
              label: 'Affected Projects',
              value: overrunData?.affected_projects || 0,
              icon: BarChart3, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10',
            },
            {
              label: 'Avg Completion Rate',
              value: `${(timeline?.by_fy || []).reduce((a, b) => a + (b.completion_rate || 0), 0) / Math.max((timeline?.by_fy || []).length, 1) | 0}%`,
              icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            },
            {
              label: 'Total Stalled Works',
              value: (timeline?.by_fy || []).reduce((a, b) => a + (b.stalled || 0), 0),
              icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card animate-fade-up">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">{label}</p>
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tab Charts */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Analytical Views</h3>
            <div className="flex bg-slate-100 dark:bg-surface-700 p-0.5 rounded-xl text-xs">
              {[
                { id: 'overrun',  label: 'Cost Overrun' },
                { id: 'timeline', label: 'FY Trends' },
                { id: 'state',    label: 'State Breakdown' },
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

          {activeTab === 'overrun' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Cost overrun severity distribution</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={overrunBands} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                      {overrunBands.map((entry, i) => (
                        <Cell key={i} fill={BAND_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '12px' }}
                      formatter={(v, n) => [`${v} projects`, n]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', color: tickColor }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Cost overrun % distribution by severity</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={overrunBands} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 9 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                    <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '12px' }}
                      formatter={v => [v, 'Projects']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {overrunBands.map((entry, i) => (
                        <Cell key={i} fill={BAND_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Year-over-year sanctioned vs utilised vs cost overrun (₹ Crore)</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={fyData} margin={{ top: 10, right: 20, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="financial_year" tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '12px' }}
                    formatter={(v, n) => [`₹${v}Cr`, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: tickColor }} />
                  <Line type="monotone" dataKey="sanctioned_cr" name="Sanctioned (Cr)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
                  <Line type="monotone" dataKey="utilised_cr"   name="Utilised (Cr)"   stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                  <Line type="monotone" dataKey="overrun_cr"    name="Overrun (Cr)"    stroke="#ef4444" strokeWidth={2}   strokeDasharray="5 5" dot={{ r: 3, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
              {/* FY Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                {fyData.map(fy => (
                  <div key={fy.financial_year} className="bg-slate-50 dark:bg-surface-700/50 rounded-xl p-3 border border-slate-200 dark:border-surface-600">
                    <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-2">FY {fy.financial_year}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Projects</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{fy.total_projects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Completion</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fy.completion_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Flagged</span>
                        <span className="font-semibold text-danger-600 dark:text-danger-400">{fy.flagged_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Utilisation</span>
                        <span className="font-semibold text-brand-600 dark:text-brand-400">{fy.utilisation_pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'state' && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Top states by total cost overrun amount</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stateOverrun} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="state" tick={{ fill: tickColor, fontSize: 9 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '12px' }}
                    formatter={(v, n) => [INR(v), 'Total Overrun']}
                  />
                  <Bar dataKey="total_overrun" name="Total Overrun" radius={[6, 6, 0, 0]} fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Overrun Projects Table */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <AlertTriangle size={15} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Top Cost Overrun Projects</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sorted by overrun percentage — highest risk first</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-surface-600">
                  <th className="pb-3 pr-4 font-semibold">MP / Location</th>
                  <th className="pb-3 pr-4 font-semibold">Work Type</th>
                  <th className="pb-3 pr-4 font-semibold">Sanctioned</th>
                  <th className="pb-3 pr-4 font-semibold">Overrun Amt</th>
                  <th className="pb-3 pr-4 font-semibold">Overrun %</th>
                  <th className="pb-3 pr-4 font-semibold">FY</th>
                  <th className="pb-3 font-semibold text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-surface-600/50">
                {topOverrun.map(p => (
                  <tr key={p.project_id} className="table-row">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{p.mp_name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <MapPin size={10} />{p.district}, {p.state}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{p.work_type}</td>
                    <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-brand-300 whitespace-nowrap">{INR(p.sanctioned_amt)}</td>
                    <td className="py-3 pr-4 font-mono text-danger-600 dark:text-danger-400 font-bold whitespace-nowrap">{INR(p.cost_overrun_amt)}</td>
                    <td className="py-3 pr-4">
                      <span className="font-mono font-bold text-danger-600 dark:text-danger-400">{(p.cost_overrun_pct || 0).toFixed(1)}%</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{p.financial_year}</td>
                    <td className="py-3 text-right">
                      <OverrunBandBadge band={p.cost_overrun_band} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
