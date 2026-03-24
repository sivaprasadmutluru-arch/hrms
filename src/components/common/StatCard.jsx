import Card from './Card'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trendLabel && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
              {trendLabel}
            </div>
          )}
        </div>
        {Icon && <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color] || colors.indigo}`}><Icon className="h-6 w-6" /></div>}
      </div>
    </Card>
  )
}
