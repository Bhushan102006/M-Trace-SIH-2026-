import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchGeo, INR } from '../api'
import { useTheme } from '../context/ThemeContext'
import { useRole } from '../context/RoleContext'
import ProjectHealthCardModal from '../components/ProjectHealthCardModal'
import {
  MapPin, Shield, AlertCircle, RefreshCw, Layers, Scale, Eye,
  Compass, ZoomIn, ZoomOut, CheckCircle2, Navigation
} from 'lucide-react'

const TIER_COLORS = {
  'High Priority Review': '#ef4444',
  'Review Required':      '#f59e0b',
  'Watch':                '#3b82f6',
  'Normal':               '#10b981',
  'High':                 '#ef4444',
  'Medium':               '#f59e0b',
  'Low':                  '#10b981',
}

// MapController: handles automatic role-based zooming, bounds fitting, and size invalidation
function MapController({ features, activeRole, roleValue, focusTrigger }) {
  const map = useMap()

  // Ensure leaflet size is always valid
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    const t3 = setTimeout(() => map.invalidateSize(), 600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [map])

  // Zoom to role's relevant bounds or center
  useEffect(() => {
    if (!map) return

    // If no features or role is MoSPI national
    if (activeRole === 'mospi' || !features || features.length === 0) {
      map.flyTo([22.5, 82.0], 5, { duration: 1.0 })
      return
    }

    const coords = features
      .map(f => f?.geometry?.coordinates)
      .filter(c => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))

    if (coords.length === 0) {
      map.flyTo([22.5, 82.0], 5, { duration: 1.0 })
      return
    }

    if (coords.length === 1) {
      map.flyTo([coords[0][1], coords[0][0]], 12, { duration: 1.2 })
      return
    }

    // Calculate bounds from coordinates: [lat, lon]
    const lats = coords.map(c => c[1])
    const lons = coords.map(c => c[0])
    const southWest = [Math.min(...lats), Math.min(...lons)]
    const northEast = [Math.max(...lats), Math.max(...lons)]

    // Determine appropriate maxZoom based on governance level
    let maxZoom = 12
    if (activeRole === 'state') maxZoom = 7
    if (activeRole === 'district' || activeRole === 'mp') maxZoom = 12

    try {
      map.fitBounds([southWest, northEast], {
        padding: [60, 60],
        maxZoom,
        duration: 1.2,
      })
    } catch (e) {
      console.warn('Map fitBounds failed', e)
    }
  }, [features, activeRole, roleValue, focusTrigger, map])

  return null
}

export default function GeoMap() {
  const [features, setFeatures] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [filter,   setFilter]   = useState('All')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [focusTrigger, setFocusTrigger] = useState(0)
  const [mapStyle, setMapStyle] = useState('auto') // 'auto' | 'dark' | 'street'

  const { isDark } = useTheme()
  const { activeRole, roleValue, roleConfig } = useRole()

  const loadData = () => {
    setLoading(true)
    setError(null)
    fetchGeo({ role: activeRole, role_value: roleValue })
      .then(d => {
        setFeatures(d?.features || [])
      })
      .catch(err => {
        console.error('GeoMap fetch error:', err)
        setError(err?.message || 'Failed to load map data from backend API.')
      })
      .finally(() => setLoading(false))
  }

  // Re-fetch whenever role or jurisdiction context changes
  useEffect(() => {
    loadData()
  }, [activeRole, roleValue])

  const validFeatures = useMemo(() => {
    return features.filter(f => {
      const coords = f?.geometry?.coordinates
      return (
        Array.isArray(coords) &&
        coords.length >= 2 &&
        typeof coords[0] === 'number' &&
        typeof coords[1] === 'number' &&
        !isNaN(coords[0]) &&
        !isNaN(coords[1])
      )
    })
  }, [features])

  const shown = useMemo(() => {
    if (filter === 'All') return validFeatures
    return validFeatures.filter(f => {
      const tier = f.properties?.risk_tier || (f.properties?.risk_level === 'High' ? 'High Priority Review' : f.properties?.risk_level === 'Medium' ? 'Review Required' : 'Normal')
      return tier === filter || f.properties?.risk_level === filter
    })
  }, [validFeatures, filter])

  // Determine active tile URL
  const effectiveDark = mapStyle === 'dark' || (mapStyle === 'auto' && isDark)
  const tileUrl = effectiveDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const tileAttr = effectiveDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      {/* Map Toolbar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-surface-600 bg-white dark:bg-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors duration-200 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-lg leading-none truncate">
                Geospatial Risk & Geofence
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold shrink-0">
                {roleConfig.shortLabel}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {roleConfig.jurisdictionLabel} · {shown.length} Geo-tagged works
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
          {/* Quick Focus Button for current role */}
          <button
            onClick={() => setFocusTrigger(k => k + 1)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
            title={`Auto-zoom to ${roleConfig.jurisdictionLabel}`}
          >
            <Compass size={13} className="animate-spin-slow" />
            <span className="text-[11px] sm:text-xs">Focus {activeRole === 'mospi' ? 'National' : roleConfig.shortLabel}</span>
          </button>

          {/* Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-surface-700 p-0.5 rounded-xl border border-slate-200 dark:border-surface-600 text-xs shrink-0 overflow-x-auto no-scrollbar">
            {['All', 'High Priority Review', 'Review Required', 'Normal'].map(r => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`px-2 sm:px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] sm:text-xs ${
                  filter === r
                    ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === 'High Priority Review' ? 'High Priority' : r === 'Review Required' ? 'Review Req' : r}
              </button>
            ))}
          </div>

          {/* Map Style Toggle */}
          <div className="flex bg-slate-100 dark:bg-surface-700 p-0.5 rounded-xl border border-slate-200 dark:border-surface-600 text-xs shrink-0">
            <button
              onClick={() => setMapStyle('auto')}
              className={`px-1.5 sm:px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] sm:text-xs ${
                mapStyle === 'auto'
                  ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              title="Match system theme"
            >
              Auto
            </button>
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-1.5 sm:px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] sm:text-xs ${
                mapStyle === 'dark'
                  ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              title="High-contrast dark mode GIS tiles"
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle('street')}
              className={`px-1.5 sm:px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] sm:text-xs ${
                mapStyle === 'street'
                  ? 'bg-white dark:bg-surface-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              title="OpenStreetMap street tiles"
            >
              Street
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-surface-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors shrink-0 cursor-pointer"
            title="Reload geospatial telemetry"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : ''} />
          </button>
        </div>
      </div>

      {/* Governance Banner */}
      <div className="px-3 sm:px-6 py-2 bg-blue-50 dark:bg-surface-800 border-b border-blue-200 dark:border-surface-600 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scale size={14} className="text-blue-600 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-tight">Click any marker to inspect sanctioned coordinates and open the 4-Layer Health Card.</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 hidden md:inline shrink-0 ml-2">
          {roleConfig.jurisdictionLabel}
        </span>
      </div>

      {/* Map Canvas Area */}
      <div className="flex-1 p-2 sm:p-4 overflow-hidden relative flex flex-col min-h-[320px] sm:min-h-[450px]">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-white dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-600">
            <div className="text-center space-y-2">
              <RefreshCw size={24} className="animate-spin text-brand-600 mx-auto" />
              <p className="text-xs text-slate-400">Loading geospatial telemetry for {roleConfig.shortLabel}…</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full w-full flex items-center justify-center bg-white dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-600 p-6">
            <div className="text-center space-y-3 max-w-sm">
              <AlertCircle size={32} className="text-rose-500 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Map Data Error</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
              <button onClick={loadData} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg mx-auto">
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-surface-600 shadow-xs relative flex-1 min-h-[450px]">
            <MapContainer
              center={[22.5, 82.0]}
              zoom={5}
              style={{ height: '100%', width: '100%', minHeight: '450px' }}
              scrollWheelZoom={true}
            >
              {/* Dynamic Auto-Zoom Controller */}
              <MapController
                features={shown}
                activeRole={activeRole}
                roleValue={roleValue}
                focusTrigger={focusTrigger}
              />

              <TileLayer
                key={`${tileUrl}-${effectiveDark}`}
                url={tileUrl}
                attribution={tileAttr}
                maxZoom={19}
              />

              {shown.map((f, i) => {
                const props = f.properties || {}
                const { risk_tier, risk_level, project_id, mp_name, district, state, contractor, sanctioned_amt, anomaly_type } = props
                const [lon, lat] = f.geometry.coordinates
                const radius = Math.max(7, Math.min(18, Math.sqrt((sanctioned_amt || 100000) / 400000)))
                const tier = risk_tier || (risk_level === 'High' ? 'High Priority Review' : risk_level === 'Medium' ? 'Review Required' : 'Normal')
                const color = TIER_COLORS[tier] || '#6366f1'

                return (
                  <CircleMarker
                    key={project_id || i}
                    center={[lat, lon]}
                    radius={radius}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: effectiveDark ? 0.65 : 0.45,
                      weight: 2,
                      opacity: 0.95,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-2 min-w-[220px] p-1">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-600 pb-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {district}
                          </span>
                          <span
                            className="font-bold px-1.5 py-0.5 rounded text-[10px]"
                            style={{
                              color,
                              backgroundColor: color + '22',
                              border: `1px solid ${color}44`,
                            }}
                          >
                            {tier}
                          </span>
                        </div>
                        <div className="space-y-1 text-slate-600 dark:text-slate-300">
                          <p className="font-mono text-[10px] text-slate-400 font-bold">{project_id}</p>
                          <p><strong className="text-slate-800 dark:text-slate-200">State:</strong> {state}</p>
                          <p><strong className="text-slate-800 dark:text-slate-200">Hon’ble MP:</strong> {mp_name}</p>
                          <p><strong className="text-slate-800 dark:text-slate-200">Contractor:</strong> {contractor}</p>
                          <p>
                            <strong className="text-slate-800 dark:text-slate-200">Sanctioned:</strong>{' '}
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {INR(sanctioned_amt)}
                            </span>
                          </p>
                          {anomaly_type && anomaly_type !== 'none' && (
                            <p>
                              <strong className="text-slate-800 dark:text-slate-200">Signal:</strong>{' '}
                              <span className="capitalize text-amber-600 dark:text-amber-400">{anomaly_type.replace(/_/g, ' ')}</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedProjectId(project_id)}
                          className="w-full mt-2 py-1.5 px-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-center font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Eye size={13} />
                          <span>View Project Health Card</span>
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>
        )}
      </div>

      {/* Project Health Card Modal */}
      {selectedProjectId && (
        <ProjectHealthCardModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </div>
  )
}
