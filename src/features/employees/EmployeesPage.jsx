import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, remove, selectAll, selectLoading, selectPagination } from './employeesSlice'
import { fetchUserRoles, selectUserRoles } from '../roles/rolesSlice'
import { fetchAll as fetchAll_companies, fetchMyCompany, fetchBranches, selectAll as selectCompanies, selectBranches } from '../companies/companiesSlice'
import { fetchAll as fetchDepartments, selectAll as selectDepartments } from '../departments/departmentsSlice'
import { fetchJobPositions, selectJobPositions, fetchWorkTypes, selectWorkTypes, fetchShiftSchedules, selectShiftSchedules, fetchJobRoles, selectJobRoles } from '../base/baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import ConfirmModal from '../../components/common/ConfirmModal'
import Avatar from '../../components/common/Avatar'
import useAuth from '../../hooks/useAuth'
import { formatDate } from '../../utils/formatters'

const EMPLOYEE_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
]

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
]

const MARITAL_STATUSES = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
]

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const ACCESS_SCOPE_OPTIONS = [
  { value: 'SELF', label: 'Self (own records only)' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'HEAD_OFFICE', label: 'Head Office' },
  { value: 'ENTERPRISE', label: 'Enterprise (all)' },
]

const ROLE_OPTIONS_BY_LEVEL = {
  platform: [
    { value: 'ENTERPRISE_ADMIN', label: 'Enterprise Admin' },
    { value: 'BRANCH_ADMIN', label: 'Branch Admin' },
    { value: 'HR_MANAGER', label: 'HR Manager' },
    { value: 'ACCOUNTANT', label: 'Accountant' },
    { value: 'DEPARTMENT_MANAGER', label: 'Department Manager' },
    { value: 'TEAM_LEAD', label: 'Team Lead' },
    { value: 'EMPLOYEE', label: 'Employee' },
  ],
  enterprise: [
    { value: 'BRANCH_ADMIN', label: 'Branch Admin' },
    { value: 'HR_MANAGER', label: 'HR Manager' },
    { value: 'ACCOUNTANT', label: 'Accountant' },
    { value: 'DEPARTMENT_MANAGER', label: 'Department Manager' },
    { value: 'TEAM_LEAD', label: 'Team Lead' },
    { value: 'EMPLOYEE', label: 'Employee' },
  ],
  branch: [
    { value: 'DEPARTMENT_MANAGER', label: 'Department Manager' },
    { value: 'TEAM_LEAD', label: 'Team Lead' },
    { value: 'EMPLOYEE', label: 'Employee' },
  ],
}

export default function EmployeesPage() {
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, user } = useAuth()
  const employees = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const companies = useSelector(selectCompanies)        // head office(s)
  const allBranches = useSelector(selectBranches)       // { [headOfficeId]: [branch, ...] }
  const departments = useSelector(selectDepartments)
  const jobPositions = useSelector(selectJobPositions)
  const jobRoles = useSelector(selectJobRoles)
  const workTypes = useSelector(selectWorkTypes)
  const shiftSchedules = useSelector(selectShiftSchedules)
  const userRoles = useSelector(selectUserRoles)

  // Build email → role name lookup (take first/highest role per email)
  const roleByEmail = useMemo(() => {
    const map = {}
    userRoles.forEach(ur => { if (ur.email && ur.roleName) map[ur.email] = ur.roleName })
    return map
  }, [userRoles])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  // Platform admin context: which company's employees to view
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const canManage = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin()

  const assignableRoles = isPlatformAdmin()
    ? ROLE_OPTIONS_BY_LEVEL.platform
    : isEnterpriseAdmin()
      ? ROLE_OPTIONS_BY_LEVEL.enterprise
      : ROLE_OPTIONS_BY_LEVEL.branch

  const subtitle = isPlatformAdmin()
    ? 'All employees across all organizations'
    : isEnterpriseAdmin()
      ? 'All employees across your head office and branches'
      : 'Employees in your branch'

  useEffect(() => {
    if (isPlatformAdmin()) {
      // Load all companies so the platform admin can pick a context
      dispatch(fetchAll_companies({ page: 0, size: 100 }))
    }
    dispatch(fetchAll({ page: 0, size: 20, ...(selectedCompanyId ? { companyIdOverride: selectedCompanyId } : {}) }))
    dispatch(fetchUserRoles())
    dispatch(fetchDepartments({ page: 0, size: 100 }))
    dispatch(fetchJobPositions())
    dispatch(fetchJobRoles())
    dispatch(fetchWorkTypes())
    dispatch(fetchShiftSchedules())
    if (isEnterpriseAdmin() && user?.companyId) {
      // Load head office into companies.data, then load all its branches
      dispatch(fetchMyCompany(user.companyId)).then(() => {
        dispatch(fetchBranches(user.companyId))
      })
    }
  }, [dispatch])

  const load = (page) => dispatch(fetchAll({ page, size: 20, ...(selectedCompanyId ? { companyIdOverride: selectedCompanyId } : {}) }))

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setModalOpen(true)
  }

  // Reset form values after modal mounts — ensures all fields (including conditionally
  // rendered selects) exist in the DOM before reset() sets their values.
  useEffect(() => {
    if (!modalOpen) return
    if (editing) {
      reset({
        firstName: editing.firstName,
        lastName: editing.lastName,
        email: editing.email,
        phone: editing.phone,
        badgeId: editing.badgeId,
        gender: editing.gender,
        dateOfBirth: editing.dateOfBirth,
        dateJoining: editing.dateJoining,
        employeeType: editing.employeeType,
        companyId: editing.companyId,
        departmentId: editing.departmentId,
        nationality: editing.nationality,
        maritalStatus: editing.maritalStatus,
        permanentAddress: editing.permanentAddress,
        currentAddress: editing.currentAddress,
        country: editing.country,
        state: editing.state,
        city: editing.city,
        zip: editing.zip,
        workEmail: editing.workEmail,
        workPhone: editing.workPhone,
        qualification: editing.qualification,
        experience: editing.experience,
        children: editing.children,
        emergencyContactName: editing.emergencyContactName,
        emergencyContact: editing.emergencyContact,
        emergencyContactRelation: editing.emergencyContactRelation,
        jobPositionId: editing.jobPositionId,
        jobRoleId: editing.jobRoleId,
        workTypeId: editing.workTypeId,
        shiftId: editing.shiftId,
        reportingManagerId: editing.reportingManagerId,
        countryOfBirth: editing.countryOfBirth,
        placeOfBirth: editing.placeOfBirth,
        isActive: String(editing.isActive ?? true),
      })
    } else {
      reset({ companyId: user?.companyId || '', isActive: 'true' })
    }
  }, [modalOpen, editing])

  const onSubmit = async (data) => {
    // coerce IDs to numbers
    const { confirmPassword, ...rest } = data
    const payload = {
      ...rest,
      companyId: data.companyId ? Number(data.companyId) : (user?.companyId ? Number(user.companyId) : undefined),
      departmentId: data.departmentId ? Number(data.departmentId) : undefined,
      jobPositionId: data.jobPositionId ? Number(data.jobPositionId) : undefined,
      jobRoleId: data.jobRoleId ? Number(data.jobRoleId) : undefined,
      workTypeId: data.workTypeId ? Number(data.workTypeId) : undefined,
      shiftId: data.shiftId ? Number(data.shiftId) : undefined,
      reportingManagerId: data.reportingManagerId ? Number(data.reportingManagerId) : undefined,
      isActive: data.isActive === 'true',
      role: data.role || undefined,
      accessScope: data.accessScope || undefined,
      // Omit empty strings for date/enum fields — backend can't deserialize "" as LocalDate or Enum
      dateOfBirth: data.dateOfBirth || undefined,
      dateJoining: data.dateJoining || undefined,
      gender: data.gender || undefined,
      maritalStatus: data.maritalStatus || undefined,
      employeeType: data.employeeType || undefined,
      // Coerce number inputs (HTML always returns strings)
      experience: data.experience !== '' && data.experience != null ? Number(data.experience) : undefined,
      children: data.children !== '' && data.children != null ? Number(data.children) : undefined,
    }
    try {
      if (editing) {
        await dispatch(update({ id: editing.id, data: payload })).unwrap()
        toast.success('Employee updated')
      } else {
        await dispatch(create(payload)).unwrap()
        toast.success('Employee created')
      }
      setModalOpen(false)
      load(0)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(remove(deleteTarget.id)).unwrap()
      toast.success('Employee removed')
      setDeleteTarget(null)
    } catch (e) { toast.error(e || 'Error') }
  }

  const filtered = search
    ? employees.filter(e =>
        `${e.fullName} ${e.email} ${e.badgeId} ${e.companyName} ${e.departmentName}`
          .toLowerCase().includes(search.toLowerCase())
      )
    : employees

  const columns = [
    {
      id: 'name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.original.fullName || row.original.firstName} size="sm" />
          <div>
            <p className="font-medium text-gray-900 text-sm">{row.original.fullName || '—'}</p>
            <p className="text-xs text-gray-500">{row.original.email || '—'}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'badgeId', header: 'Badge ID', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'companyName', header: 'Branch / Company' },
    { accessorKey: 'departmentName', header: 'Department' },
    { accessorKey: 'employeeType', header: 'Type', cell: ({ getValue }) => <Badge label={getValue()?.replace(/_/g, ' ') || '—'} variant="secondary" /> },
    { id: 'role', header: 'Role', cell: ({ row }) => {
      const role = roleByEmail[row.original.email]
      return role ? <Badge label={role.replace(/_/g, ' ')} variant="accent" /> : <span className="text-gray-400 text-xs">—</span>
    }},
    { accessorKey: 'dateJoining', header: 'Joined', cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge label={row.original.isActive ? 'Active' : 'Inactive'} variant={row.original.isActive ? 'success' : 'danger'} />,
    },
    ...(canManage ? [{
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Remove</Button>
        </div>
      ),
    }] : []),
  ]

  // Build company options:
  // - Enterprise admin: head office + all its branches (from companies.branches[companyId])
  // - Super admin: all companies in state
  // - Branch admin: no dropdown needed (backend scopes automatically)
  const branchesForEntAdmin = isEnterpriseAdmin() && user?.companyId
    ? (allBranches[user.companyId] || [])
    : []

  const companyOptions = isEnterpriseAdmin()
    ? [
        ...companies.map(c => ({ value: c.id, label: `${c.name} [Head Office]` })),
        ...branchesForEntAdmin.map(b => ({ value: b.id, label: `${b.name} [Branch]` })),
      ]
    : companies.map(c => ({ value: c.id, label: `${c.name} [${c.companyType || c.type || 'Company'}]` }))

  const departmentOptions = departments.map(d => ({ value: d.id, label: d.name }))
  const jobPositionOptions = jobPositions.map(p => ({ value: p.id, label: p.name }))
  const jobRoleOptions = jobRoles.map(r => ({ value: r.id, label: r.name }))
  const workTypeOptions = workTypes.map(w => ({ value: w.id, label: w.name }))
  const shiftOptions = shiftSchedules.map(s => ({ value: s.id, label: s.name }))
  const reportingManagerOptions = employees.map(e => ({ value: e.id, label: e.fullName || e.firstName }))

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={subtitle}
        actions={canManage ? <Button onClick={openCreate}>+ New Employee</Button> : null}
      />

      {/* Platform admin: company context picker */}
      {isPlatformAdmin() && companies.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-gray-500 shrink-0">View company:</label>
          <select
            value={selectedCompanyId || ''}
            onChange={e => {
              const id = e.target.value ? Number(e.target.value) : null
              console.log('[EmployeesPage] Platform admin selected company:', id, '| companyIdOverride header will be:', id || '(none — default from user.companyId)')
              setSelectedCompanyId(id)
              dispatch(fetchAll({ page: 0, size: 20, ...(id ? { companyIdOverride: id } : {}) }))
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— select a company —</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Enterprise admin: branch filter picker */}
      {isEnterpriseAdmin() && (companies.length > 0 || branchesForEntAdmin.length > 0) && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-gray-500 shrink-0">View branch:</label>
          <select
            value={selectedCompanyId || ''}
            onChange={e => {
              const id = e.target.value ? Number(e.target.value) : null
              console.log('[EmployeesPage] Enterprise admin selected branch:', id, '| companyIdOverride header will be:', id || '(none — default from user.companyId)')
              setSelectedCompanyId(id)
              dispatch(fetchAll({ page: 0, size: 20, ...(id ? { companyIdOverride: id } : {}) }))
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— All branches —</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name} [Head Office]</option>
            ))}
            {branchesForEntAdmin.map(b => (
              <option key={b.id} value={b.id}>{b.name} [Branch]</option>
            ))}
          </select>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, badge ID, branch, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} />
      <Pagination
        page={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.size)}
        onPageChange={load}
      />

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Employee' : 'New Employee'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Core identity */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" error={errors.firstName?.message} {...register('firstName', { required: 'Required' })} />
            <Input label="Last Name" {...register('lastName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" {...register('email')} />
            <Input label="Phone" {...register('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Badge ID" placeholder="Auto-generated if left blank" {...register('badgeId')} />
            <Select label="Gender" options={[{ value: '', label: 'Select...' }, ...GENDERS]} {...register('gender')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
            <Input label="Date of Joining" type="date" {...register('dateJoining')} />
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Employee Type"
              options={[{ value: '', label: 'Select...' }, ...EMPLOYEE_TYPES]}
              {...register('employeeType')}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              {...register('isActive')}
            />
          </div>
          {!editing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type="password"
                  error={errors.password?.message}
                  {...register('password', { required: 'Required' })}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', {
                    required: 'Required',
                    validate: (val, formValues) =>
                      val === formValues.password || 'Passwords do not match',
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Role"
                  options={[{ value: '', label: 'None' }, ...assignableRoles]}
                  {...register('role')}
                />
                <Select
                  label="Access Scope"
                  options={[{ value: '', label: 'None' }, ...ACCESS_SCOPE_OPTIONS]}
                  {...register('accessScope')}
                />
              </div>
            </>
          )}
          {(isPlatformAdmin() || isEnterpriseAdmin()) && (
            <Select
              label="Branch / Company"
              options={companyOptions}
              error={errors.companyId?.message}
              {...register('companyId', { required: 'Required' })}
            />
          )}
          <Select
            label="Department"
            options={[{ value: '', label: 'None' }, ...departmentOptions]}
            {...register('departmentId')}
          />
          <Select
            label="Job Position"
            options={[{ value: '', label: 'None' }, ...jobPositionOptions]}
            {...register('jobPositionId')}
          />
          <Select
            label="Job Role"
            options={[{ value: '', label: 'None' }, ...jobRoleOptions]}
            {...register('jobRoleId')}
          />
          <Select
            label="Work Type"
            options={[{ value: '', label: 'None' }, ...workTypeOptions]}
            {...register('workTypeId')}
          />
          <Select
            label="Shift"
            options={[{ value: '', label: 'None' }, ...shiftOptions]}
            {...register('shiftId')}
          />
          <Select
            label="Reporting Manager"
            options={[{ value: '', label: 'None' }, ...reportingManagerOptions]}
            {...register('reportingManagerId')}
          />

          {/* Personal details */}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Marital Status" options={[{ value: '', label: 'None' }, ...MARITAL_STATUSES]} {...register('maritalStatus')} />
            <Input label="Nationality" {...register('nationality')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Qualification" {...register('qualification')} />
            <Input label="Experience (years)" type="number" {...register('experience')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Children" type="number" {...register('children')} />
          </div>

          {/* Work contact */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Work Email" type="email" {...register('workEmail')} />
            <Input label="Work Phone" {...register('workPhone')} />
          </div>

          {/* Address */}
          <Input label="Permanent Address" {...register('permanentAddress')} />
          <Input label="Current Address" {...register('currentAddress')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Country" {...register('country')} />
            <Input label="State" {...register('state')} />
            <Input label="City" {...register('city')} />
          </div>
          <Input label="ZIP Code" {...register('zip')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country of Birth" {...register('countryOfBirth')} />
            <Input label="Place of Birth" {...register('placeOfBirth')} />
          </div>

          {/* Emergency contact */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emergency Contact Name" {...register('emergencyContactName')} />
            <Input label="Emergency Contact Number" {...register('emergencyContact')} />
          </div>
          <Input label="Emergency Contact Relation" {...register('emergencyContactRelation')} />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Employee"
        message={`Remove "${deleteTarget?.fullName}"? This will deactivate their account.`}
        confirmLabel="Remove"
      />
    </div>
  )
}
