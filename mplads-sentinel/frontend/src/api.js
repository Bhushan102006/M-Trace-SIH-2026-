import axios from 'axios'

// In production (Vercel), uses VITE_API_BASE_URL. Falls back to '' for same-domain proxy or localhost:8000 for local dev.
const rawBase = import.meta.env.VITE_API_BASE_URL
const BASE = rawBase ? rawBase.replace(/\/$/, '') : (import.meta.env.PROD ? '' : 'http://localhost:8000')

const api = axios.create({ baseURL: BASE, timeout: 30000 })

// Global active role state for automatic query parameter injection
let currentRole = 'mospi'
let currentRoleValue = ''

export const setApiRole = (role, roleValue = '') => {
  currentRole = role
  currentRoleValue = roleValue
}

export const getApiRole = () => ({ role: currentRole, roleValue: currentRoleValue })

// Automatically attach role and jurisdiction context to all outgoing requests
api.interceptors.request.use((config) => {
  config.params = config.params || {}
  if (currentRole && currentRole !== 'mospi') {
    if (!config.params.role) config.params.role = currentRole
    if (!config.params.role_value && currentRoleValue) {
      config.params.role_value = currentRoleValue
    }
  }
  return config
})

// --- Core endpoints ---
export const fetchStats        = (params = {}) => api.get('/api/stats', { params }).then(r => r.data)
export const fetchProjects     = (params = {}) => api.get('/api/projects', { params }).then(r => r.data)
export const fetchAnomalies    = (params = {}) => api.get('/api/anomalies', { params }).then(r => r.data)
export const fetchGeo          = (params = {}) => api.get('/api/geo', { params }).then(r => r.data)
export const fetchStateSummary = (params = {}) => api.get('/api/state-summary', { params }).then(r => r.data)
export const refreshData       = ()            => api.post('/api/refresh').then(r => r.data)

// --- Anomaly Types ---
export const fetchAnomalyTypes = ()            => api.get('/api/anomaly-types').then(r => r.data)
export const fetchFraudTypes   = ()            => fetchAnomalyTypes() // backward compat

// --- Analytics endpoints ---
export const fetchFundFlow       = (params = {}) => api.get('/api/fund-flow', { params }).then(r => r.data)
export const fetchMPSummary      = (params = {}) => api.get('/api/mp-summary', { params }).then(r => r.data)
export const fetchTimeline       = (params = {}) => api.get('/api/timeline', { params }).then(r => r.data)
export const fetchDelayAnalytics = (params = {}) => api.get('/api/delay-analytics', { params }).then(r => r.data)
export const fetchCostOverrun    = (params = {}) => api.get('/api/cost-overrun', { params }).then(r => r.data)
export const fetchWorkProgress   = (params = {}) => api.get('/api/work-progress', { params }).then(r => r.data)

// --- M-TRACE: Project Health Card ---
export const fetchHealthCard     = (projectId) => api.get(`/api/projects/${projectId}/health-card`).then(r => r.data)

// --- M-TRACE: Verification Case Management ---
export const fetchCases          = (params = {}) => api.get('/api/cases', { params }).then(r => r.data)
export const createCase          = (data)        => api.post('/api/cases', data).then(r => r.data)
export const reviewCase          = (caseId, data)=> api.post(`/api/cases/${caseId}/review`, data).then(r => r.data)

// --- M-TRACE: Audit Trail ---
export const fetchAuditTrail     = (params = {}) => api.get('/api/audit-trail', { params }).then(r => r.data)

// --- M-TRACE: Benchmarks ---
export const fetchBenchmarks     = ()            => api.get('/api/benchmarks').then(r => r.data)

// --- M-TRACE: Digital Evidence & Live Geotagging ---
export const fetchProjectEvidence  = (projectId) => api.get(`/api/projects/${projectId}/evidence`).then(r => r.data)
export const submitProjectEvidence = (projectId, payload) => api.post(`/api/projects/${projectId}/evidence`, payload).then(r => r.data)

// --- M-TRACE: Roles ---
export const fetchRoles          = ()            => api.get('/api/roles').then(r => r.data)

// --- Currency formatter ---
export const INR = (val) =>
  val == null ? '—'
  : val >= 1e7 ? `₹${(val / 1e7).toFixed(2)}Cr`
  : val >= 1e5 ? `₹${(val / 1e5).toFixed(2)}L`
  : `₹${val.toLocaleString('en-IN')}`
