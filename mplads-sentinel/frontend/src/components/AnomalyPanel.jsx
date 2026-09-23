import { useState } from 'react'
import {
  X, AlertTriangle, ShieldCheck, MapPin, Building2, Banknote, Tag, Copy, Radar,
  Fingerprint, Check, ShieldAlert, Clock, ArrowUpRight, Activity, TrendingDown, Calendar
} from 'lucide-react'
import { INR } from '../api'

function RiskBadge({ level }) {
  if (level === 'High')   return <span className="badge-high">CRITICAL HIGH</span>
  if (level === 'Medium') return <span className="badge-medium">MODERATE RISK</span>
  return <span className="badge-low">LOW RISK</span>
}

function Bar({ value, color }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-surface-500">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 w-10 text-right">{pct}%</span>
    </div>
  )
}

function ProgressBar({ value, max = 100, color }) {
  const pct = Math.round(Math.min((value || 0) / max * 100, 100))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden border border-slate-200 dark:border-surface-500">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 w-10 text-right">{value?.toFixed(1)}%</span>
    </div>
  )
}

const FLAG_ICONS = {
  iso_flag:              { icon: Radar,        label: 'Statistical Outlier (Isolation Forest)' },
  geo_flag:              { icon: MapPin,       label: 'Spatial Density Anomaly (DBSCAN)' },
  nlp_flag:              { icon: Copy,         label: 'Duplicate Project Description (TF-IDF)' },
  contractor_fuzz_flag:  { icon: Fingerprint,  label: 'Contractor Name Similarity (Levenshtein)' },
  delay_flag:            { icon: Clock,        label: 'Critical Timeline Breach (>180 days stalled)' },
  progress_gap_flag:     { icon: TrendingDown, label: 'Financial vs Physical Progress Discrepancy' },
}

const MILESTONE_ORDER = [
  'Recommended', 'Admin Sanction', 'Technical Sanction',
  'Tender Awarded', 'Work In Progress', 'Completed',
]

function MilestoneTimeline({ stage }) {
  const idx = MILESTONE_ORDER.indexOf(stage)
  return (
    <div className="relative flex items-center gap-0">
      {MILESTONE_ORDER.map((s, i) => {
        const done    = i < idx
        const current = i === idx
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
                current ? 'bg-brand-600 border-brand-600 scale-125' :
                done    ? 'bg-emerald-500 border-emerald-500' :
                          'bg-slate-200 dark:bg-surface-600 border-slate-300 dark:border-surface-500'
              }`} />
              <span className={`text-[8px] mt-1 font-medium leading-tight text-center max-w-[40px] ${
                current ? 'text-brand-600 dark:text-brand-400 font-bold' :
                done    ? 'text-emerald-600 dark:text-emerald-400' :
                          'text-slate-400 dark:text-slate-500'
              }`}>{s.split(' ')[0]}</span>
            </div>
            {i < MILESTONE_ORDER.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-surface-600'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AnomalyPanel({ project, onClose }) {
  const [copied, setCopied]           = useState(false)
  const [statusAction, setStatusAction] = useState(null)

  if (!project) return null

  const flags = Object.entries(FLAG_ICONS).filter(([k]) => project[k])

  const copyDossier = () => {
    const summary = `[MPLADS AUDIT DOSSIER]
Project ID: ${project.project_id}
Work: ${project.work_type}
MP: ${project.mp_name} (${project.district}, ${project.state})
Contractor: ${project.contractor}
Sanctioned: INR ${project.sanctioned_amt}
Utilised: INR ${project.utilised_amt}
Risk Level: ${project.risk_level} (${Math.round((project.confidence_score || 0) * 100)}% Confidence)
Days Delayed: ${project.days_delayed || 0} (${project.delay_status || 'N/A'})
Physical Progress: ${project.physical_progress_pct || 0}%
Financial Progress: ${project.financial_progress_pct || 0}%
Cost Overrun: ${project.cost_overrun_pct || 0}%
Flag Reasons: ${(project.flag_reasons || []).join('; ')}`
    navigator.clipboard?.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full bg-white dark:bg-surface-800 border-l border-slate-200 dark:border-surface-600 overflow-y-auto animate-slide-in shadow-2xl flex flex-col transition-colors duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-surface-800/95 backdrop-blur-md border-b border-slate-200 dark:border-surface-600 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-surface-600">
                {project.project_id}
              </span>
              <RiskBadge level={project.risk_level} />
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{project.work_type}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {project.district}, {project.state} · {project.financial_year || 'FY 2023-24'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-700 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors" title="Close Panel">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">

          {/* Milestone Timeline */}
          <section>
            <h3 className="section-header mb-3">Project Milestone Stage</h3>
            <MilestoneTimeline stage={project.milestone_stage || 'Recommended'} />
          </section>

          {/* Risk Confidence */}
          <section className="p-4 rounded-xl bg-slate-50 dark:bg-surface-700/50 border border-slate-200 dark:border-surface-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">AI Fraud Probability</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Confidence Rating</span>
            </div>
            <Bar
              value={project.confidence_score}
              color={project.risk_level === 'High' ? 'bg-danger-500' : project.risk_level === 'Medium' ? 'bg-warn-500' : 'bg-success-500'}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              Anomaly score from aggregate deviations across unit costs, contractor concentrations, and duplicate text embeddings.
            </p>
          </section>

          {/* Physical vs Financial Progress */}
          {(project.physical_progress_pct !== undefined || project.financial_progress_pct !== undefined) && (
            <section>
              <h3 className="section-header">Progress Comparison</h3>
              <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-surface-700/40 rounded-xl border border-slate-200 dark:border-surface-600">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                      <Activity size={12} className="text-brand-500" /> Physical Progress
                    </span>
                  </div>
                  <ProgressBar value={project.physical_progress_pct} color="bg-brand-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                      <Banknote size={12} className="text-emerald-500" /> Financial Progress
                    </span>
                  </div>
                  <ProgressBar value={project.financial_progress_pct} color="bg-emerald-500" />
                </div>
                {project.progress_discrepancy > 0 && (
                  <div className={`text-[11px] mt-1.5 p-2.5 rounded-lg ${
                    project.progress_discrepancy > 40
                      ? 'bg-red-50 dark:bg-danger-500/10 text-danger-700 dark:text-danger-300 border border-red-200 dark:border-danger-500/30'
                      : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                  }`}>
                    ⚠ Financial leads physical by <strong>{project.progress_discrepancy?.toFixed(1)}%</strong>
                    {project.progress_discrepancy > 40 && ' — Potential fund diversion detected'}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Delay Information */}
          {(project.days_delayed > 0 || project.delay_status) && (
            <section>
              <h3 className="section-header">Delay Status</h3>
              <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                project.delay_status === 'Stalled'
                  ? 'bg-red-50 dark:bg-danger-500/10 border-red-200 dark:border-danger-500/30'
                  : project.delay_status === 'Critical Delay'
                  ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                  : 'bg-slate-50 dark:bg-surface-700/40 border-slate-200 dark:border-surface-600'
              }`}>
                <Clock size={18} className={
                  project.delay_status === 'Stalled' ? 'text-danger-500 flex-shrink-0'
                  : project.delay_status === 'Critical Delay' ? 'text-orange-500 flex-shrink-0'
                  : 'text-slate-400 flex-shrink-0'
                } />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {project.days_delayed || 0} days delayed
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Status: <strong>{project.delay_status || 'On Track'}</strong>
                    {project.delay_band && ` · Band: ${project.delay_band}`}
                  </p>
                  {project.target_completion_date && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      <Calendar size={10} />
                      Target: {project.target_completion_date}
                      {project.actual_completion_date && ` · Actual: ${project.actual_completion_date}`}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Cost Overrun */}
          {project.cost_overrun_pct > 0 && (
            <section>
              <h3 className="section-header">Cost Overrun</h3>
              <div className="p-3.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-200 dark:border-orange-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Overrun Amount</span>
                  <span className="font-mono font-bold text-orange-700 dark:text-orange-300">{INR(project.cost_overrun_amt)}</span>
                </div>
                <div className="h-2 bg-orange-100 dark:bg-orange-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(project.cost_overrun_pct || 0, 100)}%` }} />
                </div>
                <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-1.5 font-semibold">
                  {(project.cost_overrun_pct || 0).toFixed(1)}% above sanctioned amount
                </p>
              </div>
            </section>
          )}

          {/* AI Flag Reasons */}
          {project.flag_reasons?.length > 0 && (
            <section>
              <h3 className="section-header flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" />
                Audit Trigger Explanations ({project.flag_reasons.length})
              </h3>
              <ul className="space-y-2">
                {project.flag_reasons.map((reason, i) => (
                  <li key={i} className="text-xs text-slate-700 dark:text-slate-200 bg-amber-50/60 dark:bg-surface-700/80 rounded-xl p-3 border border-amber-200/70 dark:border-surface-600 flex items-start gap-2.5 leading-relaxed">
                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Detection Layers */}
          {flags.length > 0 && (
            <section>
              <h3 className="section-header">Detection Layers Triggered</h3>
              <div className="grid grid-cols-1 gap-2">
                {flags.map(([key, { icon: Icon, label }]) => (
                  <div key={key} className="flex items-center gap-2.5 bg-red-50/70 dark:bg-danger-600/10 border border-red-200/80 dark:border-danger-600/25 rounded-xl px-3.5 py-2.5">
                    <Icon size={15} className="text-red-600 dark:text-danger-400 flex-shrink-0" />
                    <span className="text-xs text-red-900 dark:text-danger-300 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Project Details Grid */}
          <section className="space-y-3">
            <h3 className="section-header">Project Record Metadata</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Building2,  label: "Hon'ble MP",        val: project.mp_name },
                { icon: MapPin,     label: 'Constituency',      val: project.constituency },
                { icon: MapPin,     label: 'District & State',  val: `${project.district}, ${project.state}` },
                { icon: ShieldCheck,label: 'Contractor',        val: project.contractor },
                { icon: Banknote,   label: 'Sanctioned Limit',  val: INR(project.sanctioned_amt) },
                { icon: Banknote,   label: 'Utilised Amount',   val: INR(project.utilised_amt) },
                { icon: Tag,        label: 'Unit Cost',         val: INR(project.unit_cost) },
                { icon: Clock,      label: 'Execution Status',  val: project.status },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-700/40 border border-slate-200/70 dark:border-surface-600/80">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                    <Icon size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={val}>{val || '—'}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Fraud Tag */}
          {project.fraud_type && project.fraud_type !== 'none' && (
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/40 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-brand-700 dark:text-brand-300">Categorized Anomaly Pattern</p>
                <p className="text-xs font-bold text-brand-900 dark:text-brand-200 capitalize mt-0.5">{project.fraud_type} scheme deviation</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-white dark:bg-surface-700 border border-brand-200 dark:border-surface-600 text-brand-600 dark:text-brand-300">
                FLAGGED
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-surface-800/95 backdrop-blur-md border-t border-slate-200 dark:border-surface-600 p-4 space-y-2">
          {statusAction && (
            <div className="text-xs text-center py-1 font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              {statusAction}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={copyDossier} className="btn-secondary justify-center" title="Copy project audit dossier">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Dossier'}</span>
            </button>
            <button
              onClick={() => {
                setStatusAction('Case escalated to CAG Vigilance Inspector')
                setTimeout(() => setStatusAction(null), 3000)
              }}
              className="btn-primary justify-center bg-danger-600 hover:bg-danger-500"
            >
              <ShieldAlert size={14} />
              <span>Escalate for Audit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
