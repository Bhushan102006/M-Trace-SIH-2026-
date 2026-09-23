import { TrendingUp, TrendingDown } from 'lucide-react'

export default function KpiCard({ title, value, sub, icon: Icon, color = 'brand', trend }) {
  const styles = {
    brand: {
      lightBg: 'bg-white hover:border-brand-300',
      darkBg: 'dark:bg-surface-800 dark:hover:border-brand-500/40',
      iconBox: 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400',
      accent: 'border-l-4 border-l-brand-500',
      pill: 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
    },
    danger: {
      lightBg: 'bg-white hover:border-danger-300',
      darkBg: 'dark:bg-surface-800 dark:hover:border-danger-500/40',
      iconBox: 'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400',
      accent: 'border-l-4 border-l-danger-500',
      pill: 'bg-danger-50 text-danger-700 dark:bg-danger-500/20 dark:text-danger-400',
    },
    warn: {
      lightBg: 'bg-white hover:border-warn-300',
      darkBg: 'dark:bg-surface-800 dark:hover:border-warn-500/40',
      iconBox: 'bg-warn-50 text-warn-600 dark:bg-warn-500/20 dark:text-warn-400',
      accent: 'border-l-4 border-l-warn-500',
      pill: 'bg-warn-50 text-warn-700 dark:bg-warn-500/20 dark:text-warn-400',
    },
    success: {
      lightBg: 'bg-white hover:border-success-300',
      darkBg: 'dark:bg-surface-800 dark:hover:border-success-500/40',
      iconBox: 'bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400',
      accent: 'border-l-4 border-l-success-500',
      pill: 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-400',
    },
  }

  const s = styles[color] || styles.brand

  return (
    <div
      className={`card ${s.lightBg} ${s.darkBg} ${s.accent} group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-up`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${s.iconBox}`}>
          <Icon size={20} />
        </div>
        {trend != null && (
          <span
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend >= 0
                ? 'bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400'
                : 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
            }`}
          >
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          {value ?? '—'}
        </p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        {sub && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
