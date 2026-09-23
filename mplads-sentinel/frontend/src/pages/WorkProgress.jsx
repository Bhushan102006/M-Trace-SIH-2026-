import { useEffect, useState } from 'react'
import {
  Activity, Clock, AlertTriangle, TrendingDown, CheckCircle2,
  BarChart3, Layers, MapPin, Search, X, Camera
} from 'lucide-react'
import { fetchWorkProgress, fetchDelayAnalytics, INR } from '../api'
import { useTheme } from '../context/ThemeContext'
import { useRole } from '../context/RoleContext'
import LiveEvidenceCameraModal from '../components/LiveEvidenceCameraModal'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts'

function DelayBadge({ status }) {
  if (status === 'Stalled')        return <span className="badge-stalled">STALLED</span>
  if (status === 'Critical Delay') return <span className="badge-delayed">CRITICAL</span>
  if (status === 'Minor Delay')    return <span className="badge-medium">DELAYED</span>
  return <span className="badge-on-track">ON TRACK</span>
}

const STAGE_COLORS = {
  'Completed':          '#10b981',
  'Work In Progress':   '#6366f1',
  'Tender Awarded':     '#f59e0b',
  'Technical Sanction': '#8b5cf6',
  'Admin Sanction':     '#06b6d4',
  'Recommended':        '#94a3b8',
}

const DELAY_BAND_COLORS = {
  'On Track':              '#10b981',
  'Minor (<30d)':          '#22d3ee',
  'Moderate (30-90d)':     '#f59e0b',
  'Significant (90-180d)': '#f97316',
  'Critical (>180d)':      '#ef4444',
}

export default function WorkProgress() {
  const [progData,  setProgData]  = useState(null)
  const [delayData, setDelayData] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [filterText,setFilterText]= useState('')
  const [activeTab, setActiveTab] = useState('scatter')  // 'scatter' | 'stage' | 'delay'
  const [cameraProject, setCameraProject] = useState(null)
  const { isDark } = useTheme()
  const { activeRole } = useRole()

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchWorkProgress(), fetchDelayAnalytics()])
      .then(([p, d]) => {
        setProgData(p)
        setDelayData(d)
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
          <p className="text-sm text-slate-400">Analysing work progress data…</p>
        </div>
      </div>
    )
  }

  const summary     = progData?.summary || {}
  const projects    = progData?.projects || []
  const byWorkType  = progData?.by_work_type || []
  const stageDist   = delayData?.stage_distribution || []
  const delayDist   = delayData?.delay_distribution || []
  const topStalled  = (delayData?.top_stalled || []).filter(p => {
    if (!filterText) return true
    const q = filterText.toLowerCase()
    return (
      (p.mp_name || '').toLowerCase().includes(q) ||
      (p.district || '').toLowerCase().includes(q) ||
      (p.work_type || '').toLowerCase().includes(q) ||
      (p.state || '').toLowerCase().includes(q)
    )
  })

  // Scatter data: physical vs financial progress, coloured by fraud_type
  const scatterData = projects.map(p => ({
    x:        p.physical_progress_pct,
    y:        p.financial_progress_pct,
    name:     p.work_type,
    mp:       p.mp_name,
    district: p.district,
    risk:     p.risk_level,
    fraud:    p.fraud_type,
    gap:      p.progress_discrepancy,
  }))

  const pieData = delayDist.map(d => ({
    name:  d.band,
    value: d.count,
  }))

  const stageBarData = stageDist.map(s => ({
    stage: s.stage,
    count: s.count,
  }))

  const CustomScatterDot = (props) => {
    const { cx, cy, payload } = props
    const color = payload.risk === 'High' ? '#ef4444'
                : payload.risk === 'Medium' ? '#f59e0b'
                : '#10b981'
    const isGhost = payload.fraud === 'ghost' || payload.gap > 40
    return (
      <circle
        cx={cx} cy={cy}
        r={isGhost ? 7 : 4}
        fill={color}
        fillOpacity={0.7}
        stroke={isGhost ? '#ffffff' : 'none'}
        strokeWidth={isGhost ? 1.5 : 0}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-7 space-y-4 sm:space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Work Progress Tracker</h1>
            <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shrink-0">
              Physical vs Financial
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Cross-verify physical completion against fund utilization · Detect ghost projects and stalled works
          </p>
        </div>

        {/* Summary KPI Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            {
              label: 'Avg Physical Progress',
              value: `${summary.avg_physical_progress || 0}%`,
              color: 'text-brand-600 dark:text-brand-400',
              bg:    'bg-brand-50 dark:bg-brand-500/10',
              icon: Activity,
            },
            {
              label: 'Avg Financial Progress',
              value: `${summary.avg_financial_progress || 0}%`,
              color: 'text-emerald-600 dark:text-emerald-400',
              bg:    'bg-emerald-50 dark:bg-emerald-500/10',
              icon: BarChart3,
            },
            {
              label: 'Avg Progress Gap',
              value: `${summary.avg_discrepancy || 0}%`,
              color: 'text-amber-600 dark:text-amber-400',
              bg:    'bg-amber-50 dark:bg-amber-500/10',
              icon: TrendingDown,
            },
            {
              label: 'High-Gap Projects',
              value: summary.high_gap_projects || 0,
              color: 'text-danger-600 dark:text-danger-400',
              bg:    'bg-danger-50 dark:bg-danger-500/10',
              icon: AlertTriangle,
            },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="card animate-fade-up">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">{label}</p>
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabbed Chart Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Progress Analysis</h3>
            <div className="flex bg-slate-100 dark:bg-surface-700 p-0.5 rounded-xl text-xs">
              {[
                { id: 'scatter', label: 'Physical vs Financial' },
                { id: 'stage',   label: 'Milestone Stages' },
                { id: 'delay',   label: 'Delay Distribution' },
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

          {activeTab === 'scatter' && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Each dot = one project. X-axis = physical progress %, Y-axis = financial progress %.
                <span className="ml-1 text-danger-500 font-semibold">Large red dots above the diagonal = ghost project suspects</span>
              </p>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-4 text-xs">
                {[
                  { color: '#ef4444', label: 'High Risk' },
                  { color: '#f59e0b', label: 'Medium Risk' },
                  { color: '#10b981', label: 'Low Risk' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-3 h-3 rounded-full" style={{ background: l.color, opacity: 0.7 }} />
                    {l.label}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 ml-2 border-l border-slate-200 dark:border-surface-600 pl-3">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: '#ef4444', opacity: 0.7 }} />
                  Ghost Suspect (large dot)
                </span>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="x" type="number" name="Physical Progress"
                    domain={[0, 110]} unit="%" label={{ value: 'Physical Progress %', position: 'insideBottom', offset: -10, fill: tickColor, fontSize: 11 }}
                    tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false}
                  />
                  <YAxis
                    dataKey="y" type="number" name="Financial Progress"
                    domain={[0, 115]} unit="%"
                    tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: gridColor }}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '11px' }}
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', padding: '10px 12px', color: tooltipText, fontSize: '11px' }}>
                          <p className="font-bold mb-1">{d?.name}</p>
                          <p>MP: {d?.mp} · {d?.district}</p>
                          <p>Physical: <b>{d?.x}%</b> · Financial: <b>{d?.y}%</b></p>
                          <p>Gap: <b style={{ color: d?.gap > 40 ? '#ef4444' : '#f59e0b' }}>{d?.gap?.toFixed(1)}%</b></p>
                        </div>
                      )
                    }}
                  />
                  <Scatter name="Projects" data={scatterData} shape={<CustomScatterDot />} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'stages' && (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageBarData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                  <YAxis dataKey="stage" type="category" tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: tooltipText, fontSize: '12px' }}
                    formatter={v => [v, 'Projects']}
                  />
                  <Bar dataKey="count" name="Projects" radius={[0, 6, 6, 0]}>
                    {stageBarData.map((entry, i) => (
                      <Cell key={i} fill={STAGE_COLORS[entry.stage] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'delay' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Delay band distribution across all projects</p>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={DELAY_BAND_COLORS[entry.name] || '#94a3b8'} />
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Top states by stalled & delayed works</p>
                <div className="space-y-2 overflow-y-auto max-h-56">
                  {(delayData?.stalled_by_state || []).slice(0, 8).map(s => (
                    <div key={s.state} className="flex items-center justify-between bg-slate-50 dark:bg-surface-700/50 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{s.state}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{Math.round(s.avg_delay_days || 0)} avg delay days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-danger-600 dark:text-danger-400">{s.stalled_count}</p>
                        <p className="text-[10px] text-slate-400">stalled works</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stalled Works Table */}
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-danger-500/10 flex items-center justify-center text-danger-600 dark:text-danger-400 shrink-0">
                <Clock size={15} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Stalled & Critically Delayed Works</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Projects breaching 180+ day delay threshold</p>
              </div>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-8 py-1.5 text-xs w-full sm:w-48"
                placeholder="Search stalled works…"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
              />
              {filterText && (
                <button onClick={() => setFilterText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Stalled Works Cards */}
          <div className="space-y-3 md:hidden">
            {topStalled.map(p => (
              <div key={p.project_id} className="p-3.5 rounded-xl border border-slate-200 dark:border-surface-600 bg-slate-50/50 dark:bg-surface-750/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{p.mp_name}</span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} />{p.district}, {p.state}
                    </p>
                  </div>
                  <DelayBadge status={p.delay_status} />
                </div>

                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {p.work_type}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-200/70 dark:border-surface-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Sanctioned</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-brand-300">{INR(p.sanctioned_amt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Delay Duration</span>
                    <span className="font-mono font-bold text-danger-600 dark:text-danger-400">{p.days_delayed} days</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Contractor</span>
                    <span className="truncate block text-slate-600 dark:text-slate-400">{p.contractor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Stage</span>
                    <span className="text-slate-600 dark:text-slate-400">{p.milestone_stage}</span>
                  </div>
                </div>

                <button
                  onClick={() => setCameraProject(p)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  title="Capture real-time geotagged evidence via camera"
                >
                  <Camera size={13} />
                  <span>Capture Live Evidence Photo</span>
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-surface-600">
                  <th className="pb-3 pr-4 font-semibold">MP / District</th>
                  <th className="pb-3 pr-4 font-semibold">Work Type</th>
                  <th className="pb-3 pr-4 font-semibold">Contractor</th>
                  <th className="pb-3 pr-4 font-semibold">Sanctioned</th>
                  <th className="pb-3 pr-4 font-semibold">Released</th>
                  <th className="pb-3 pr-4 font-semibold">Days Delayed</th>
                  <th className="pb-3 pr-4 font-semibold">Stage</th>
                  <th className="pb-3 pr-4 font-semibold">Evidence</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-surface-600/50">
                {topStalled.map(p => (
                  <tr key={p.project_id} className="table-row">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{p.mp_name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <MapPin size={10} />{p.district}, {p.state}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300 max-w-[160px] truncate font-medium">{p.work_type}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 max-w-[140px] truncate">{p.contractor}</td>
                    <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-brand-300 whitespace-nowrap">{INR(p.sanctioned_amt)}</td>
                    <td className="py-3 pr-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{INR(p.released_amt)}</td>
                    <td className="py-3 pr-4">
                      <span className="font-mono font-bold text-danger-600 dark:text-danger-400">{p.days_delayed}d</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{p.milestone_stage}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <button
                        onClick={() => setCameraProject(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        title="Capture real-time geotagged evidence via camera"
                      >
                        <Camera size={12} />
                        <span>Live Photo</span>
                      </button>
                    </td>
                    <td className="py-3 text-right"><DelayBadge status={p.delay_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Live Evidence Camera Modal */}
      {cameraProject && (
        <LiveEvidenceCameraModal
          project={cameraProject}
          onClose={() => setCameraProject(null)}
          onEvidenceSubmitted={() => {
            setCameraProject(null)
            Promise.all([fetchWorkProgress(), fetchDelayAnalytics()]).then(([p, d]) => {
              setProgData(p)
              setDelayData(d)
            })
          }}
        />
      )}
    </div>
  )
}
