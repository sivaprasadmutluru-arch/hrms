import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import ConfirmModal from '../../components/common/ConfirmModal'
import Spinner from '../../components/common/Spinner'
import { API_BASE_URL } from '../../config/constants'
import useAuth from '../../hooks/useAuth'
import AboutTab from './profile-tabs/AboutTab'
import WorkInfoTab from './profile-tabs/WorkInfoTab'
import PayrollTab from './profile-tabs/PayrollTab'
import BankDetailsTab from './profile-tabs/BankDetailsTab'
import DocumentsTab from './profile-tabs/DocumentsTab'
import BonusPointsTab from './profile-tabs/BonusPointsTab'

const ROLE_VARIANTS = {
  PLATFORM_SUPER_ADMIN: 'danger',
  ENTERPRISE_ADMIN:     'warning',
  BRANCH_ADMIN:         'secondary',
  HR_MANAGER:           'info',
  ACCOUNTANT:           'info',
  DEPARTMENT_MANAGER:   'secondary',
  TEAM_LEAD:            'secondary',
  EMPLOYEE:             'success',
}

const EMPLOYEE_TABS = [
  { key: 'account', label: 'Account' },
  { key: 'about', label: 'About' },
  { key: 'work-info', label: 'Work Info' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'bank', label: 'Bank Details' },
  { key: 'documents', label: 'Documents' },
  { key: 'bonus', label: 'Bonus Points' },
]

export default function AdminProfilePage() {
  const { logout } = useAuth()
  const [user, setUser]       = useState(null)
  const [company, setCompany] = useState(null)
  const [employeeProfile, setEmployeeProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('account')
  const [loading, setLoading] = useState(true)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setUser(res.data)
        const requests = []
        if (res.data.companyId) {
          requests.push(api.get(`/companies/${res.data.companyId}`)
            .then(c => setCompany(c.data))
            .catch(() => null))
        }
        if (res.data.employeeId) {
          requests.push(api.get('/ess/me')
            .then(profile => setEmployeeProfile(profile.data))
            .catch(() => null))
        }
        return Promise.all(requests)
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!user)   return <p className="text-gray-500 p-6">Could not load your profile.</p>

  const displayName = employeeProfile?.fullName
    || `${employeeProfile?.firstName || ''} ${employeeProfile?.lastName || ''}`.trim()
    || user.username || user.email || 'Admin'

  // Compute profile photo URL from user.photoPath
  const photoPath = employeeProfile?.photoPath || user?.photoPath
  const photoUrl = photoPath
    ? (photoPath.startsWith('http')
        ? photoPath
        : `${API_BASE_URL.replace('/api', '')}/media/${photoPath.replace(/^\//, '')}`)
    : null

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Your account information"
        actions={
          <Button variant="secondary" onClick={() => setLogoutConfirmOpen(true)}>
            <LogOut className="h-4 w-4 mr-1.5" strokeWidth={2} />
            Logout
          </Button>
        }
      />

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex items-center gap-5">
        <Avatar name={displayName} src={photoUrl} size="lg" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">{employeeProfile?.jobPositionName || user.email}</p>
          {employeeProfile?.jobPositionName && <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {(user.roles || []).map(role => (
              <Badge
                key={role}
                label={role.replace(/_/g, ' ')}
                variant={ROLE_VARIANTS[role] || 'secondary'}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {employeeProfile && (
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {EMPLOYEE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-6">
        {(!employeeProfile || activeTab === 'account') && <>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Username</dt>
            <dd className="text-sm text-gray-900">{user.username || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</dt>
            <dd className="text-sm text-gray-900">{user.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Company / Branch</dt>
            <dd className="text-sm text-gray-900">{company?.name || (user.companyId ? `ID ${user.companyId}` : '—')}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Roles</dt>
            <dd className="text-sm text-gray-900">
              {(user.roles || []).map(r => r.replace(/_/g, ' ')).join(', ') || '—'}
            </dd>
          </div>
          </dl>
        </>}
        {employeeProfile && activeTab === 'about' && <AboutTab profile={employeeProfile} />}
        {employeeProfile && activeTab === 'work-info' && <WorkInfoTab employeeId={employeeProfile.id} isSelf={true} />}
        {employeeProfile && activeTab === 'payroll' && <PayrollTab employeeId={employeeProfile.id} companyId={employeeProfile.companyId} />}
        {employeeProfile && activeTab === 'bank' && <BankDetailsTab employeeId={employeeProfile.id} />}
        {employeeProfile && activeTab === 'documents' && <DocumentsTab employeeId={employeeProfile.id} companyId={employeeProfile.companyId} />}
        {employeeProfile && activeTab === 'bonus' && <BonusPointsTab employeeId={employeeProfile.id} />}
        </div>
      </div>

      <ConfirmModal
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={logout}
        title="Log out?"
        message="Do you want to log out?"
        confirmLabel="Log out"
      />
    </div>
  )
}
