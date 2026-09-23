import { useState, useEffect } from 'react'
import {
  X, Shield, AlertTriangle, CheckCircle2, Clock, MapPin, IndianRupee,
  FileText, Activity, Sparkles, Scale, ExternalLink, UserCheck, Calendar,
  Building, Check, AlertCircle, Eye, ArrowRight, CornerDownRight, Camera, Maximize2
} from 'lucide-react'
import { fetchHealthCard, reviewCase, INR } from '../api'
import { useRole } from '../context/RoleContext'
import LiveEvidenceCameraModal from './LiveEvidenceCameraModal'

const TIER_STYLES = {
  'Normal': {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    accent: 'emerald',
  },
  'Watch': {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
    accent: 'blue',
  },
  'Review Required': {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    accent: 'amber',
  },
  'High Priority Review': {
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    accent: 'rose',
  },
}

export default function ProjectHealthCardModal({ projectId, onClose, onNavigateToCases }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('c_ai') // Default to Layer C: AI Inference & Explainable Insights
  const [officerNote, setOfficerNote] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [previewEvidenceImage, setPreviewEvidenceImage] = useState(null)
  const { roleConfig, activeRole } = useRole()

  const loadCard = () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    fetchHealthCard(projectId)
      .then(res => {
        setData(res)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch health card')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCard()
  }, [projectId])

  if (!projectId) return null

  const src = data?.source_data || {}
  const der = data?.derived_data || {}
  const ai = data?.ai_inference || {}
  const human = data?.human_decision || {}

  const tier = ai.risk_tier || 'Normal'
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES['Normal']
  const riskScore = ai.risk_score != null ? Math.round(ai.risk_score) : 0

  const handleQuickReview = async (actionType) => {
    const activeCase = human.verification_cases?.[0]
    if (!activeCase) return
    setSubmittingAction(true)
    try {
      await reviewCase(activeCase.case_id, {
        action: actionType,
        notes: officerNote || `Administrative action taken via Health Card: ${actionType}`,
        officer_name: 'District Authority',
        role: 'district'
      })
      setActionSuccess(`Action "${actionType}" successfully recorded in audit log.`)
      setOfficerNote('')
      // Refresh health card
      const updated = await fetchHealthCard(projectId)
      setData(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] bg-white dark:bg-surface-800 rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-surface-600 overflow-hidden my-0 sm:my-8 flex flex-col">
        
        {/* Modal Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-surface-600 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-surface-800 dark:via-surface-750 dark:to-surface-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
              <span className="font-mono text-[11px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-slate-200 dark:bg-surface-600 text-slate-800 dark:text-slate-200">
                {projectId}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${tierStyle.badge}`}>
                <span className={`w-2 h-2 rounded-full ${tierStyle.dot}`} />
                {tier} ({riskScore}/100)
              </span>
              <span className="text-[11px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-slate-300 font-medium hidden sm:inline-block">
                {src.financial_year || 'FY 2025-26'}
              </span>
              <span className="text-[11px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                {src.status || 'In Progress'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1.5 truncate">
              {src.work_type || 'Civil Infrastructure Work'} — {src.work_description || src.district}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Hon'ble MP: <strong className="text-slate-700 dark:text-slate-300">{src.mp_name || 'N/A'}</strong> · District: <strong className="text-slate-700 dark:text-slate-300">{src.district}, {src.state}</strong> · Contractor: <span className="font-mono text-slate-600 dark:text-slate-400">{src.contractor || 'N/A'}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCameraModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Real-Time Camera Geotag (No Gallery Uploads)"
            >
              <Camera size={14} />
              <span className="hidden sm:inline">Live Evidence Camera</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16">
            <Activity size={36} className="text-brand-600 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Compiling 4-Layer Project Health Card…</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle size={36} className="text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 dark:bg-surface-600 rounded-lg text-xs font-semibold">Close</button>
          </div>
        ) : (
          <>
            {/* Project Progress Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-100/70 dark:bg-surface-750/70 border-b border-slate-200 dark:border-surface-600 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sanctioned / Expended</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                  {INR(src.sanctioned_amt)} <span className="text-slate-400 font-normal">/ {INR(src.expenditure_amt)}</span>
                </p>
                <div className="w-full bg-slate-200 dark:bg-surface-600 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, der.financial_progress_pct || 0)}%` }} />
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Physical Progress</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                  {der.physical_progress_pct != null ? `${der.physical_progress_pct}%` : 'N/A'}
                  <span className="text-[10px] text-slate-400 ml-1 font-normal hidden sm:inline">({src.milestone_stage || 'Under Execution'})</span>
                </p>
                <div className="w-full bg-slate-200 dark:bg-surface-600 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, der.physical_progress_pct || 0)}%` }} />
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Progress Gap</p>
                <p className={`font-semibold mt-0.5 truncate ${(der.progress_discrepancy || 0) > 20 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                  {(der.progress_discrepancy || 0) > 0 ? `+${der.progress_discrepancy}% gap` : 'Synced'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">Fin: {der.financial_progress_pct}% | Phy: {der.physical_progress_pct}%</p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Delay Status</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                  {der.days_delayed > 0 ? `${der.days_delayed} days delayed` : 'On Schedule'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{der.delay_status || 'Regular'}</p>
              </div>
            </div>

            {/* 4-Layer Tabs Navigation */}
            <div className="px-3 sm:px-6 border-b border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('a_source')}
                className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2.5 sm:px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'a_source'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <FileText size={14} />
                <span className="sm:hidden">Layer A</span>
                <span className="hidden sm:inline">Layer A: Source Data (Ground Truth)</span>
              </button>

              <button
                onClick={() => setActiveTab('b_derived')}
                className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2.5 sm:px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'b_derived'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Activity size={14} />
                <span className="sm:hidden">Layer B</span>
                <span className="hidden sm:inline">Layer B: Derived Calculations</span>
              </button>

              <button
                onClick={() => setActiveTab('c_ai')}
                className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2.5 sm:px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'c_ai'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles size={14} />
                <span className="sm:hidden">Layer C (AI)</span>
                <span className="hidden sm:inline">Layer C: AI Inference & Explainability</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px]">
                  XAI
                </span>
              </button>

              <button
                onClick={() => setActiveTab('d_decision')}
                className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2.5 sm:px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'd_decision'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Scale size={14} />
                <span className="sm:hidden">Layer D (Evidence)</span>
                <span className="hidden sm:inline">Layer D: Human Decision & Evidence</span>
                {human.verification_cases?.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
                    {human.verification_cases.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* LAYER A: SOURCE DATA */}
              {activeTab === 'a_source' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-surface-700/50 rounded-xl p-4 border border-slate-200 dark:border-surface-600">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" />
                      Statutory Sanction & Project Metadata
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Recommendation Date:</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{src.recommended_date || '2025-06-15'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Sanction Order Date:</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{src.sanctioned_date || '2025-07-20'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Target Completion:</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{src.target_completion_date || '2026-04-30'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Sanctioned Amount:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{INR(src.sanctioned_amt)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Funds Released:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{INR(src.released_amt)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Contractor / Agency:</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{src.contractor}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GPS & Photo Evidence */}
                    <div className="bg-slate-50 dark:bg-surface-700/50 rounded-xl p-4 border border-slate-200 dark:border-surface-600">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <MapPin size={14} className="text-rose-500" />
                        Digital Evidence & Geolocation Capture
                      </h3>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-surface-600">
                          <span className="text-slate-500">Approved Site Coordinates:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{src.site_lat || src.lat}, {src.site_lon || src.lon}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-surface-600">
                          <span className="text-slate-500">Inspection Photo GPS Coordinates:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{src.photo_lat || 'N/A'}, {src.photo_lon || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-surface-600">
                          <span className="text-slate-500">GPS Offset Distance:</span>
                          <span className={`font-mono font-bold ${(der.geo_distance_m || 0) > 150 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {der.geo_distance_m != null ? `${Math.round(der.geo_distance_m)} meters` : 'Within tolerance'}
                          </span>
                        </div>
                        <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                          {(der.geo_distance_m || 0) > 150 ? (
                            <span>⚠️ Inspection photo captured {Math.round(der.geo_distance_m)}m away from registered site (tolerance limit: 150m). Review recommended.</span>
                          ) : (
                            <span>✓ Inspection photo coordinates match registered site within acceptable geofence buffer.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Material Invoices vs Schedule of Rates */}
                    <div className="bg-slate-50 dark:bg-surface-700/50 rounded-xl p-4 border border-slate-200 dark:border-surface-600">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <IndianRupee size={14} className="text-emerald-500" />
                        Procurement Invoice Rates (Schedule of Rates)
                      </h3>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-surface-600">
                          <span className="text-slate-500">Cement Unit Rate:</span>
                          <div className="text-right">
                            <span className={`font-semibold ${(src.cement_rate || 0) > 420 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              ₹{src.cement_rate || 380} / bag
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5">(Regional benchmark: ₹380)</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-surface-600">
                          <span className="text-slate-500">Reinforcement Steel Rate:</span>
                          <div className="text-right">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">₹{src.steel_rate || 72} / kg</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">(Benchmark: ₹72)</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-surface-600">
                          <span className="text-slate-500">Skilled Labour Rate:</span>
                          <div className="text-right">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">₹{src.labour_rate || 600} / day</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">(Schedule: ₹580–₹620)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LAYER B: DERIVED DATA */}
              {activeTab === 'b_derived' && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-800 dark:text-indigo-300">
                    <strong>Deterministic Mathematical Layer:</strong> These metrics are calculated directly from verified project submissions and timestamps without machine learning inference.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-surface-700/50 p-4 rounded-xl border border-slate-200 dark:border-surface-600">
                      <p className="text-xs text-slate-400">Cost Deviation from Peer Median</p>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {der.cost_deviation_pct != null ? `${der.cost_deviation_pct > 0 ? '+' : ''}${der.cost_deviation_pct}%` : '0%'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Comparison against median cost for similar works in {src.state}</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-surface-700/50 p-4 rounded-xl border border-slate-200 dark:border-surface-600">
                      <p className="text-xs text-slate-400">Progress-Expenditure Divergence</p>
                      <p className={`text-xl font-bold mt-1 ${(der.progress_discrepancy || 0) > 20 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {der.progress_discrepancy != null ? `${der.progress_discrepancy}% gap` : '0%'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Financial drawdowns exceed physical milestone progress</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-surface-700/50 p-4 rounded-xl border border-slate-200 dark:border-surface-600">
                      <p className="text-xs text-slate-400">Geofence Distance Deviation</p>
                      <p className={`text-xl font-bold mt-1 ${(der.geo_distance_m || 0) > 150 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {der.geo_distance_m != null ? `${Math.round(der.geo_distance_m)} meters` : '0m'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Euclidean offset from registered site coordinates</p>
                    </div>
                  </div>
                </div>
              )}

              {/* LAYER C: AI INFERENCE & EXPLAINABILITY */}
              {activeTab === 'c_ai' && (
                <div className="space-y-6">
                  {/* Governance Advisory Banner */}
                  <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span><strong>AI-Assisted Governance:</strong> This analysis identifies statistical anomalies to assist authorized officers. It does NOT constitute a final administrative finding.</span>
                    </div>
                    <span className="font-semibold px-2 py-0.5 rounded bg-purple-200/70 dark:bg-purple-800/60 text-purple-800 dark:text-purple-200 text-[10px]">
                      Confidence: {Math.round((ai.confidence_score || 0.85) * 100)}%
                    </span>
                  </div>

                  {/* 4-Question XAI Synthesis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Q1: WHY */}
                    <div className="p-4 bg-slate-50 dark:bg-surface-700/50 rounded-xl border border-slate-200 dark:border-surface-600">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">1</span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Why Was This Project Flagged?
                        </h4>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {ai.why_flagged || 'Statistical divergence in expenditure velocity and unit cost benchmarks.'}
                      </p>
                    </div>

                    {/* Q3: HOW SERIOUS */}
                    <div className="p-4 bg-slate-50 dark:bg-surface-700/50 rounded-xl border border-slate-200 dark:border-surface-600">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">2</span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Calculated Risk Tier (How Serious?)
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${tierStyle.badge}`}>
                          {tier} (Score: {riskScore}/100)
                        </span>
                        <span className="text-xs text-slate-500">
                          {tier === 'High Priority Review' ? 'Requires targeted verification by District Authority'
                           : tier === 'Review Required' ? 'Warrants administrative review during monthly meeting'
                           : 'Normal continuous monitoring'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Q2: WHAT DATA POINTS */}
                  <div className="bg-slate-50 dark:bg-surface-700/50 rounded-xl p-4 border border-slate-200 dark:border-surface-600">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">3</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        What Data Points Caused the Alert?
                      </h4>
                    </div>

                    {ai.xai_factors && ai.xai_factors.length > 0 ? (
                      <div className="space-y-2">
                        {ai.xai_factors.map((factor, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{factor.factor}</span>
                              <span className="text-slate-500 dark:text-slate-400">({factor.detail || factor.value})</span>
                            </div>
                            <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
                              {factor.contribution || 'Flagged'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">All data points are within standard historical parameters.</p>
                    )}
                  </div>

                  {/* Q4: WHAT NEXT (RECOMMENDED ACTIONS) */}
                  <div className="bg-slate-50 dark:bg-surface-700/50 rounded-xl p-4 border border-slate-200 dark:border-surface-600">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">4</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Recommended Next Steps for Authority
                      </h4>
                    </div>

                    {ai.recommended_actions && ai.recommended_actions.length > 0 ? (
                      <ul className="space-y-2">
                        {ai.recommended_actions.map((act, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 p-2 bg-white dark:bg-surface-800 rounded-lg border border-slate-200 dark:border-surface-600">
                            <ArrowRight size={14} className="text-brand-600 flex-shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">Standard periodic progress reporting is recommended.</p>
                    )}
                  </div>
                </div>
              )}

              {/* LAYER D: HUMAN DECISION & VERIFICATION TRAIL */}
              {activeTab === 'd_decision' && (
                <div className="space-y-6">
                  {/* Verification Cases */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <UserCheck size={14} className="text-emerald-600" />
                      Active Verification Cases
                    </h3>

                    {human.verification_cases && human.verification_cases.length > 0 ? (
                      human.verification_cases.map((cs) => (
                        <div key={cs.case_id} className="p-4 rounded-xl bg-slate-50 dark:bg-surface-700/50 border border-slate-200 dark:border-surface-600 mb-3">
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">{cs.case_id}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                {cs.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">Assigned: {cs.assigned_officer || 'Unassigned'}</span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">{cs.summary}</p>

                          {cs.resolution && (
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 mb-3">
                              <strong>Official Finding:</strong> {cs.resolution}
                            </div>
                          )}

                          {cs.evidence_notes && cs.evidence_notes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] font-bold uppercase text-slate-400">Inspection & Evidence Log:</p>
                              {cs.evidence_notes.map((note, nIdx) => (
                                <p key={nIdx} className="text-[11px] text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-slate-300 dark:border-surface-500">
                                  {note}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 p-4 bg-slate-50 dark:bg-surface-700/30 rounded-xl">
                        No active verification case opened for this project yet.
                      </p>
                    )}
                  </div>

                  {/* Role-Based Action Panel */}
                  {roleConfig.canTakeCaseAction ? (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-surface-750 dark:to-surface-700 border border-blue-200 dark:border-surface-600">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Scale size={14} className="text-blue-600" />
                          Take Administrative Action ({roleConfig.shortLabel})
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                          Authorized Adjudicator
                        </span>
                      </div>

                      {actionSuccess && (
                        <div className="p-2.5 mb-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 size={14} />
                          <span>{actionSuccess}</span>
                        </div>
                      )}

                      <textarea
                        value={officerNote}
                        onChange={(e) => setOfficerNote(e.target.value)}
                        placeholder="Enter official observation or inspection rationale (e.g. 'Site inspected: rocky excavation required additional blasting. Cost justified.')..."
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-surface-500 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() => handleQuickReview('Schedule Field Inspection')}
                          disabled={submittingAction}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                        >
                          Schedule Field Inspection
                        </button>

                        <button
                          onClick={() => handleQuickReview('Resolve - Legitimate')}
                          disabled={submittingAction}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                        >
                          Resolve — Legitimate Justification
                        </button>

                        <button
                          onClick={() => handleQuickReview('Request Additional Evidence')}
                          disabled={submittingAction}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-surface-600 dark:hover:bg-surface-500 text-slate-800 dark:text-slate-200 text-xs font-semibold disabled:opacity-50"
                        >
                          Request Contractor Evidence
                        </button>
                      </div>
                    </div>
                  ) : activeRole === 'contractor' ? (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-surface-750 dark:to-surface-700 border border-emerald-300 dark:border-surface-600 text-xs text-slate-700 dark:text-slate-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                          <Camera size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Contractor Real-Time Site Evidence Portal</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                          Anti-Cheat Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        To eliminate fraudulent submissions, gallery uploads are strictly disabled. Photographs must be taken directly via camera on site. High-accuracy GPS coordinates, IST timestamp, and distance to the registered geofence are cryptographically stamped onto the image.
                      </p>
                      <button
                        onClick={() => setShowCameraModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>Launch Real-Time Geotagged Camera</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-700/50 border border-slate-200 dark:border-surface-600 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale size={14} className="text-slate-400" />
                        <span><strong>Read-Only Governance Dossier:</strong> Official case adjudication, on-site measurements, and sanction determinations are restricted to the competent District Authority.</span>
                      </div>
                    </div>
                  )}

                  {/* Digital Evidence Dossiers (Real-Time Camera Captures) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Camera size={14} className="text-slate-400" />
                        Verified Digital Evidence Dossiers ({human.digital_evidence?.length || 0})
                      </h3>
                      {activeRole === 'contractor' && (
                        <button
                          onClick={() => setShowCameraModal(true)}
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Camera size={12} />
                          <span>Add Live Capture</span>
                        </button>
                      )}
                    </div>

                    {human.digital_evidence && human.digital_evidence.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {human.digital_evidence.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 text-xs space-y-2 shadow-xs"
                          >
                            <div className="relative group rounded-lg overflow-hidden border border-slate-300 dark:border-surface-600 bg-black aspect-video flex items-center justify-center">
                              <img
                                src={ev.photo_data}
                                alt="Site Evidence"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <button
                                onClick={() => setPreviewEvidenceImage(ev.photo_data)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer gap-1.5 text-xs font-semibold"
                              >
                                <Maximize2 size={16} />
                                <span>Inspect Full Geotag</span>
                              </button>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                                  ev.geofence_status === 'VERIFIED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}>
                                  {ev.geofence_status === 'VERIFIED' ? 'GEOFENCE: PASS' : 'GEOFENCE: BREACH'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(ev.timestamp || ev.captured_at).toLocaleDateString('en-IN')}
                                </span>
                              </div>

                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                {ev.stage || 'Work Milestone'}
                              </p>

                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5">
                                <div>GPS: {Number(ev.captured_lat).toFixed(4)}°N, {Number(ev.captured_lon).toFixed(4)}°E (±{ev.accuracy_m || 5}m)</div>
                                <div>Distance to Site: {ev.geo_distance_m || 0}m | MB Ref: {ev.mb_record_no || 'N/A'}</div>
                              </div>

                              {ev.remarks && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-surface-700/50 p-1.5 rounded">
                                  "{ev.remarks}"
                                </p>
                              )}

                              <div className="text-[9px] font-mono text-slate-400 truncate pt-1 border-t border-slate-100 dark:border-surface-700">
                                {ev.checksum || `SEC-${ev.evidence_id || 'VERIFIED'}`} • Live Stream
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-700/40 border border-slate-200 dark:border-surface-600 text-center space-y-2">
                        <Camera size={24} className="mx-auto text-slate-400" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No real-time camera evidence dossiers have been submitted for this project yet.
                        </p>
                        {activeRole === 'contractor' && (
                          <button
                            onClick={() => setShowCameraModal(true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            Capture First Live Site Photo
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Audit Trail Snippet */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      Administrative Audit Trail (Immutable)
                    </h3>
                    <div className="space-y-2">
                      {human.audit_trail && human.audit_trail.length > 0 ? (
                        human.audit_trail.map((entry, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 text-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span>{entry.timestamp}</span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300">{entry.user} ({entry.role})</span>
                            </div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{entry.action}</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{entry.details}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No previous audit records logged for this project.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-750 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Shield size={14} className="text-brand-600" />
                <span>M-TRACE Governance System · MoSPI DIID</span>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToCases && (
                  <button
                    onClick={() => { onClose(); onNavigateToCases(); }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-surface-500 hover:bg-slate-200 dark:hover:bg-surface-600 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                  >
                    Open in Case Management
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Close Health Card
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Live Evidence Camera Modal */}
      {showCameraModal && (
        <LiveEvidenceCameraModal
          project={data}
          onClose={() => setShowCameraModal(false)}
          onEvidenceSubmitted={() => {
            setShowCameraModal(false)
            loadCard()
          }}
        />
      )}

      {/* High-Resolution Geotag Evidence Image Zoom Modal */}
      {previewEvidenceImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewEvidenceImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-slate-950 p-2 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col items-center">
            <button
              onClick={() => setPreviewEvidenceImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X size={20} />
            </button>
            <img
              src={previewEvidenceImage}
              alt="High Resolution Geotag Evidence"
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

