import { userDisplayName } from '../../utils/userDisplayName'
import { BellIcon } from '@heroicons/react/24/outline'
import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import Avatar from '../common/Avatar'
import useAuth from '../../hooks/useAuth'
import CompanySwitcher from './CompanySwitcher'
import BranchSwitcher from './BranchSwitcher'
import GlobalSearch from './GlobalSearch'
import { API_BASE_URL } from '../../config/constants'
import { Menu, Headset } from 'lucide-react'

function useBreadcrumb() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  return parts.map((p, i) => ({ label: p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), path: '/' + parts.slice(0, i + 1).join('/') }))
}

export default function Topbar({ onMenuClick }) {
  const auth = useAuth()
  const { user } = auth
  const navigate = useNavigate()
  const location = useLocation()
  const unreadCount = useSelector(s => s.notifications?.unreadCount || 0)
  const breadcrumbs = useBreadcrumb()
  const canContactPlatform = auth.isPlatformAdmin() || (
    auth.getScope() === 'ENTERPRISE' && auth.hasRole('ENTERPRISE_ADMIN', 'CEO', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  )
  const supportPath = canContactPlatform ? '/platform/support' : '/helpdesk'
  const supportLabel = canContactPlatform ? 'AccrueHRMS support' : 'HR helpdesk'
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
    <header className="app-topbar h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="app-topbar-leading">
      <button className="mobile-menu-button" type="button" onClick={onMenuClick} aria-label="Open navigation menu"><Menu size={21} /></button>
      <nav aria-label="Breadcrumb" className={`app-breadcrumb flex items-center gap-1 text-sm text-gray-500 ${location.pathname === '/admin/profile' ? 'invisible' : ''}`}>
        {breadcrumbs.map((b, i) => (
          <span key={b.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300">/</span>}
            <button onClick={() => navigate(b.path)} className={`hover:text-gray-700 transition-colors ${i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}`}>
              {b.label}
            </button>
          </span>
        ))}
      </nav>
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        {auth.isCompanyScopeAdmin?.() && (
          <CompanySwitcher allowAll={auth.isPlatformAdmin?.()} />
        )}
        {!auth.isCompanyScopeAdmin?.() && auth.isEnterpriseAdmin?.() && <BranchSwitcher />}
        <button type="button" onClick={() => navigate(supportPath)}
          aria-label={supportLabel} title={`${supportLabel} — raise or track a request`}
          aria-current={location.pathname === supportPath ? 'page' : undefined}
          className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2 text-blue-700 hover:bg-blue-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <Headset size={19} aria-hidden="true" /><span className="hidden lg:inline text-xs font-semibold">Support</span>
        </button>
        <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <BellIcon className="h-5 w-5 text-gray-500" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">{unreadCount}</span>}
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(profilePath)} title="My Profile">
          <Avatar name={userDisplayName(user)} src={avatarSrc} size="sm" />
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{userDisplayName(user)}</span>
        </div>
      </div>
    </header>
  )
}
