import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, remove, selectAll, selectLoading, selectPagination } from './employeesSlice'
import { fetchUserRoles, selectUserRoles } from '../roles/rolesSlice'
import { fetchAll as fetchAll_companies, fetchMyCompany, fetchBranches, selectAll as selectCompanies, selectBranches } from '../companies/companiesSlice'
import { fetchAll as fetchDepartments, selectAll as selectDepartments } from '../departments/departmentsSlice'
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

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

export default function EmployeesPage() {
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, user } = useAuth()
  const employees = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const companies = useSelector(selectCompanies)        // head office(s)
  const allBranches = useSelector(selectBranches)       // { [headOfficeId]: [branch, ...] }
  const departments = useSelector(selectDepartments)
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
    reset({ companyId: user?.companyId || '', isActive: 'true' })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    reset({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      badgeId: row.badgeId,
      gender: row.gender,
      dateOfBirth: row.dateOfBirth,
      dateJoining: row.dateJoining,
      employeeType: row.employeeType,
      companyId: row.companyId,
      departmentId: row.departmentId,
      nationality: row.nationality,
      permanentAddress: row.permanentAddress,
      emergencyContactName: row.emergencyContactName,
      emergencyContact: row.emergencyContact,
      isActive: String(row.isActive ?? true),
    })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    // coerce IDs to numbers
    const payload = {
      ...data,
      companyId: data.companyId ? Number(data.companyId) : undefined,
      departmentId: data.departmentId ? Number(data.departmentId) : undefined,
      isActive: data.isActive === 'true',
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
    { accessorKey: 'badgeId', header: 'Badge ID' },
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
            <Input label="Badge ID" {...register('badgeId')} />
            <Select label="Gender" options={GENDERS} {...register('gender')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
            <Input label="Date of Joining" type="date" {...register('dateJoining')} />
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Employee Type"
              options={EMPLOYEE_TYPES}
              {...register('employeeType')}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              {...register('isActive')}
            />
          </div>
          {companyOptions.length > 0 && (
            <Select
              label="Branch / Company"
              options={companyOptions}
              error={errors.companyId?.message}
              {...register('companyId', { required: 'Required' })}
            />
          )}
          {departmentOptions.length > 0 && (
            <Select
              label="Department"
              options={[{ value: '', label: 'None' }, ...departmentOptions]}
              {...register('departmentId')}
            />
          )}

          {/* Contact */}
          <Input label="Nationality" {...register('nationality')} />
          <Input label="Permanent Address" {...register('permanentAddress')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emergency Contact Name" {...register('emergencyContactName')} />
            <Input label="Emergency Contact Number" {...register('emergencyContact')} />
          </div>
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
