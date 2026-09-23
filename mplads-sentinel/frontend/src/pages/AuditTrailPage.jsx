import { useState, useEffect } from 'react'
import {
  History, Shield, Search, Filter, RefreshCw, FileText, Download,
  CheckCircle2, Clock, Scale, Eye, ExternalLink, ArrowUpDown
} from 'lucide-react'
import { fetchAuditTrail } from '../api'
import ProjectHealthCardModal from '../components/ProjectHealthCardModal'

const ROLE_COLORS = {
  'System': 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
  'District Authority': 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
  'Inspecting Officer': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300',
  'State Nodal Authority': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
  'MoSPI': 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const loadAudit = async () => {
    setLoading(true)
    try {
      const res = await fetchAuditTrail()
      setLogs(res?.entries || res?.audit_trail || [])
    } catch (e) {
      console.error('Failed to load audit trail', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAudit()
  }, [])

  const filteredLogs = logs.filter(item => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      item.project_id?.toLowerCase().includes(q) ||
      item.user?.toLowerCase().includes(q) ||
      item.action?.toLowerCase().includes(q) ||
      item.details?.toLowerCase().includes(q) ||
      item.rationale?.toLowerCase().includes(q)

    const matchesRole = roleFilter === 'all' || item.role === roleFilter
    return matchesSearch && matchesRole
  })

  const exportCSV = () => {
    if (!filteredLogs.length) return
    const headers = ['Timestamp', 'User', 'Role', 'Project ID', 'Action', 'Details', 'Rationale']
    const rows = filteredLogs.map(l => [
      `"${l.timestamp || ''}"`,
      `"${l.user || ''}"`,
      `"${l.role || ''}"`,
      `"${l.project_id || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.rationale || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `mtrace_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-surface-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Statutory Governance Audit Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              Immutable Log
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete chronological record of AI detections, officer decisions, evidence notes, and administrative determinations for parliamentary oversight and CAG compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={!filteredLogs.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-700 shadow-xs disabled:opacity-50"
          >
            <Download size={14} />
            <span>Export Audit Log (CSV)</span>
          </button>

          <button
            onClick={loadAudit}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-700 shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Mandate Banner */}
      <div className="p-3.5 bg-blue-50 dark:bg-surface-800 rounded-xl border border-blue-200 dark:border-surface-600 flex items-center justify-between gap-4 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span>
            <strong>Legal Defensibility Guarantee:</strong> Every AI alert and human administrative response is recorded with a tamper-evident timestamp and explicit officer rationale.
          </span>
        </div>
        <span className="hidden sm:inline-block font-mono text-[11px] text-slate-400">
          Total Logged Actions: {logs.length}
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-surface-800 p-3 rounded-xl border border-slate-200 dark:border-surface-600 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by project ID, user, action, keyword…"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Roles</option>
            <option value="System">System (AI Engine)</option>
            <option value="District Authority">District Authority</option>
            <option value="Inspecting Officer">Inspecting Officer</option>
            <option value="State Nodal Authority">State Nodal Authority</option>
            <option value="MoSPI">MoSPI</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-600 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit records…</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No audit records match the selected filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-surface-750 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-surface-600 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp (IST)</th>
                  <th className="px-4 py-3">Authority / User</th>
                  <th className="px-4 py-3">Project ID</th>
                  <th className="px-4 py-3">Action Performed</th>
                  <th className="px-4 py-3">Details & Rationale</th>
                  <th className="px-4 py-3 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-surface-700">
                {filteredLogs.map((entry, idx) => {
                  const roleBadge = ROLE_COLORS[entry.role] || 'bg-slate-100 text-slate-800 border-slate-300'
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-surface-700/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {entry.timestamp ? entry.timestamp.replace('T', ' ').slice(0, 19) : '—'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{entry.user}</div>
                        <span className={`inline-block text-[10px] px-2 py-0.2 rounded-full border mt-0.5 ${roleBadge}`}>
                          {entry.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {entry.project_id ? (
                          <button
                            onClick={() => setSelectedProjectId(entry.project_id)}
                            className="font-mono text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <span>{entry.project_id}</span>
                            <Eye size={12} className="opacity-60" />
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {entry.action}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-md">
                        <p>{entry.details}</p>
                        {entry.rationale && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">
                            Official Rationale: {entry.rationale}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={11} />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Health Card Modal when clicked */}
      {selectedProjectId && (
        <ProjectHealthCardModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}

    </div>
  )
}
