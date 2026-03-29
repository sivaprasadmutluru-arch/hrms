import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'

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

export default function AdminProfilePage() {
  const [user, setUser]       = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setUser(res.data)
        if (res.data.companyId) {
          return api.get(`/companies/${res.data.companyId}`)
            .then(c => setCompany(c.data))
            .catch(() => null)
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!user)   return <p className="text-gray-500 p-6">Could not load your profile.</p>

  const displayName = user.username || user.email || 'Admin'

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Your account information"
      />

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex items-center gap-5">
        <Avatar name={displayName} size="lg" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
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

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
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

        {user.employeeId && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">This account is linked to an employee record.</p>
            <Link
              to="/employees/me"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              View Employee Profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
