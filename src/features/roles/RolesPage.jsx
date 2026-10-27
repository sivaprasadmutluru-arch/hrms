import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchUserRoles, fetchUsers, registerUser, assignRole, assignRoleToCompanies, revokeRole,
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

  const canManageCrossAccess = isPlatformAdmin() || isEnterpriseAdmin()
  const TABS = [
    'User Roles',
    'Create User',
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
  const { register: regUser, handleSubmit: handleUserSubmit, reset: resetUser, formState: { errors: userErrors } } = useForm()
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
        accessScope: formData.accessScope,
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

  const onCreateUser = async (formData) => {
    try {
      await dispatch(registerUser(formData)).unwrap()
      toast.success(`User "${formData.username}" created successfully`)
      resetUser()
      dispatch(fetchUsers())
    } catch (e) { toast.error(e || 'Failed to create user') }
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

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase()
    return !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const roleColumns = [
    { accessorKey: 'username', header: 'Username' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'roleName', header: 'Role', cell: ({ getValue }) => <Badge label={getValue()?.replace(/_/g, ' ')} variant="primary" /> },
    { accessorKey: 'companyName', header: 'Company' },
    { accessorKey: 'accessScope', header: 'Scope', cell: ({ getValue }) => <Badge label={getValue()} variant="secondary" /> },
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
          <div className="roles-actions">
            <Button onClick={() => { resetAssign({ accessScope: 'ENTERPRISE', accessLevel: 'FULL' }); setSelectedCompanyIds([]); setAssignModal(true) }}>+ Assign Role</Button>
          </div>
          <div className="roles-table"><DataTable columns={roleColumns} data={userRoles} loading={loading} /></div>
        </>
      )}

      {/* Create User Tab */}
      {tab === 'Create User' && (
        <div className="roles-user-panel max-w-md bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create New User</h2>
          <form onSubmit={handleUserSubmit(onCreateUser)} className="space-y-4">
            <Input label="Username" {...regUser('username', { required: 'Required' })} error={userErrors.username?.message} />
            <Input label="Email" type="email" {...regUser('email', { required: 'Required' })} error={userErrors.email?.message} />
            <Input label="Password" type="password" {...regUser('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} error={userErrors.password?.message} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" {...regUser('firstName')} />
              <Input label="Last Name" {...regUser('lastName')} />
            </div>
            {!isPlatformAdmin() && (
              <Select
                label="Company"
                options={companyOptions}
                {...regUser('companyId', { required: 'Required' })}
                error={userErrors.companyId?.message}
              />
            )}
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={loading}>Create User</Button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Tab */}
      {tab === 'Reset Password' && (
        <div className="max-w-2xl">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
            You are setting a new password directly on behalf of the user. Make sure to inform them of the change.
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search by username or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            {userSearch && (
              <button onClick={() => setUserSearch('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Count */}
          <p className="text-xs text-gray-400 mb-2">
            {filteredUsers.length} of {users.length} users
          </p>

          {/* User list */}
          <div className="roles-user-list divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-sm text-center text-gray-400">No users match your search.</div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">{u.username}</span>
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
          <div className="roles-actions">
            <Button onClick={() => { resetAccess({}); setAccessModal(true) }}>+ Grant Access</Button>
          </div>
          <div className="roles-table"><DataTable columns={accessColumns} data={crossAccess} loading={loading} /></div>
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
            <Select label="Company" options={companyOptions} {...regAssign('companyId', { required: 'Company is required' })} error={assignErrors.companyId?.message} />
          )}

          <Select label="Access Scope" options={ACCESS_SCOPES} {...regAssign('accessScope', { required: 'Access scope is required' })} error={assignErrors.accessScope?.message} />
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
              {resetTarget?.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{resetTarget?.username}</p>
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
