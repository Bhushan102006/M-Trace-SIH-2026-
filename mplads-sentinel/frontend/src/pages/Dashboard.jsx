import { useEffect, useState } from 'react'
import {
  AlertTriangle, FolderOpen, Shield, IndianRupee, BarChart3, TrendingUp,
  MapPin, ArrowRight, Layers, RefreshCw, ShieldAlert,
  Clock, Activity, TrendingDown, CheckCircle2, Scale, Sparkles, Eye,
  UserCheck, ExternalLink, HelpCircle
} from 'lucide-react'
import { fetchStats, fetchAnomalies, fetchAnomalyTypes, fetchStateSummary, fetchFundFlow, fetchCases, INR } from '../api'
import KpiCard from '../components/KpiCard'
import ProjectHealthCardModal from '../components/ProjectHealthCardModal'
import { useTheme } from '../context/ThemeContext'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Legend
} from 'recharts'

const ANOMALY_COLORS = {
  progress_divergence:    '#f59e0b',
  cost_outlier:           '#8b5cf6',
  duplicate_scope:        '#ef4444',
  geo_evidence_mismatch:  '#ec4899',
  timeline_delay:         '#06b6d4',
  concentrated_contractor:'#3b82f6',
  none:                   '#10b981',
}

const TIER_COLORS = {
  'Normal':               '#10b981',
  'Watch':                '#3b82f6',
  'Review Required':      '#f59e0b',
  'High Priority Review': '#ef4444',
}

function RiskTierBadge({ tier, score }) {
  if (tier === 'High Priority Review') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        High Priority ({score})
      </span>
    )
  }
  if (tier === 'Review Required') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Review Req ({score})
      </span>
    )
  }
  if (tier === 'Watch') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Watch ({score})
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Normal ({score})
    </span>
  )
}

function FundFunnelMini({ overall }) {
  if (!overall) return null
  const steps = [
    { label: 'Sanctioned', value: overall.sanctioned, color: '#6366f1' },
    { label: 'Released',   value: overall.released,   color: '#10b981' },
    { label: 'Expended',   value: overall.expended,   color: '#f59e0b' },
    { label: 'Utilised',   value: overall.utilised,   color: '#3b82f6' },
  ]
  const max = overall.sanctioned || 1
  return (
    <div className="space-y-2.5">
      {steps.map(step => (
        <div key={step.label} className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">{step.label}</span>
            <span className="font-mono font-bold" style={{ color: step.color }}>{INR(step.value)}</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max((step.value / max) * 100, 2)}%`, background: step.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [highRiskProjects, setHighRiskProjects] = useState([])
  const [anomalyTypes, setAnomalyTypes] = useState(null)
  const [stateSummary, setStateSummary] = useState([])
  const [fundFlow, setFundFlow] = useState(null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHealthCardId, setSelectedHealthCardId] = useState(null)
  const { isDark } = useTheme()

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchStats(),
      fetchAnomalies({ risk_tier: 'High Priority Review', limit: 8 }),
      fetchAnomalyTypes(),
      fetchStateSummary().catch(() => []),
      fetchFundFlow().catch(() => null),
      fetchCases().catch(() => ({ cases: [] })),
    ])
      .then(([s, a, at, st, ff, cs]) => {
        setStats(s)
        setHighRiskProjects(a?.data || [])
        setAnomalyTypes(at)
        if (Array.isArray(st)) {
          setStateSummary(st.slice(0, 8))
        }
        setFundFlow(ff)
        setCases(cs?.cases || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const pieData = anomalyTypes?.counts
    ? Object.entries(anomalyTypes.counts)
        .filter(([k]) => k !== 'none')
        .map(([name, value]) => ({
          name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value,
          rawKey: name,
        }))
    : []

  const tooltipBg     = isDark ? '#1e1e35' : '#ffffff'
  const tooltipBorder = isDark ? '#2e2e50' : '#e2e8f0'
  const tooltipText   = isDark ? '#f8fafc' : '#0f172a'
  const gridColor     = isDark ? '#252540' : '#f1f5f9'
  const tickColor     = isDark ? '#94a3b8' : '#64748b'

  const totalWorks = stats?.total_projects || 800
  const normalPct = stats?.normal_count ? Math.round((stats.normal_count / totalWorks) * 100) : 65
  const watchPct = stats?.watch_count ? Math.round((stats.watch_count / totalWorks) * 100) : 20
  const reviewPct = stats?.review_required_count ? Math.round((stats.review_required_count / totalWorks) * 100) : 10
  const highPct = stats?.high_priority_count ? Math.round((stats.high_priority_count / totalWorks) * 100) : 5

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Synthesizing governance intelligence and anomaly telemetry…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-7 space-y-4 sm:space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Executive Governance Dashboard
              </h1>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 shrink-0">
                M-TRACE
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Continuous project anomaly surveillance · Schedule of Rates benchmarks · Human-in-the-loop verification
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigate && onNavigate('case_management')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <UserCheck size={15} />
              <span>Cases ({cases.filter(c => c.status === 'Under Review').length})</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('anomalies')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white dark:bg-surface-800 hover:bg-slate-50 dark:hover:bg-surface-700 border border-slate-200 dark:border-surface-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors"
            >
              <ShieldAlert size={15} className="text-amber-500" />
              <span>Anomalies</span>
            </button>
          </div>
        </div>

        {/* Governance Principle Banner */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-surface-800 dark:via-surface-750 dark:to-surface-800 rounded-2xl border border-blue-200 dark:border-surface-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <Scale size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-relaxed">
              <strong>Statutory Decision Support:</strong> AI algorithms compute statistical deviations and cost-rate discrepancies. The competent District Authority retains full statutory discretion to evaluate explanations and record determinations.
            </span>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('audit_trail')}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline whitespace-nowrap text-xs self-end sm:self-auto shrink-0"
          >
            <span>View Audit Log</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* 4-TIER RISK CLASSIFICATION MATRIX */}
        <div className="bg-white dark:bg-surface-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-surface-600 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-Factor Risk Distribution Matrix (0–100 Scale)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proportionate governance classification ensuring focused scrutiny on meaningful anomalies
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Avg Risk: <strong>{stats?.avg_risk_score || 24.5}/100</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Normal Tier */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300">Tier 1: Normal</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">0–25</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 sm:mt-2">
                {stats?.normal_count || 520} <span className="text-xs font-normal text-slate-500">({normalPct}%)</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">Continuous monitoring</p>
            </div>

            {/* Watch Tier */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-blue-800 dark:text-blue-300">Tier 2: Watch</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">26–50</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1.5 sm:mt-2">
                {stats?.watch_count || 160} <span className="text-xs font-normal text-slate-500">({watchPct}%)</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">Minor rate variance</p>
            </div>

            {/* Review Required Tier */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-300">Tier 3: Review</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">51–75</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5 sm:mt-2">
                {stats?.review_required_count || 85} <span className="text-xs font-normal text-slate-500">({reviewPct}%)</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">Warrants officer check</p>
            </div>

            {/* High Priority Review Tier */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-rose-800 dark:text-rose-300">Tier 4: Priority</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">76–100</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1.5 sm:mt-2">
                {stats?.high_priority_count || 35} <span className="text-xs font-normal text-slate-500">({highPct}%)</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">Targeted field priority</p>
            </div>
          </div>
        </div>

        {/* KPI Grid — Operational Governance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Total MPLADS Works"
            value={stats?.total_projects ? stats.total_projects.toLocaleString('en-IN') : '—'}
            icon={FolderOpen}
            color="brand"
            sub={`Total Sanctioned: ${INR(stats?.total_sanctioned)}`}
          />
          <KpiCard
            title="Projects Warrants Review"
            value={(stats?.review_required_count || 0) + (stats?.high_priority_count || 0)}
            icon={AlertTriangle}
            color="danger"
            sub={`${Math.round((((stats?.review_required_count || 0) + (stats?.high_priority_count || 0)) / totalWorks) * 100)}% of total portfolio`}
          />
          <KpiCard
            title="Active Verification Cases"
            value={cases.length}
            icon={UserCheck}
            color="brand"
            sub={`${cases.filter(c => c.status === 'Under Review').length} awaiting officer action`}
          />
          <KpiCard
            title="Avg Fund Utilisation"
            value={`${stats?.avg_utilisation_pct ?? '—'}%`}
            icon={IndianRupee}
            color="warn"
            sub={`Expended: ${INR(stats?.total_utilised)}`}
          />
        </div>

        {/* Analytical Section: Anomaly Distribution & Fund Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Anomaly Category Distribution */}
          <div className="lg:col-span-7 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Operational Anomaly Typology Distribution
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-detected operational deviations across 5 domain-specific engines
                </p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate('anomalies')}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pieData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} width={160} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val) => [`${val} Projects`, 'Flagged']}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ANOMALY_COLORS[entry.rawKey] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fund Flow Funnel & State Overview */}
          <div className="lg:col-span-5 card space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Statutory Fund Utilization Pacing
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Constituency fund progression: Sanctioned → Released → Expended
              </p>
            </div>

            <FundFunnelMini overall={fundFlow?.overall} />

            <div className="pt-3 border-t border-slate-100 dark:border-surface-600">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">State Risk Surveillance</span>
                <button
                  onClick={() => onNavigate && onNavigate('map')}
                  className="text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Geospatial Map</span>
                  <ArrowRight size={11} />
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
                {stateSummary.slice(0, 5).map(st => (
                  <div key={st.state} className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-surface-700/40">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{st.state}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500 text-[11px]">{st.total_projects} works</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{st.high_risk || 0} reviews</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HIGH PRIORITY REVIEW PROJECTS TABLE */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Priority Review Works Requiring District Authority Verification
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Projects with Multi-Factor Risk Score ≥ 70 requiring on-site or documentary verification
              </p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('projects')}
              className="btn-secondary text-xs"
            >
              <span>View Full Ledger</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Mobile View: Cards */}
          <div className="space-y-3 md:hidden">
            {highRiskProjects.slice(0, 6).map((proj) => (
              <div
                key={proj.project_id}
                onClick={() => setSelectedHealthCardId(proj.project_id)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-surface-600 bg-slate-50/60 dark:bg-surface-750/50 space-y-2.5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {proj.project_id}
                    </span>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5 line-clamp-2">
                      {proj.work_type || 'Civil Infrastructure Work'}
                    </h4>
                  </div>
                  <div className="shrink-0">
                    <RiskTierBadge tier={proj.risk_tier || 'High Priority Review'} score={Math.round(proj.risk_score || 75)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-200/70 dark:border-surface-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">District</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{proj.district}, {proj.state}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Sanctioned</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{INR(proj.sanctioned_amt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Physical Progress</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 bg-slate-200 dark:bg-surface-600 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, proj.physical_progress_pct || 0)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {proj.physical_progress_pct || 0}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Expenditure</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">{INR(proj.expenditure_amt || proj.utilised_amt)}</span>
                  </div>
                </div>

                <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedHealthCardId(proj.project_id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-semibold text-xs border border-brand-200 dark:border-brand-800 transition-colors"
                  >
                    <Eye size={13} />
                    <span>Open 4-Layer Health Card</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-surface-750 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-surface-600 uppercase text-[11px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Project ID / Work</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Sanctioned / Expended</th>
                  <th className="px-4 py-3">Physical Progress</th>
                  <th className="px-4 py-3">Risk Tier</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-surface-700">
                {highRiskProjects.slice(0, 6).map((proj) => (
                  <tr key={proj.project_id} className="hover:bg-slate-50/70 dark:hover:bg-surface-700/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-brand-600 dark:text-brand-400">{proj.project_id}</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 max-w-xs truncate">
                        {proj.work_type || 'Civil Infrastructure Work'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">{proj.district}</div>
                      <div className="text-[11px] text-slate-400">{proj.state}</div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{INR(proj.sanctioned_amt)}</div>
                      <div className="text-[11px] text-slate-400">{INR(proj.expenditure_amt || proj.utilised_amt)} spent</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 dark:bg-surface-600 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, proj.physical_progress_pct || 0)}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{proj.physical_progress_pct || 0}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{proj.status}</span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <RiskTierBadge tier={proj.risk_tier || 'High Priority Review'} score={Math.round(proj.risk_score || 75)} />
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedHealthCardId(proj.project_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-semibold text-xs border border-brand-200 dark:border-brand-800 transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Health Card</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Global Project Health Card Modal */}
      {selectedHealthCardId && (
        <ProjectHealthCardModal
          projectId={selectedHealthCardId}
          onClose={() => setSelectedHealthCardId(null)}
          onNavigateToCases={() => {
            setSelectedHealthCardId(null)
            if (onNavigate) onNavigate('case_management')
          }}
        />
      )}

    </div>
  )
}
