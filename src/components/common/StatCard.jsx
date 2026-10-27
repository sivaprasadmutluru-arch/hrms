import Card from './Card'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-[#EDF5FD] text-[#3479BC] ring-[#DCEBFA]',
    emerald: 'bg-[#ECF8F3] text-[#318367] ring-[#D8EFE5]',
    amber: 'bg-[#FFF8DF] text-[#98751D] ring-[#F4E7B8]',
    red: 'bg-[#FFF1F1] text-[#C64D59] ring-[#F8DDE0]',
    violet: 'bg-[#F2F0FF] text-[#6858B7] ring-[#E4E0FA]',
  }

  return (
    <Card padding={false} className="min-h-[112px] p-5 transition duration-200 hover:border-[#C9D9E8] hover:shadow-[0_10px_28px_rgba(30,65,96,0.085)] sm:p-5">
      <div className="flex h-full items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.04em] text-[#17324F]">{value}</p>
          {trendLabel && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
              {trendLabel}
            </div>
          )}
        </div>
        {Icon && <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${colors[color] || colors.indigo}`}><Icon className="h-[22px] w-[22px]" /></div>}
      </div>
    </Card>
  )
}
