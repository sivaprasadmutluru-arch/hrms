import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import api from '../../services/api'
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
    <div className="space-y-5 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17324F]">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your account identity and personal information.</p>
        </div>
        <Button variant="secondary" onClick={() => setLogoutConfirmOpen(true)} className="shrink-0 self-start sm:self-auto">
          <LogOut className="mr-1.5 h-4 w-4" strokeWidth={2} />Sign out
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#17324F] via-[#214F78] to-[#3676A9] p-6 text-white shadow-[0_18px_42px_rgba(23,50,79,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[34px] border-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-40 right-1/4 h-72 w-72 rounded-full bg-[#F6E7B7]/[0.07] blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            <div className="shrink-0 rounded-full bg-white p-1.5 shadow-xl ring-4 ring-white/15"><Avatar name={displayName} src={photoUrl} size="lg" /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F6E7B7]">Your account</p>
              <h2 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-blue-100">{employeeProfile?.jobPositionName || user.email}</p>
              {employeeProfile?.jobPositionName && <p className="mt-0.5 truncate text-xs text-blue-200">{user.email}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {(user.roles || []).map(role => <span key={role} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white">{role.replace(/_/g, ' ')}</span>)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:min-w-[330px]">
            <div className="rounded-2xl border border-white/15 bg-white/[0.09] px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">Organization</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{company?.name || (user.companyId ? `Company ID ${user.companyId}` : 'Platform access')}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.09] px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">Username</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{user.username || '—'}</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#F6E7B7] via-[#E7C65B] to-transparent" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
        {employeeProfile && (
          <div className="overflow-x-auto border-b border-[#E7EEF5] bg-[#F7F9FC] p-2.5">
            <div className="flex min-w-max gap-1">
              {EMPLOYEE_TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-[#1F5F9D] text-white shadow-[0_5px_12px_rgba(31,95,157,0.18)]' : 'text-slate-500 hover:bg-white hover:text-[#294766]'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-5 sm:p-7">
        {(!employeeProfile || activeTab === 'account') && <>
          <div className="mb-6 flex flex-col gap-2 border-b border-[#E8EEF4] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9A771E]">Profile overview</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#17324F]">Account details</h2>
            <p className="mt-1 text-sm text-slate-500">Your sign-in identity and organization access.</p></div>
            <span className="inline-flex w-fit items-center rounded-full border border-[#DCE7F2] bg-[#F7FAFD] px-3 py-1.5 text-xs font-semibold text-[#49627C]">Account information</span>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E5ECF3] bg-[#FBFCFE] px-4 py-5">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Username</dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-[#294766]">{user.username || '—'}</dd>
          </div>
          <div className="rounded-2xl border border-[#E5ECF3] bg-[#FBFCFE] px-4 py-5">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Email</dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-[#294766]">{user.email || '—'}</dd>
          </div>
          <div className="rounded-2xl border border-[#E5ECF3] bg-[#FBFCFE] px-4 py-5">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Company / Branch</dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-[#294766]">{company?.name || (user.companyId ? `ID ${user.companyId}` : '—')}</dd>
          </div>
          <div className="rounded-2xl border border-[#E5ECF3] bg-[#FBFCFE] px-4 py-5">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Roles</dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-[#294766]">
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
      </section>

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
