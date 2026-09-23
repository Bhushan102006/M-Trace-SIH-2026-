import { useEffect, useState } from 'react'
import {
  AlertTriangle, Filter, LayoutGrid, List, ShieldAlert, Sparkles,
  MapPin, User, IndianRupee, ArrowUpRight, Search, Tag, Eye,
  Scale, CheckCircle2, UserCheck, RefreshCw, ArrowRight
} from 'lucide-react'
import { fetchAnomalies, INR } from '../api'
import ProjectHealthCardModal from '../components/ProjectHealthCardModal'

const ANOMALY_TABS = [
  { id: 'all', label: 'All Anomalies' },
  { id: 'cost_outlier', label: 'Cost vs Benchmarks' },
  { id: 'progress_divergence', label: 'Progress-Expenditure Gap' },
  { id: 'timeline_delay', label: 'Timeline Delay' },
  { id: 'duplicate_scope', label: 'Duplicate / Overlapping' },
  { id: 'geo_evidence_mismatch', label: 'Geofence Mismatch' },
]

const ANOMALY_LABELS = {
  cost_outlier: { label: 'Cost Outlier vs SoR', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300' },
  progress_divergence: { label: 'Progress Divergence', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' },
  timeline_delay: { label: 'Critical Timeline Delay', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' },
  duplicate_scope: { label: 'Overlapping Scope', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300' },
  geo_evidence_mismatch: { label: 'Geofence Distance Offset', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border-pink-300' },
}

function RiskTierBadge({ tier, score }) {
  if (tier === 'High Priority Review') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        High Priority ({Math.round(score)}/100)
      </span>
    )
  }
  if (tier === 'Review Required') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Review Required ({Math.round(score)}/100)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Watch ({Math.round(score)}/100)
    </span>
  )
}

export default function AnomaliesPage({ onNavigate }) {
  const [data, setData] = useState([])
  const [activeAnomalyTab, setActiveAnomalyTab] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [filterText, setFilterText] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [viewMode, setViewMode] = useState('grid')

  const loadData = () => {
    setLoading(true)
    fetchAnomalies({ limit: 300 })
      .then(r => setData(r.data || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = data.filter(p => {
    const q = filterText.toLowerCase()
    const matchesSearch = !q ||
      p.project_id?.toLowerCase().includes(q) ||
      p.work_type?.toLowerCase().includes(q) ||
      p.mp_name?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.contractor?.toLowerCase().includes(q)

    const matchesTab = activeAnomalyTab === 'all' || p.anomaly_type === activeAnomalyTab
    const matchesRisk = riskFilter === 'all' || p.risk_tier === riskFilter

    return matchesSearch && matchesTab && matchesRisk
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      
      {/* Top Header & Filter Toolbar */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-900 dark:text-white text-lg">
              Risk & Anomaly Intelligence Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-semibold">
              Advisory Signals
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical deviations detected by 5 AI domain engines for administrative verification and field review.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500 w-52"
              placeholder="Search anomalies…"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>

          {/* Risk Tier Filter */}
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Risk Tiers</option>
            <option value="High Priority Review">High Priority Review (76-100)</option>
            <option value="Review Required">Review Required (51-75)</option>
            <option value="Watch">Watch (26-50)</option>
          </select>

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-surface-700 p-0.5 rounded-lg border border-slate-200 dark:border-surface-600">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'}`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'}`}
              title="Table View"
            >
              <List size={14} />
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-surface-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-700"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Governance Principle Banner */}
      <div className="px-6 py-2.5 bg-blue-50 dark:bg-surface-800/80 border-b border-blue-200 dark:border-surface-600 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Scale size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span>
            <strong>Decision-Support Notice:</strong> Flagged anomalies are mathematical deviations for review. Legitimate reasons (hard rock excavation, local terrain, monsoon delays) regularly explain cost or timeline gaps.
          </span>
        </div>
        <span className="font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {filtered.length} Flagged Works
        </span>
      </div>

      {/* Anomaly Category Tabs Bar */}
      <div className="px-6 py-2 border-b border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 flex items-center gap-1.5 overflow-x-auto">
        {ANOMALY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveAnomalyTab(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeAnomalyTab === tab.id
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-xs text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />
            Loading anomaly intelligence…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-600">
            No projects found matching the selected anomaly filter.
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(proj => {
              const anomalyTag = ANOMALY_LABELS[proj.anomaly_type] || {
                label: 'Operational Discrepancy',
                color: 'bg-slate-100 text-slate-800 border-slate-200'
              }
              return (
                <div
                  key={proj.project_id}
                  className="bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between space-y-3"
                >
                  <div>
                    {/* Card Top: ID and Risk Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {proj.project_id}
                      </span>
                      <RiskTierBadge tier={proj.risk_tier} score={proj.risk_score} />
                    </div>

                    {/* Work Title */}
                    <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-1">
                      {proj.work_type || 'Civil Work'}
                    </h3>

                    {/* Location & MP */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {proj.district}, {proj.state} · MP: {proj.mp_name}
                    </p>

                    {/* Anomaly Category Badge */}
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${anomalyTag.color}`}>
                        {anomalyTag.label}
                      </span>
                    </div>

                    {/* Explainable AI Snippet */}
                    <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-surface-700/50 border border-slate-200 dark:border-surface-600 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 mb-1">
                        <Sparkles size={11} className="text-purple-600" />
                        <span>Why Flagged:</span>
                      </div>
                      <p className="line-clamp-2 leading-relaxed">
                        {proj.why_flagged || 'Statistical divergence in expenditure velocity and unit cost benchmarks.'}
                      </p>
                    </div>

                    {/* Metrics Strip */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] pt-2 border-t border-slate-100 dark:border-surface-700">
                      <div>
                        <span className="text-slate-400">Sanctioned:</span>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{INR(proj.sanctioned_amt)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Physical Progress:</span>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{proj.physical_progress_pct || 0}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-surface-700 gap-2">
                    <button
                      onClick={() => setSelectedProjectId(proj.project_id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800 transition-colors"
                    >
                      <Eye size={13} />
                      <span>Health Card</span>
                    </button>

                    <button
                      onClick={() => onNavigate && onNavigate('case_management')}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-surface-700 dark:hover:bg-surface-600 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Open Case Management"
                    >
                      <UserCheck size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-surface-750 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-surface-600 uppercase text-[11px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Project ID</th>
                    <th className="px-4 py-3">Work Type & Location</th>
                    <th className="px-4 py-3">Anomaly Type</th>
                    <th className="px-4 py-3">Why Flagged (XAI)</th>
                    <th className="px-4 py-3">Risk Tier</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-surface-700">
                  {filtered.map(proj => {
                    const anomalyTag = ANOMALY_LABELS[proj.anomaly_type] || { label: 'Anomaly', color: 'bg-slate-100 text-slate-800 border-slate-200' }
                    return (
                      <tr key={proj.project_id} className="hover:bg-slate-50/70 dark:hover:bg-surface-700/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                          {proj.project_id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{proj.work_type}</div>
                          <div className="text-[11px] text-slate-400">{proj.district}, {proj.state}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${anomalyTag.color}`}>
                            {anomalyTag.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-sm text-slate-600 dark:text-slate-300">
                          <p className="truncate">{proj.why_flagged}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <RiskTierBadge tier={proj.risk_tier} score={proj.risk_score} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedProjectId(proj.project_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-semibold text-xs border border-brand-200 dark:border-brand-800"
                          >
                            <Eye size={12} />
                            <span>Health Card</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Project Health Card Modal */}
      {selectedProjectId && (
        <ProjectHealthCardModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onNavigateToCases={() => {
            setSelectedProjectId(null)
            if (onNavigate) onNavigate('case_management')
          }}
        />
      )}

    </div>
  )
}
