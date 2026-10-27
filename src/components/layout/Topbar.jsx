import { BellIcon } from '@heroicons/react/24/outline'
import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import Avatar from '../common/Avatar'
import useAuth from '../../hooks/useAuth'
import CompanySwitcher from './CompanySwitcher'
import BranchSwitcher from './BranchSwitcher'
import { API_BASE_URL } from '../../config/constants'

function useBreadcrumb() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  return parts.map((p, i) => ({ label: p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), path: '/' + parts.slice(0, i + 1).join('/') }))
}

export default function Topbar() {
  const { user, logout } = useAuth()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const unreadCount = useSelector(s => s.notifications?.unreadCount || 0)
  const breadcrumbs = useBreadcrumb()
  const profilePath = (
    auth.isPlatformAdmin?.() || auth.isEnterpriseAdmin?.() || auth.isBranchAdmin?.()
    || auth.isHRManager?.() || auth.isAccountant?.() || auth.isDeptManager?.() || auth.isTeamLead?.()
  ) ? '/admin/profile' : '/employees/me'

  const avatarSrc = user?.photoPath
    ? (user.photoPath.startsWith('http')
        ? user.photoPath
        : `${API_BASE_URL.replace('/api', '')}/media/${user.photoPath.replace(/^\//, '')}`)
    : null

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-sm text-gray-500 ${location.pathname === '/admin/profile' ? 'invisible' : ''}`}>
        {breadcrumbs.map((b, i) => (
          <span key={b.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300">/</span>}
            <button onClick={() => navigate(b.path)} className={`hover:text-gray-700 transition-colors ${i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}`}>
              {b.label}
            </button>
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {auth.isCompanyScopeAdmin?.() && (
          <CompanySwitcher allowAll={auth.isPlatformAdmin?.()} />
        )}
        {!auth.isCompanyScopeAdmin?.() && auth.isEnterpriseAdmin?.() && <BranchSwitcher />}
        <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <BellIcon className="h-5 w-5 text-gray-500" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">{unreadCount}</span>}
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(profilePath)} title="My Profile">
          <Avatar name={user?.name || user?.username || 'User'} src={avatarSrc} size="sm" />
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name || user?.username}</span>
        </div>
      </div>
    </header>
  )
}
