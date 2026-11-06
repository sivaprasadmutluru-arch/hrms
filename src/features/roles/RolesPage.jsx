import api from '../../services/api'
import { userDisplayName } from '../../utils/userDisplayName'
import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Search, X, RefreshCw, Filter } from 'lucide-react'
import {
  fetchUserRoles, fetchUsers, assignRole, assignRoleToCompanies, revokeRole,
  fetchCrossAccess, grantAccess, revokeAccess, selectUsers, selectUserRoles
} from './rolesSlice'
import { adminResetPassword } from '../auth/authSlice'
import { fetchAll as fetchCompanies, fetchMyCompany, fetchBranches, selectAll as selectAllCompanies, selectBranches } from '../companies/companiesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Combobox from '../../components/common/Combobox'
import { ROLES } from '../../config/constants'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

const ACCESS_SCOPES = [
  { value: 'SELF', label: 'Self' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'HEAD_OFFICE', label: 'Head Office' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]

const ASSIGNABLE_ROLES = {
  PLATFORM_SUPER_ADMIN: [
    'SUPER_ADMIN', 'ACCOUNT_MANAGER', 'COMPANY_ADMIN', 'COMPANY_MANAGER',
    ...Object.values(ROLES),
  ],
  ENTERPRISE_ADMIN: [ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.ACCOUNTANT, ROLES.DEPARTMENT_MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE],
  BRANCH_ADMIN: [ROLES.HR_MANAGER, ROLES.ACCOUNTANT, ROLES.DEPARTMENT_MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE],
}

export default function RolesPage() {
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, user } = useAuth()
  const [platformTeamConfig,setPlatformTeamConfig]=useState(null)
  useEffect(()=>{if(isPlatformAdmin())api.get('/user-roles/platform-team').then(({data})=>setPlatformTeamConfig(data)).catch(()=>setPlatformTeamConfig(null))},[])
  const dispatch = useDispatch()
  const userRoles = useSelector(selectUserRoles)
  const users = useSelector(selectUsers)
  const companies = useSelector(selectAllCompanies)
  const allBranches = useSelector(selectBranches)
  const crossAccess = useSelector(s => s.roles.crossAccess)
  const loading = useSelector(s => s.roles.loading)
  const [tab, setTab] = useState('User Roles')
  const [assignModal, setAssignModal] = useState(false)
  const [accessModal, setAccessModal] = useState(false)
  const [resetModal, setResetModal] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [companyFilter, setCompanyFilter] = useState('ALL')
  const [scopeFilter, setScopeFilter] = useState('ALL')
  const [accessSearch, setAccessSearch] = useState('')

  const canManageCrossAccess = isPlatformAdmin() || isEnterpriseAdmin()
  const TABS = [
    'User Roles',
    'Reset Password',
    ...(canManageCrossAccess ? ['Cross-Branch Access'] : []),
  ]

  const assignableRoles = isPlatformAdmin()
    ? ASSIGNABLE_ROLES.PLATFORM_SUPER_ADMIN
    : isEnterpriseAdmin()
      ? ASSIGNABLE_ROLES.ENTERPRISE_ADMIN
      : ASSIGNABLE_ROLES.BRANCH_ADMIN

  const { register: regAssign, handleSubmit: handleAssignSubmit, reset: resetAssign, watch: watchAssign, setValue: setAssignValue, formState: { errors: assignErrors } } = useForm({
    defaultValues: { accessScope: 'ENTERPRISE', accessLevel: 'FULL' },
  })
  const { register: regAccess, handleSubmit: handleAccessSubmit, reset: resetAccess } = useForm()
  const { register: regReset, handleSubmit: handleResetSubmit, reset: resetResetForm, formState: { errors: resetErrors } } = useForm()

  const userId = user?.userId || user?.id
  const userCompanyId = user?.companyId

  useEffect(() => {
    dispatch(fetchUserRoles())
    if (userId) dispatch(fetchCrossAccess(userId))
    dispatch(fetchUsers())
    if (isPlatformAdmin()) {
      dispatch(fetchCompanies({ page: 0, size: 100 }))
    } else if (isEnterpriseAdmin() && userCompanyId) {
      dispatch(fetchMyCompany(userCompanyId)).then(() => {
        dispatch(fetchBranches(userCompanyId))
      })
    } else if (isBranchAdmin() && userCompanyId) {
      dispatch(fetchMyCompany(userCompanyId))
    }
  }, [dispatch, userId, userCompanyId])

  const onAssignRole = async (formData) => {
    try {
      const payload = {
        userId: Number(formData.userId),
        roleName: formData.roleName,
        accessScope: ['PLATFORM_ORGANIZATION_OPERATIONS','PLATFORM_SUPPORT','PLATFORM_BILLING'].includes(formData.roleName) ? 'SELF' : formData.accessScope,
        accessLevel: formData.accessLevel || 'FULL',
        effectiveFrom: formData.effectiveFrom || undefined,
        expiresOn: formData.expiresOn || undefined,
        reason: formData.reason?.trim(),
      }
      const isMultiCompanyRole = formData.roleName === 'SUPER_ADMIN' || formData.roleName === 'ACCOUNT_MANAGER'
      if (isMultiCompanyRole) {
        if (!selectedCompanyIds.length) {
          toast.error('Select at least one company')
          return
        }
        await dispatch(assignRoleToCompanies({ ...payload, companyIds: selectedCompanyIds })).unwrap()
        toast.success(`Role assigned to ${selectedCompanyIds.length} compan${selectedCompanyIds.length === 1 ? 'y' : 'ies'}`)
      } else {
        await dispatch(assignRole({ ...payload, companyId: Number(formData.companyId) })).unwrap()
        toast.success('Role assigned')
      }
      setAssignModal(false)
      setSelectedCompanyIds([])
      dispatch(fetchUserRoles())
    } catch (e) { toast.error(e || 'Error') }
  }

  const onRevokeRole = async (ur) => {
    try {
      await dispatch(revokeRole({ userId: ur.userId, roleId: ur.roleId, companyId: ur.companyId })).unwrap()
      toast.success('Role revoked')
    } catch { toast.error('Failed') }
  }

  const onGrantAccess = async (formData) => {
    try {
      await dispatch(grantAccess(formData)).unwrap()
      toast.success('Access granted')
      setAccessModal(false)
      if (userId) dispatch(fetchCrossAccess(userId))
    } catch (e) { toast.error(e || 'Error') }
  }

  const onRevokeAccess = async (row) => {
    try {
      await dispatch(revokeAccess({ userId: row.userId, targetCompanyId: row.targetCompany?.id })).unwrap()
      toast.success('Access revoked')
    } catch { toast.error('Failed') }
  }

  const openResetModal = (u) => {
    setResetTarget(u)
    resetResetForm()
    setResetModal(true)
  }

  const closeResetModal = () => {
    setResetModal(false)
    setResetTarget(null)
    resetResetForm()
  }

  const onAdminResetPassword = async (formData) => {
    setResetLoading(true)
    try {
      await dispatch(adminResetPassword({ userId: resetTarget.id, newPassword: formData.newPassword })).unwrap()
      toast.success(`Password reset for "${resetTarget.username}"`)
      closeResetModal()
    } catch (e) {
      toast.error(e || 'Failed to reset password')
    } finally {
      setResetLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        dispatch(fetchUserRoles()).unwrap(),
        dispatch(fetchUsers()).unwrap(),
        userId ? dispatch(fetchCrossAccess(userId)).unwrap() : Promise.resolve(),
        isPlatformAdmin() ? api.get('/user-roles/platform-team').then(({ data }) => setPlatformTeamConfig(data)).catch(() => {}) : Promise.resolve(),
      ])
      toast.success('Roles and user directory refreshed')
    } catch {
      toast.error('Could not refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  const usersById = useMemo(() => new Map(users.map(person => [String(person.id), person])), [users])

  const resolvePersonName = (assignment) => {
    const fromMap = usersById.get(String(assignment.userId))
    if (fromMap && (fromMap.firstName || fromMap.lastName)) {
      return userDisplayName(fromMap)
    }
    if (assignment.firstName || assignment.lastName) {
      return userDisplayName(assignment)
    }
    return userDisplayName(fromMap || assignment)
  }

  const roleColumns = [
    {
      id: 'person', header: 'Employee / User',
      accessorFn: assignment => resolvePersonName(assignment),
      cell: ({ row, getValue }) => <div>
        <div className="font-semibold text-gray-900">{getValue()}</div>
        <div className="text-xs text-gray-500 mt-0.5">Username: {row.original.username || row.original.email || '—'}</div>
      </div>,
    },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'roleName', header: 'Role', cell: ({ getValue }) => <Badge label={getValue()?.replace(/_/g, ' ')} variant="primary" /> },
    { accessorKey: 'companyName', header: 'Company' },
    { accessorKey: 'accessScope', header: 'Scope', cell: ({ getValue }) => <Badge label={getValue()?.replace(/_/g, ' ')} variant="secondary" /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <Button size="sm" variant="danger" onClick={() => onRevokeRole(row.original)}>Revoke</Button>
      )
    },
  ]

  const accessColumns = [
    { accessorKey: 'userId', header: 'User ID' },
    { id: 'grantedByCompany', header: 'Source', cell: ({ row }) => row.original.grantedByCompany?.name || '—' },
    { id: 'targetCompany', header: 'Target', cell: ({ row }) => row.original.targetCompany?.name || '—' },
    { accessorKey: 'reason', header: 'Reason', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'createdAt', header: 'Granted', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="danger" onClick={() => onRevokeAccess(row.original)}>Revoke</Button> },
  ]

  const distinctRoles = useMemo(() => {
    const set = new Set(userRoles.map(r => r.roleName).filter(Boolean))
    return Array.from(set).sort()
  }, [userRoles])

  const distinctCompanies = useMemo(() => {
    const map = new Map()
    userRoles.forEach(r => {
      if (r.companyId && r.companyName) map.set(String(r.companyId), r.companyName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [userRoles])

  const distinctScopes = useMemo(() => {
    const set = new Set(userRoles.map(r => r.accessScope).filter(Boolean))
    return Array.from(set).sort()
  }, [userRoles])

  const filteredUserRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase()
    return userRoles.filter(item => {
      if (roleFilter !== 'ALL' && item.roleName !== roleFilter) return false
      if (companyFilter !== 'ALL' && String(item.companyId) !== String(companyFilter)) return false
      if (scopeFilter !== 'ALL' && item.accessScope !== scopeFilter) return false
      if (!q) return true
      const personName = resolvePersonName(item).toLowerCase()
      const username = String(item.username || '').toLowerCase()
      const email = String(item.email || '').toLowerCase()
      const roleName = String(item.roleName || '').toLowerCase().replace(/_/g, ' ')
      const companyName = String(item.companyName || '').toLowerCase()
      const scope = String(item.accessScope || '').toLowerCase().replace(/_/g, ' ')
      return personName.includes(q) || username.includes(q) || email.includes(q) || roleName.includes(q) || companyName.includes(q) || scope.includes(q)
    })
  }, [userRoles, roleSearch, roleFilter, companyFilter, scopeFilter, usersById])

  const filteredCrossAccess = useMemo(() => {
    const q = accessSearch.trim().toLowerCase()
    if (!q) return crossAccess
    return crossAccess.filter(item => {
      const u = usersById.get(String(item.userId))
      const userName = u ? resolvePersonName(u).toLowerCase() : ''
      const source = String(item.grantedByCompany?.name || '').toLowerCase()
      const target = String(item.targetCompany?.name || '').toLowerCase()
      const reason = String(item.reason || '').toLowerCase()
      const userId = String(item.userId || '').toLowerCase()
      return userName.includes(q) || source.includes(q) || target.includes(q) || reason.includes(q) || userId.includes(q)
    })
  }, [crossAccess, accessSearch, usersById])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    return users.filter(u => {
      if (!q) return true
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim().toLowerCase()
      const name = userDisplayName(u).toLowerCase()
      const username = String(u.username || '').toLowerCase()
      const email = String(u.email || '').toLowerCase()
      const id = String(u.id || '')
      return fullName.includes(q) || name.includes(q) || username.includes(q) || email.includes(q) || id.includes(q)
    })
  }, [users, userSearch])

  const clearRolesFilters = () => {
    setRoleSearch('')
    setRoleFilter('ALL')
    setCompanyFilter('ALL')
    setScopeFilter('ALL')
  }

  const userOptions = users.map(u => {
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
    const primaryLabel = fullName || u.username || u.email
    return {
      value: u.id,
      label: primaryLabel,
      sublabel: [u.username, u.email].filter(Boolean).join(' · '),
      searchText: `${fullName} ${u.username || ''} ${u.email || ''}`,
    }
  })

  const branchesForEntAdmin = isEnterpriseAdmin() && user?.companyId
    ? (allBranches[user.companyId] || [])
    : []

  const companyOptions = isEnterpriseAdmin()
    ? [
        ...companies.map(c => ({ value: c.id, label: `${c.name} [Head Office]` })),
        ...branchesForEntAdmin.map(b => ({ value: b.id, label: `${b.name} [Branch]` })),
      ]
    : companies.map(c => ({ value: c.id, label: `${c.name} [${c.companyType || c.type || 'Company'}]` }))

  const roleOptions = assignableRoles.map(r => ({ value: r, label: r.replace(/_/g, ' ') }))
  const selectedRole = watchAssign('roleName')
  const isPlatformTeamRole=['PLATFORM_ORGANIZATION_OPERATIONS','PLATFORM_SUPPORT','PLATFORM_BILLING'].includes(selectedRole)
  const isMultiCompanyRole = selectedRole === 'SUPER_ADMIN' || selectedRole === 'ACCOUNT_MANAGER'
  const assignedPeople = new Set(userRoles.map(role => role.userId ?? role.username).filter(Boolean)).size
  const assignedCompanies = new Set(userRoles.map(role => role.companyId ?? role.companyName).filter(Boolean)).size

  const toggleSelectedCompany = (companyId) => {
    const id = Number(companyId)
    setSelectedCompanyIds(previous => previous.includes(id)
      ? previous.filter(value => value !== id)
      : [...previous, id])
  }

  return (
    <div className="roles-workspace">
      <PageHeader
        title="Roles & Access"
        subtitle={
          isPlatformAdmin() ? 'Platform-wide user roles and cross-organization access' :
          isEnterpriseAdmin() ? 'Manage roles across all branches and cross-branch access' :
          'Manage branch user roles and assignments'
        }
        actions={
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing || loading}>
            <RefreshCw size={14} className={refreshing ? 'mr-1.5 animate-spin' : 'mr-1.5'} />
            Refresh
          </Button>
        }
      />
      <div className="roles-tabs flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* User Roles Tab */}
      {tab === 'User Roles' && (
        <>
          <div className="roles-overview">
            <div><span>Role assignments</span><strong>{userRoles.length}</strong><small>Current access records</small></div>
            <div><span>People with access</span><strong>{assignedPeople}</strong><small>Unique user accounts</small></div>
            <div><span>Organizations</span><strong>{assignedCompanies}</strong><small>Across assigned access</small></div>
          </div>

          {/* Dynamic Search & Filters Toolbar */}
          <div className="roles-toolbar bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by employee name, username, email, role, company, or scope..."
                  value={roleSearch}
                  onChange={e => setRoleSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                />
                {roleSearch && (
                  <button onClick={() => setRoleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => { resetAssign({ accessScope: 'ENTERPRISE', accessLevel: 'FULL' }); setSelectedCompanyIds([]); setAssignModal(true) }}>+ Assign Role</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-500 font-medium flex items-center gap-1 mr-1">
                <Filter size={13} /> Filters:
              </span>
              
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Roles ({userRoles.length})</option>
                {distinctRoles.map(r => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>

              {distinctCompanies.length > 1 && (
                <select
                  value={companyFilter}
                  onChange={e => setCompanyFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Companies / Branches</option>
                  {distinctCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              {distinctScopes.length > 1 && (
                <select
                  value={scopeFilter}
                  onChange={e => setScopeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Scopes</option>
                  {distinctScopes.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              )}

              {(roleSearch || roleFilter !== 'ALL' || companyFilter !== 'ALL' || scopeFilter !== 'ALL') && (
                <button
                  onClick={clearRolesFilters}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs ml-auto flex items-center gap-1"
                >
                  <X size={12} /> Reset filters
                </button>
              )}
            </div>

            <div className="text-xs text-gray-400">
              Showing <strong>{filteredUserRoles.length}</strong> of <strong>{userRoles.length}</strong> role assignments
            </div>
          </div>

          {filteredUserRoles.length === 0 && !loading ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Search size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">No role assignments match your search or filter.</p>
              {(roleSearch || roleFilter !== 'ALL' || companyFilter !== 'ALL' || scopeFilter !== 'ALL') && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={clearRolesFilters}>Clear search & filters</Button>
              )}
            </div>
          ) : (
            <div className="roles-table"><DataTable columns={roleColumns} data={filteredUserRoles} loading={loading} /></div>
          )}
        </>
      )}

      {/* Reset Password Tab */}
      {tab === 'Reset Password' && (
        <div className="max-w-2xl">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
            You are setting a new password directly on behalf of the user. Make sure to inform them of the change.
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
            {userSearch && (
              <button onClick={() => setUserSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Count */}
          <p className="text-xs text-gray-400 mb-2">
            Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
          </p>

          {/* User list */}
          <div className="roles-user-list divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-sm text-center text-gray-400">No users match your search.</div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">{userDisplayName(u)}</span>
                    <span className="text-gray-400 ml-2 text-xs">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-300">ID: {u.id}</span>
                    <Button size="sm" variant="secondary" onClick={() => openResetModal(u)}>
                      Reset Password
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cross-Branch Access Tab */}
      {tab === 'Cross-Branch Access' && (
        <>
          <div className="roles-toolbar bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search cross-branch access by user, source branch, target branch, or reason..."
                value={accessSearch}
                onChange={e => setAccessSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
              />
              {accessSearch && (
                <button onClick={() => setAccessSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                  <X size={15} />
                </button>
              )}
            </div>
            <Button onClick={() => { resetAccess({}); setAccessModal(true) }}>+ Grant Access</Button>
          </div>

          <div className="text-xs text-gray-400">
            Showing <strong>{filteredCrossAccess.length}</strong> of <strong>{crossAccess.length}</strong> records
          </div>

          {filteredCrossAccess.length === 0 && !loading ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Search size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">{crossAccess.length === 0 ? 'No cross-branch access records yet.' : 'No cross-branch records match your search.'}</p>
              {accessSearch && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setAccessSearch('')}>Clear search</Button>
              )}
            </div>
          ) : (
            <div className="roles-table"><DataTable columns={accessColumns} data={filteredCrossAccess} loading={loading} /></div>
          )}
        </>
      )}

      {/* Assign Role Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Role" size="lg" panelClassName="roles-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssignSubmit(onAssignRole)}>Assign</Button>
          </div>
        }>
        <div className="roles-form">
          <Combobox
            label="User"
            options={userOptions}
            value={watchAssign('userId') || ''}
            onChange={(value) => setAssignValue('userId', value, { shouldValidate: true })}
            placeholder="Search employee by name, username, or email..."
            emptyText="No employees found"
            error={assignErrors.userId?.message}
          />
          <Select label="Role" options={roleOptions} {...regAssign('roleName', { required: 'Role is required' })} error={assignErrors.roleName?.message} />

          {isMultiCompanyRole ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Companies <span className="text-red-500">*</span></p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {companyOptions.map(company => (
                  <label key={company.value} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCompanyIds.includes(Number(company.value))}
                      onChange={() => toggleSelectedCompany(company.value)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{company.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Existing assignments are retained; revoked assignments are safely reactivated.</p>
            </div>
          ) : (
            <Select label="Company" options={isPlatformTeamRole ? companyOptions.filter(c=>platformTeamConfig?.companies?.some(internal=>String(internal.id)===String(c.value))) : companyOptions} {...regAssign('companyId', { required: 'Company is required' })} error={assignErrors.companyId?.message} />
          )}

          <Select label="Access Scope" options={isPlatformTeamRole ? [{value:'SELF',label:'Internal employment only — platform duties granted separately'}] : ACCESS_SCOPES} {...regAssign('accessScope', { required: 'Access scope is required' })} error={assignErrors.accessScope?.message} />
          {isPlatformTeamRole && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Only Platform Super Admin can grant this role to an active employee of {platformTeamConfig?.organizations?.[0]?.name || 'the configured internal Accrue organization'}. Customer employee/payroll/internal helpdesk access is not granted. Effective and expiry dates apply.</p>}
          {selectedRole === 'ACCOUNT_MANAGER' && (
            <Select label="Access Level" options={[{ value: 'FULL', label: 'Full access' }, { value: 'PARTIAL', label: 'Partial access — payroll excluded' }]} {...regAssign('accessLevel')} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Effective Date" type="date" {...regAssign('effectiveFrom')} />
            <Input label="Expiry Date (optional)" type="date" {...regAssign('expiresOn')} />
          </div>
          <Input label="Assignment Reason" placeholder="Why is this access being granted?" {...regAssign('reason', { required: 'Assignment reason is required' })} error={assignErrors.reason?.message} />
        </div>
      </Modal>

      {/* Admin Reset Password Modal */}
      <Modal
        open={resetModal}
        onClose={closeResetModal}
        title="Reset User Password"
        panelClassName="roles-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeResetModal}>Cancel</Button>
            <Button loading={resetLoading} onClick={handleResetSubmit(onAdminResetPassword)}>Reset Password</Button>
          </div>
        }>
        <div className="roles-form">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {userDisplayName(resetTarget)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{userDisplayName(resetTarget)}</p>
              <p className="text-xs text-gray-400 truncate">{resetTarget?.email}</p>
            </div>
          </div>
          <Input
            label="New Password"
            type="password"
            {...regReset('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })}
            error={resetErrors.newPassword?.message}
          />
        </div>
      </Modal>

      {/* Grant Cross-Branch Access Modal */}
      <Modal open={accessModal} onClose={() => setAccessModal(false)} title="Grant Cross-Branch Access" panelClassName="roles-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAccessModal(false)}>Cancel</Button>
            <Button onClick={handleAccessSubmit(onGrantAccess)}>Grant</Button>
          </div>
        }>
        <div className="roles-form">
          <Select label="User" options={userOptions} {...regAccess('userId', { required: true })} />
          <Select label="Granted By (Source Company)" options={companyOptions} {...regAccess('grantedByCompanyId', { required: true })} />
          <Select label="Target Branch" options={companyOptions} {...regAccess('targetCompanyId', { required: true })} />
          <Input label="Reason (optional)" {...regAccess('reason')} />
        </div>
      </Modal>
    </div>
  )
}
