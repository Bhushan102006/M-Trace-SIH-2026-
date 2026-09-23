import { useEffect, useState, useCallback } from 'react'
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download,
  Filter, X, RefreshCw, FileSpreadsheet, Eye, Scale, Sparkles, Camera
} from 'lucide-react'
import { fetchProjects, INR } from '../api'
import ProjectHealthCardModal from '../components/ProjectHealthCardModal'
import LiveEvidenceCameraModal from '../components/LiveEvidenceCameraModal'
import { useRole } from '../context/RoleContext'

const RISK_TIERS = ['All', 'High Priority Review', 'Review Required', 'Watch', 'Normal']

function RiskTierBadge({ tier, score }) {
  if (tier === 'High Priority Review') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        High ({score != null ? Math.round(score) : ''})
      </span>
    )
  }
  if (tier === 'Review Required') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Review Req ({score != null ? Math.round(score) : ''})
      </span>
    )
  }
  if (tier === 'Watch') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Watch ({score != null ? Math.round(score) : ''})
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Normal ({score != null ? Math.round(score) : ''})
    </span>
  )
}

function SortIcon({ col, sortBy, sortDesc }) {
  if (sortBy !== col) return <span className="w-3.5 inline-block" />
  return sortDesc
    ? <ChevronDown size={13} className="inline text-brand-600 dark:text-brand-400" />
    : <ChevronUp   size={13} className="inline text-brand-600 dark:text-brand-400" />
}

export default function ProjectsTable() {
  const [data,     setData]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [riskTier, setRiskTier] = useState('All')
  const [sortBy,   setSortBy]   = useState('risk_score')
  const [sortDesc, setSortDesc] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [cameraProject, setCameraProject] = useState(null)
  const [exporting,setExporting]= useState(false)
  const { activeRole } = useRole()

  const load = useCallback(() => {
    setLoading(true)
    fetchProjects({
      page,
      page_size: pageSize,
      risk_tier: riskTier !== 'All' ? riskTier : undefined,
      search:    search || undefined,
      sort_by:   sortBy,
      sort_desc: sortDesc,
    })
      .then(r => {
        setData(r.data || [])
        setTotal(r.total || 0)
        setPages(r.pages || 1)
      })
      .finally(() => setLoading(false))
  }, [page, pageSize, riskTier, search, sortBy, sortDesc])

  useEffect(() => { load() }, [load])

  const handleSort = col => {
    if (sortBy === col) {
      setSortDesc(d => !d)
    } else {
      setSortBy(col)
      setSortDesc(true)
    }
    setPage(1)
  }

  const exportCSV = () => {
    setExporting(true)
    try {
      const headers = ['Project ID', 'MP Name', 'District', 'State', 'Work Type', 'Contractor', 'Sanctioned INR', 'Utilised INR', 'Physical %', 'Financial %', 'Risk Score', 'Risk Tier']
      const rows = data.map(p => [
        `"${p.project_id || ''}"`,
        `"${p.mp_name || ''}"`,
        `"${p.district || ''}"`,
        `"${p.state || ''}"`,
        `"${(p.work_type || '').replace(/"/g, '""')}"`,
        `"${(p.contractor || '').replace(/"/g, '""')}"`,
        p.sanctioned_amt || 0,
        p.utilised_amt || 0,
        p.physical_progress_pct || 0,
        p.financial_progress_pct || 0,
        Math.round(p.risk_score || 0),
        `"${p.risk_tier || ''}"`,
      ])
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `mplads_projects_export_${riskTier.toLowerCase()}_page_${page}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Export failed', e)
    } finally {
      setExporting(false)
    }
  }

  const COLS = [
    { key: 'project_id',       label: 'Project ID',   sortable: false },
    { key: 'mp_name',          label: 'Hon’ble MP',   sortable: true },
    { key: 'district',         label: 'District',     sortable: true },
    { key: 'work_type',        label: 'Work Scheme',  sortable: false },
    { key: 'sanctioned_amt',   label: 'Sanctioned',   sortable: true },
    { key: 'physical_progress_pct', label: 'Physical %', sortable: true },
    { key: 'risk_score',       label: 'Risk Score',   sortable: true },
    { key: 'action',           label: 'Dossier',      sortable: false },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      {/* Toolbar */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors duration-200">
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg leading-tight">
            MPLADS Projects Ledger
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Searchable registry across 543 Lok Sabha Constituencies · {total.toLocaleString('en-IN')} monitored works
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="pl-9 pr-7 py-1.5 w-full sm:w-56 text-xs rounded-xl border border-slate-200 dark:border-surface-600 bg-slate-50 dark:bg-surface-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              placeholder="Search MP, district, contractor…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Risk Tier Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-surface-700 p-0.5 rounded-xl border border-slate-200/80 dark:border-surface-600 overflow-x-auto no-scrollbar max-w-full">
            {RISK_TIERS.map(r => (
              <button
                key={r}
                onClick={() => { setRiskTier(r); setPage(1) }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  riskTier === r
                    ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === 'High Priority Review' ? 'High Priority' : r}
              </button>
            ))}
          </div>

          {/* CSV Export Button */}
          <button
            onClick={exportCSV}
            disabled={exporting || data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-surface-700 shadow-xs disabled:opacity-50 cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Contractor Real-Time Camera Notice */}
      {activeRole === 'contractor' && (
        <div className="px-3 sm:px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Camera size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              <strong>Contractor Anti-Cheat:</strong> Click <em>Geo-Photo</em> to open real-time camera viewfinder with GPS lock. Gallery uploads disabled.
            </span>
          </div>
          <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 shrink-0 ml-2">
            Live Stream Only
          </span>
        </div>
      )}

      {/* Main Content Area: Cards on Mobile, Table on Desktop */}
      <div className="flex-1 overflow-auto px-3 sm:px-6 py-3 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading project records…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile View: High-density Touch Cards (<md) */}
            <div className="space-y-3 md:hidden">
              {data.map(p => (
                <div
                  key={p.project_id}
                  onClick={() => setSelectedProjectId(p.project_id)}
                  className="bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 rounded-2xl p-3.5 shadow-2xs hover:border-brand-500/50 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                        {p.project_id}
                      </span>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5 line-clamp-2 leading-snug">
                        {p.work_type}
                      </h4>
                    </div>
                    <div className="shrink-0">
                      <RiskTierBadge tier={p.risk_tier} score={p.risk_score} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-surface-700">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Location</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{p.district}, {p.state}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Sanctioned</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">{INR(p.sanctioned_amt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Hon’ble MP</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{p.mp_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Physical Progress</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, p.physical_progress_pct || 0)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                          {p.physical_progress_pct || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedProjectId(p.project_id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-700 dark:hover:bg-surface-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Health Card</span>
                    </button>

                    <button
                      onClick={() => setCameraProject(p)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                      title="Real-time camera geotag (no gallery uploads)"
                    >
                      <Camera size={13} />
                      <span>Geo-Photo</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / Tablet View: Full Data Table (md+) */}
            <div className="hidden md:block bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-600 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-surface-700/80 backdrop-blur-md z-10 border-b border-slate-200 dark:border-surface-600">
                  <tr className="text-left text-slate-500 dark:text-slate-400 font-semibold">
                    {COLS.map(({ key, label, sortable }) => (
                      <th
                        key={key}
                        className={`py-3 px-4 whitespace-nowrap ${
                          sortable ? 'cursor-pointer hover:text-slate-900 dark:hover:text-white select-none' : ''
                        }`}
                        onClick={() => sortable && handleSort(key)}
                      >
                        <div className="flex items-center gap-1">
                          <span>{label}</span>
                          {sortable && <SortIcon col={key} sortBy={sortBy} sortDesc={sortDesc} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-surface-600/50">
                  {data.map(p => (
                    <tr
                      key={p.project_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-surface-700/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedProjectId(p.project_id)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                        {p.project_id}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-200 font-medium whitespace-nowrap">
                        {p.mp_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.district}, {p.state}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-300 max-w-[200px] truncate font-medium">
                        {p.work_type}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {INR(p.sanctioned_amt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-2 bg-slate-100 dark:bg-surface-600 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, p.physical_progress_pct || 0)}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                            {p.physical_progress_pct || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <RiskTierBadge tier={p.risk_tier} score={p.risk_score} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedProjectId(p.project_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-semibold text-xs border border-brand-200 dark:border-brand-800 transition-colors cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Health Card</span>
                          </button>

                          <button
                            onClick={() => setCameraProject(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            title="Real-time camera geotag (no gallery uploads)"
                          >
                            <Camera size={12} />
                            <span>Geo-Photo</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination Bar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 sm:gap-3 text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
          <span>
            {data.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total.toLocaleString('en-IN')}
          </span>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="bg-slate-100 dark:bg-surface-700 border border-slate-200 dark:border-surface-600 rounded px-1.5 py-0.5 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: Math.min(5, pages) }, (_, i) => {
            const p = Math.max(1, Math.min(pages - 4, page - 2)) + i
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                  p === page
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-700'
                }`}
              >
                {p}
              </button>
            )
          })}
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-colors"
            title="Next Page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Project Health Card Modal */}
      {selectedProjectId && (
        <ProjectHealthCardModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}

      {/* Live Evidence Camera Modal */}
      {cameraProject && (
        <LiveEvidenceCameraModal
          project={cameraProject}
          onClose={() => setCameraProject(null)}
          onEvidenceSubmitted={() => {
            setCameraProject(null)
            load()
          }}
        />
      )}
    </div>
  )
}
