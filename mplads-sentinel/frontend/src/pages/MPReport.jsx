import { useEffect, useState } from 'react'
import {
  User, IndianRupee, AlertTriangle, Shield, TrendingUp,
  CheckCircle2, Clock, MapPin, ChevronDown, Lock
} from 'lucide-react'
import { fetchMPSummary, fetchProjects, INR } from '../api'
import AnomalyPanel from '../components/AnomalyPanel'
import { useRole } from '../context/RoleContext'

function UtilGauge({ pct }) {
  const clamped = Math.min(pct || 0, 100)
  const color   = clamped >= 75 ? '#10b981' : clamped >= 50 ? '#f59e0b' : '#ef4444'
  const radius  = 44
  const stroke  = 8
  const circumference = 2 * Math.PI * radius
  const dashOffset    = circumference * (1 - clamped / 100)
  return (
    <div className="relative flex items-center justify-center">
      <svg width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2}>
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none"
          strokeWidth={stroke} stroke="currentColor" className="text-slate-100 dark:text-surface-600" />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-base font-bold font-mono" style={{ color }}>{clamped.toFixed(0)}%</p>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-none">utilised</p>
      </div>
    </div>
  )
}

function RiskBadge({ level }) {
  if (level === 'High')   return <span className="badge-high">HIGH</span>
  if (level === 'Medium') return <span className="badge-medium">MED</span>
  return <span className="badge-low">LOW</span>
}

export default function MPReport() {
  const { role, roleValue, roleConfig } = useRole()
  const [mpList,    setMpList]    = useState([])
  const [selected,  setSelected]  = useState('')
  const [mpData,    setMpData]    = useState(null)
  const [projects,  setProjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [projLoad,  setProjLoad]  = useState(false)
  const [drawProj,  setDrawProj]  = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchMPSummary()
      .then(data => {
        setMpList(data || [])
        if (data?.length) {
          let defaultSelected = data[0].mp_name
          if (role === 'mp' && roleValue) {
            const matched = data.find(m => m.mp_name.toLowerCase().includes(roleValue.toLowerCase()))
            if (matched) defaultSelected = matched.mp_name
          }
          setSelected(defaultSelected)
          const found = data.find(m => m.mp_name === defaultSelected) || data[0]
          setMpData(found)
        } else {
          setMpData(null)
          setSelected('')
        }
      })
      .finally(() => setLoading(false))
  }, [role, roleValue])

  useEffect(() => {
    if (!selected) return
    setProjLoad(true)
    fetchProjects({ search: selected, page_size: 100 })
      .then(r => setProjects(r.data || []))
      .finally(() => setProjLoad(false))
  }, [selected])

  const handleMPSelect = (mpName) => {
    setSelected(mpName)
    const found = mpList.find(m => m.mp_name === mpName)
    setMpData(found || null)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading MP profiles…</p>
        </div>
      </div>
    )
  }

  const riskColor = mpData?.anomaly_pct > 30 ? 'text-danger-600 dark:text-danger-400'
                  : mpData?.anomaly_pct > 15 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'

  const highRiskProjs  = projects.filter(p => p.risk_level === 'High')
  const stalledProjs   = projects.filter(p => p.delay_status === 'Stalled' || p.delay_status === 'Critical Delay')
  const completedProjs = projects.filter(p => p.status === 'Completed')

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 py-7 space-y-6">

        {/* Header + MP Selector */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">MP Performance Report</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {role === 'mp' ? 'Hon’ble MP Portal' : 'Constituency View'}
              </span>
              {role === 'mp' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Lock size={10} /> Constituency Locked
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {role === 'mp'
                ? `Constituency oversight for ${selected || roleValue || "Hon'ble MP"} — recommendations, progress tracking & fund utilization`
                : 'Drill into individual MP fund utilization, anomaly profile, and project status'}
            </p>
          </div>

          {/* MP Dropdown or Locked View */}
          {role === 'mp' ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300">
              <User size={14} />
              <span>{selected || roleValue || "Hon'ble MP Profile"}</span>
            </div>
          ) : (
            <div className="relative min-w-[260px]">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <select
                value={selected}
                onChange={e => handleMPSelect(e.target.value)}
                className="input-field pl-8 pr-8 w-full appearance-none font-medium"
              >
                {mpList.map(mp => (
                  <option key={mp.mp_name} value={mp.mp_name}>{mp.mp_name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {mpData && (
          <>
            {/* MP Profile Card */}
            <div className="card">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-brand-500/20">
                    {mpData.mp_name?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{mpData.mp_name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {Array.isArray(mpData.states)
                        ? mpData.states.slice(0, 3).join(' · ')
                        : mpData.states}
                    </p>
                    <p className="text-xs font-mono text-brand-600 dark:text-brand-400 mt-0.5">
                      {mpData.total_projects} total projects monitored
                    </p>
                  </div>
                </div>

                {/* Gauge */}
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <UtilGauge pct={mpData.utilisation_pct || 0} />
                </div>

                {/* Stats Grid */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Total Sanctioned',
                      value: INR(mpData.total_sanctioned),
                      icon: IndianRupee,
                      color: 'text-brand-600 dark:text-brand-400',
                    },
                    {
                      label: 'Total Utilised',
                      value: INR(mpData.total_utilised),
                      icon: TrendingUp,
                      color: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      label: 'Flagged Projects',
                      value: mpData.flagged_count,
                      icon: AlertTriangle,
                      color: 'text-danger-600 dark:text-danger-400',
                    },
                    {
                      label: 'High Risk',
                      value: mpData.high_risk_count,
                      icon: Shield,
                      color: 'text-danger-600 dark:text-danger-400',
                    },
                    {
                      label: 'Stalled Works',
                      value: mpData.stalled_count,
                      icon: Clock,
                      color: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                      label: 'Anomaly Rate',
                      value: `${(mpData.fraud_pct || 0).toFixed(1)}%`,
                      icon: AlertTriangle,
                      color: riskColor,
                    },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-slate-50 dark:bg-surface-700/50 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-surface-600">
                      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
                        <Icon size={11} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
                      </div>
                      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Overrun */}
              {mpData.cost_overrun > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-surface-600 flex items-center gap-3">
                  <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Total cost overrun for this MP's projects:
                    <span className="font-bold text-orange-600 dark:text-orange-400 ml-1.5">{INR(mpData.cost_overrun)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Quick Stats Pills */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Completed', count: completedProjs.length, color: 'emerald', icon: CheckCircle2 },
                { label: 'High Risk',  count: highRiskProjs.length,  color: 'red',     icon: Shield },
                { label: 'Stalled',    count: stalledProjs.length,   color: 'amber',   icon: Clock },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className={`card-sm flex items-center gap-3 border-${color}-200/60 dark:border-${color}-700/30 bg-${color}-50/30 dark:bg-${color}-950/10`}>
                  <div className={`w-9 h-9 rounded-xl bg-${color}-100 dark:bg-${color}-500/15 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold font-mono text-${color}-600 dark:text-${color}-400`}>{count}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label} Projects</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Projects Table */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Project Portfolio</h3>
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{projects.length} projects</span>
              </div>
              {projLoad ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-surface-600">
                        <th className="pb-3 pr-4 font-semibold">Work Type</th>
                        <th className="pb-3 pr-4 font-semibold">District</th>
                        <th className="pb-3 pr-4 font-semibold">Contractor</th>
                        <th className="pb-3 pr-4 font-semibold">Sanctioned</th>
                        <th className="pb-3 pr-4 font-semibold">Status</th>
                        <th className="pb-3 pr-4 font-semibold">FY</th>
                        <th className="pb-3 font-semibold text-right">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-surface-600/50">
                      {projects.map(p => (
                        <tr
                          key={p.project_id}
                          className="table-row group"
                          onClick={() => setDrawProj(p)}
                        >
                          <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {p.work_type}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <MapPin size={10} className="flex-shrink-0" />{p.district}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">{p.contractor}</td>
                          <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-brand-300 whitespace-nowrap">{INR(p.sanctioned_amt)}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              p.status === 'Completed'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                : p.status === 'In Progress'
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                                : 'bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-surface-600'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{p.financial_year}</td>
                          <td className="py-3 text-right"><RiskBadge level={p.risk_level} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {drawProj && <AnomalyPanel project={drawProj} onClose={() => setDrawProj(null)} />}
    </div>
  )
}
