import { useState, useEffect } from 'react'
import {
  ClipboardCheck, Shield, AlertTriangle, CheckCircle2, Clock, Search,
  Filter, Calendar, UserCheck, Scale, ArrowRight, FileText, Check,
  RefreshCw, ChevronRight, Eye, Sparkles, Building, AlertCircle
} from 'lucide-react'
import { fetchCases, reviewCase, INR } from '../api'
import { useRole } from '../context/RoleContext'
import ProjectHealthCardModal from '../components/ProjectHealthCardModal'

const STATUS_TABS = [
  { id: 'all', label: 'All Cases' },
  { id: 'Under Review', label: 'Under Review' },
  { id: 'Field Inspection Scheduled', label: 'Inspection Scheduled' },
  { id: 'Evidence Requested', label: 'Evidence Requested' },
  { id: 'Resolved - Legitimate', label: 'Resolved (Legitimate)' },
]

const STATUS_BADGES = {
  'Under Review': 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
  'Field Inspection Scheduled': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300',
  'Evidence Requested': 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
  'Resolved - Legitimate': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
  'Corrective Action Initiated': 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300',
}

export default function CaseManagement() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState(null)
  const [activeStatusTab, setActiveStatusTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectIdForHealthCard, setSelectedProjectIdForHealthCard] = useState(null)
  const { roleConfig, activeRole, roleValue } = useRole()

  // Action form state
  const [actionType, setActionType] = useState('Schedule Field Inspection')
  const [officerNotes, setOfficerNotes] = useState('')
  const [resolutionText, setResolutionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionFeedback, setActionFeedback] = useState('')

  const loadCases = async () => {
    setLoading(true)
    try {
      const res = await fetchCases()
      const list = res?.cases || []
      setCases(list)
      if (list.length > 0 && !selectedCase) {
        setSelectedCase(list[0])
      }
    } catch (e) {
      console.error('Failed to load cases', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  const filteredCases = cases.filter(cs => {
    const matchesTab = activeStatusTab === 'all' || cs.status === activeStatusTab
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      cs.case_id?.toLowerCase().includes(q) ||
      cs.project_id?.toLowerCase().includes(q) ||
      cs.summary?.toLowerCase().includes(q) ||
      cs.assigned_officer?.toLowerCase().includes(q) ||
      cs.opened_by?.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const stats = {
    total: cases.length,
    underReview: cases.filter(c => c.status === 'Under Review').length,
    scheduled: cases.filter(c => c.status === 'Field Inspection Scheduled').length,
    evidenceReq: cases.filter(c => c.status === 'Evidence Requested').length,
    resolved: cases.filter(c => c.status?.includes('Resolved')).length,
  }

  const handleExecuteAction = async () => {
    if (!selectedCase) return
    setSubmitting(true)
    setActionFeedback('')

    try {
      let finalResolution = null
      if (actionType === 'Resolve - Legitimate') {
        finalResolution = resolutionText ||
          `Legitimate operational justification accepted: ${officerNotes || 'Site conditions and technical documentation verified by District Authority.'}`
      } else if (actionType === 'Corrective Action Initiated') {
        finalResolution = resolutionText ||
          `Administrative corrective action initiated: ${officerNotes || 'Formal notice issued to implementing agency for milestone rectification.'}`
      }

      await reviewCase(selectedCase.case_id, {
        action: actionType,
        notes: officerNotes || `Administrative action updated: ${actionType}`,
        resolution: finalResolution,
        officer: `${roleConfig.shortLabel} (${roleValue || 'Authorized'})`,
        role: activeRole
      })

      setActionFeedback(`Successfully updated Case ${selectedCase.case_id} — "${actionType}"`)
      setOfficerNotes('')
      setResolutionText('')
      
      // Reload cases
      const res = await fetchCases()
      const list = res?.cases || []
      setCases(list)
      const updated = list.find(c => c.case_id === selectedCase.case_id)
      if (updated) setSelectedCase(updated)
    } catch (err) {
      console.error('Action failed', err)
      setActionFeedback('Action failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-surface-900">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Decision-Support Verification Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-semibold">
              Human-in-the-Loop
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            District Authority operational hub for reviewing AI-flagged discrepancies, scheduling field inspections, and recording binding administrative determinations.
          </p>
        </div>

        <button
          onClick={loadCases}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-700 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Cases</span>
        </button>
      </div>

      {/* Governance Principle Alert */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-surface-800 dark:via-surface-750 dark:to-surface-800 rounded-xl border border-blue-200 dark:border-surface-600 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
          <Scale size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span>
            <strong>Statutory Mandate:</strong> AI recommendations are advisory decision-support signals. Final case determinations, contractor notices, and sanction adjustments require approval by the competent District Authority.
          </span>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Cases</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          <p className="text-[10px] text-slate-400">Recorded in registry</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-amber-500">Under Review</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.underReview}</p>
          <p className="text-[10px] text-slate-400">Pending officer assessment</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-indigo-500">Inspections Scheduled</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.scheduled}</p>
          <p className="text-[10px] text-slate-400">Field visit pending</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-blue-500">Evidence Requested</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{stats.evidenceReq}</p>
          <p className="text-[10px] text-slate-400">Awaiting agency upload</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-emerald-500">Resolved (Legitimate)</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.resolved}</p>
          <p className="text-[10px] text-slate-400">Verified & closed</p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Cases List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search and Tabs */}
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600 p-3 shadow-xs space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by case ID, project ID, officer…"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatusTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                    activeStatusTab === tab.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cases Cards List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600">
                Loading verification cases…
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600">
                No verification cases matching criteria.
              </div>
            ) : (
              filteredCases.map(cs => {
                const isSelected = selectedCase?.case_id === cs.case_id
                const badgeClass = STATUS_BADGES[cs.status] || 'bg-slate-100 text-slate-800 border-slate-200'
                return (
                  <div
                    key={cs.case_id}
                    onClick={() => setSelectedCase(cs)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all bg-white dark:bg-surface-800 ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                        : 'border-slate-200 dark:border-surface-600 hover:border-slate-300 dark:hover:border-surface-500 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {cs.case_id}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {cs.status}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2 mb-2">
                      {cs.summary}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-surface-700">
                      <span className="font-mono text-brand-600 dark:text-brand-400">{cs.project_id}</span>
                      <span>Assigned: {cs.assigned_officer ? cs.assigned_officer.split(',')[0] : 'Unassigned'}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Decision & Action Panel */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600 shadow-md overflow-hidden">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-surface-600 bg-slate-50/50 dark:bg-surface-750/50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-surface-600 text-slate-800 dark:text-slate-200">
                      {selectedCase.case_id}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_BADGES[selectedCase.status] || ''}`}>
                      {selectedCase.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Opened: {selectedCase.opened_date}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                    {selectedCase.alert_type}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target Project ID: <strong className="font-mono text-brand-600 dark:text-brand-400">{selectedCase.project_id}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedProjectIdForHealthCard(selectedCase.project_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800 transition-colors shadow-xs"
                >
                  <Eye size={13} />
                  <span>View Health Card</span>
                </button>
              </div>

              {/* Case Details Body */}
              <div className="p-6 space-y-5">
                
                {/* AI Anomaly Alert Summary */}
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs">
                  <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold mb-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    <span>AI Detection Synopsis (Decision-Support Signal)</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedCase.summary}
                  </p>
                  <div className="mt-2 text-[10px] text-purple-700 dark:text-purple-400">
                    Opened By: {selectedCase.opened_by} ({selectedCase.role})
                  </div>
                </div>

                {/* Evidence & Field Inspection Log */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    Inspection & Evidence Log
                  </h3>

                  {selectedCase.evidence_notes && selectedCase.evidence_notes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCase.evidence_notes.map((note, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-700/50 border border-slate-200 dark:border-surface-600 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-surface-700/30 rounded-lg">
                      No field inspection notes recorded yet.
                    </p>
                  )}
                </div>

                {/* Resolution Banner if resolved */}
                {selectedCase.resolution && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
                      <CheckCircle2 size={15} />
                      <span>Official Administrative Finding Recorded</span>
                    </div>
                    <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                      {selectedCase.resolution}
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-2">
                      Determined by competent authority · Immutable log entry generated
                    </p>
                  </div>
                )}

                {/* Authority Action Center */}
                {roleConfig.canTakeCaseAction ? (
                  <div className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-surface-750 dark:to-surface-700 border border-slate-300 dark:border-surface-600 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Scale size={14} className="text-blue-600" />
                        Take Administrative Action ({roleConfig.shortLabel})
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-500 font-mono">
                        Authority: {roleValue || roleConfig.shortLabel}
                      </span>
                    </div>

                    {actionFeedback && (
                      <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 font-medium">
                        <CheckCircle2 size={14} />
                        <span>{actionFeedback}</span>
                      </div>
                    )}

                    {/* Action Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'Schedule Field Inspection', label: 'Field Inspection', icon: Calendar },
                        { id: 'Resolve - Legitimate', label: 'Resolve (Legitimate)', icon: CheckCircle2 },
                        { id: 'Request Additional Evidence', label: 'Request Evidence', icon: FileText },
                      ].map(btn => {
                        const Icon = btn.icon
                        const isAct = actionType === btn.id
                        return (
                          <button
                            key={btn.id}
                            onClick={() => setActionType(btn.id)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              isAct
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-surface-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-surface-600 hover:bg-slate-100 dark:hover:bg-surface-700'
                            }`}
                          >
                            <Icon size={13} />
                            <span>{btn.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Input fields based on action */}
                    {actionType === 'Schedule Field Inspection' && (
                      <div className="space-y-2 text-xs">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Inspection Scope & Checklist:
                        </label>
                        <input
                          type="text"
                          value={officerNotes}
                          onChange={e => setOfficerNotes(e.target.value)}
                          placeholder="e.g., Verify BOQ against rock strata; photograph tank dimensions; check cement inventory"
                          className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-surface-500 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {actionType === 'Resolve - Legitimate' && (
                      <div className="space-y-2 text-xs">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Official Justification Rationale (Mandatory for record):
                        </label>
                        <textarea
                          rows={2}
                          value={resolutionText}
                          onChange={e => setResolutionText(e.target.value)}
                          placeholder="e.g., On-site physical verification confirmed hard rock excavation requiring controlled blasting. Cost variation of 18% is justified under geological norms. Work progress is legitimate."
                          className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-surface-500 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {actionType === 'Request Additional Evidence' && (
                      <div className="space-y-2 text-xs">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Evidence Submission Notice:
                        </label>
                        <input
                          type="text"
                          value={officerNotes}
                          onChange={e => setOfficerNotes(e.target.value)}
                          placeholder="e.g., Request contractor to submit geo-tagged site photographs and cement purchase invoices within 7 days"
                          className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-surface-500 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleExecuteAction}
                        disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        <Scale size={14} />
                        <span>{submitting ? 'Recording Decision…' : 'Record Official Decision'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-700/50 border border-slate-200 dark:border-surface-600 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Statutory Authority Notice:
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      You are viewing this case under <strong>{roleConfig.label}</strong> credentials. Only designated District Authorities or State Nodal Officers have statutory jurisdiction to execute case actions, schedule field visits, or record binding determinations.
                    </p>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600">
              Select a verification case to review evidence and record administrative determinations.
            </div>
          )}
        </div>

      </div>

      {/* Embedded Project Health Card Modal if triggered */}
      {selectedProjectIdForHealthCard && (
        <ProjectHealthCardModal
          projectId={selectedProjectIdForHealthCard}
          onClose={() => setSelectedProjectIdForHealthCard(null)}
          onNavigateToCases={() => setSelectedProjectIdForHealthCard(null)}
        />
      )}

    </div>
  )
}
