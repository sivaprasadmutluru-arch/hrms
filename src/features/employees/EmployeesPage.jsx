import { applyFormErrors } from '../../services/apiErrors'
import api from '../../services/api'
import SaveProgressCard from '../../components/common/SaveProgressCard'
import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, fetchAllGlobal, create, update, remove, hardDelete, setEmployeeArchived, uploadPhoto, importEmployees, downloadImportTemplate, fetchOnlineStatus, selectAll, selectLoading, selectPagination, selectOnlineEmployeeIds } from './employeesSlice'
import { fetchLeavers, selectLeavers, selectLeaversPagination } from '../offboarding/offboardingSlice'
import BulkUpdateModal from './BulkUpdateModal'
import { fetchUserRoles, selectUserRoles } from '../roles/rolesSlice'
import { fetchAll as fetchAll_companies, fetchMyCompany, fetchBranches, selectAll as selectCompanies, selectBranches } from '../companies/companiesSlice'
import { setSelectedCompany } from '../auth/authSlice'
import { fetchAll as fetchDepartments, selectAll as selectDepartments } from '../departments/departmentsSlice'
import { fetchJobPositions, selectJobPositions, fetchWorkTypes, selectWorkTypes, fetchShiftSchedules, selectShiftSchedules, fetchJobRoles, selectJobRoles } from '../base/baseExtrasSlice'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import ConfirmModal from '../../components/common/ConfirmModal'
import Avatar from '../../components/common/Avatar'
import useAuth from '../../hooks/useAuth'
import { API_BASE_URL } from '../../config/constants'
import { useActiveView } from '../../hooks/useViewPreferences'
import { formatDate } from '../../utils/formatters'
import EmployeeFormFields from './EmployeeFormFields'

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

const StatCard = memo(function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )
})

function EmployeeDetailsModal({ employee, role, isOnline, onClose, onFullProfile }) {
  if (!employee) return null
  const details = [
    ['Employee ID', employee.badgeId],
    ['Department', employee.departmentName],
    ['Organization', employee.organizationName],
    ['Branch / Company', employee.companyName],
    ['Date joined', employee.dateJoining ? formatDate(employee.dateJoining) : null],
    ['Employee type', employee.employeeType?.replace(/_/g, ' ')],
    ['Role', role?.replace(/_/g, ' ')],
    ['Phone', employee.phone],
    ['Employment status', employee.isActive ? 'Active' : 'Archived'],
    ['Availability', isOnline ? 'Online now' : 'Offline'],
  ].filter(([, value]) => value != null && value !== '')

  return (
    <Modal
      open={!!employee}
      onClose={onClose}
      size="lg"
      panelClassName="employee-details-modal"
      title="Employee details"
      footer={<div className="employee-details-actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button className="employee-profile-button" onClick={onFullProfile}>Full profile <span aria-hidden="true">→</span></Button></div>}
    >
      <div className="employee-details-person">
        <Avatar name={employee.fullName || employee.firstName} src={employee.photoPath ? `${API_BASE_URL.replace('/api', '')}/media/${employee.photoPath}` : undefined} size="lg" />
        <div><h3>{employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'}</h3><p>{employee.email || 'No email on file'}</p></div>
        <span className={employee.isActive ? 'is-active' : 'is-inactive'}>{employee.isActive ? 'Active' : 'Archived'}</span>
      </div>
      <dl className="employee-details-list">
        {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </Modal>
  )
}

const EmployeeCard = memo(function EmployeeCard({ employee, role, canManage, canArchive, canHoldLogin, canHardDelete, onView, onEdit, onToggleActive, onLoginHold, onHardDelete, isOnline }) {
  return (
    <div
      className="employee-list-card bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group cursor-pointer"
      onClick={() => onView(employee)}
    >
      {/* Card top accent */}
      <div className="employee-list-accent h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl" />
      <div className="employee-list-card-content p-5">
        {/* Header row */}
        <div className="employee-list-heading flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0 relative">
              <Avatar name={employee.fullName || employee.firstName} src={employee.photoPath ? `${API_BASE_URL.replace('/api', '')}/media/${employee.photoPath}` : undefined} size="lg" />
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`} title={isOnline ? 'Online' : 'Offline'} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{employee.email || '—'}</p>
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            employee.isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {employee.isActive ? 'Active' : 'Archived'}
          </span>
        </div>

        {/* Details grid */}
        <div className="employee-list-details space-y-2 mb-4">
          {employee.badgeId && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" />
                <path d="M9 9h6M9 13h4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-mono font-medium text-gray-700">{employee.badgeId}</span>
            </div>
          )}
          {employee.departmentName && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 7h18M3 12h18M3 17h18" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {employee.departmentName}
            </div>
          )}
          {employee.organizationName && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {employee.organizationName}
            </div>
          )}
          {employee.companyName && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 21V8l9-5 9 5v13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="9" y="14" width="6" height="7" strokeWidth="2" />
              </svg>
              {employee.companyName}
            </div>
          )}
          {employee.dateJoining && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Joined {formatDate(employee.dateJoining)}
            </div>
          )}
        </div>

        <div className="employee-list-management">
        {/* Tags row */}
        <div className="employee-list-tags flex flex-wrap gap-1.5 mb-4">
          {employee.employeeType && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              {employee.employeeType.replace(/_/g, ' ')}
            </span>
          )}
          {role && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
              {role.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {employee.userId && <span className={`text-xs font-medium ${employee.loginHeld ? 'text-amber-700' : 'text-slate-500'}`}>Login: {employee.loginHeld ? 'On hold' : 'Not held'}</span>}
        {canHoldLogin && <button onClick={(e) => { e.stopPropagation(); onLoginHold(employee) }} className="w-full py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">{employee.loginHeld ? 'Resume login' : 'Hold login'}</button>}
        {/* Actions */}
        {canManage && (
          <div className="employee-list-actions flex gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(employee) }}
              className="flex-1 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Edit
            </button>
            {canArchive && <button
              onClick={(e) => { e.stopPropagation(); onToggleActive(employee) }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${employee.isActive ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
            >
              {employee.isActive ? 'Archive' : 'Restore'}
            </button>}
          </div>
        )}
        {canHardDelete && (
          <div className="pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onHardDelete(employee) }}
              className="w-full py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
              title="Permanently delete — cannot be undone"
            >
              Delete Permanently
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
})

export default function EmployeesPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, user } = useAuth()
  const canHoldEmployeeLogin = employee => employee.userId && String(employee.userId) !== String(user?.id)
  const employees = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const listError = useSelector(s => s.employees.error)
  const pagination = useSelector(selectPagination)
  const leavers = useSelector(selectLeavers)
  const leaversPagination = useSelector(selectLeaversPagination)
  const [activeTab, setActiveTab] = useState('employees') // 'employees' | 'leavers'
  const companies = useSelector(selectCompanies)
  const allBranches = useSelector(selectBranches)
  const departments = useSelector(selectDepartments)
  const jobPositions = useSelector(selectJobPositions)
  const jobRoles = useSelector(selectJobRoles)
  const workTypes = useSelector(selectWorkTypes)
  const shiftSchedules = useSelector(selectShiftSchedules)
  const userRoles = useSelector(selectUserRoles)

  const roleByEmail = useMemo(() => {
    const map = {}
    userRoles.forEach(ur => { if (ur.email && ur.roleName) map[ur.email] = ur.roleName })
    return map
  }, [userRoles])

  const canArchiveEmployee = employee => (!employee.userId || String(employee.userId) !== String(user?.id)) && roleByEmail[employee.email] !== 'PLATFORM_SUPER_ADMIN'

  // Initialise from the persisted header switcher selection so a page reload keeps the filter
  const authSelectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const onlineEmployeeIds = useSelector(selectOnlineEmployeeIds)

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const submittingRef = useRef(false)
  const [detailsEmployee, setDetailsEmployee] = useState(null)
  const [editing, setEditing] = useState(null)
  const [loginTarget, setLoginTarget] = useState(null)
  const [loginReason, setLoginReason] = useState('')
  const [loginSaving, setLoginSaving] = useState(false)
  const loginSubmitting = useRef(false)
  const openLoginHold = employee => { setLoginReason(''); setLoginTarget(employee) }
  const handleLoginHold = async event => {
    event.preventDefault()
    if (loginSubmitting.current || !loginTarget || !loginReason.trim()) return
    loginSubmitting.current = true
    setLoginSaving(true)
    try {
      await api.put(`/employees/${loginTarget.id}/login-hold`, { held: !loginTarget.loginHeld, reason: loginReason.trim() }, { headers: { 'X-Company-Id': loginTarget.companyId } })
      toast.success(loginTarget.loginHeld ? 'Login hold removed' : 'Employee login held')
      setLoginTarget(null)
      load(pagination.page)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to update login access') }
    finally { loginSubmitting.current = false; setLoginSaving(false) }
  }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [archiveSaving, setArchiveSaving] = useState(false)
  const archiveSubmitting = useRef(false)
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [search, setSearch] = useState('')
  const searchReady = useRef(false)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'online' | 'offline'
  const [viewMode, setViewMode] = useActiveView('grid') // persisted grid | list preference
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    authSelectedCompanyId ? Number(authSelectedCompanyId) : null
  )
  const [selectedRows, setSelectedRows] = useState([])
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [pageSize, setPageSize] = useState(20)
  const [importFailures, setImportFailures] = useState(null) // per-row reasons from the last import, or null when none/hidden
  const importEmployeesRef = useRef()

  const { register, control, setValue, handleSubmit, reset, setError, clearErrors, formState: { errors } } = useForm()

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
      dispatch(fetchAll_companies({ page: 0, size: 100 }))
      // Use the persisted company filter (from the header switcher) if present
      const initCompanyId = authSelectedCompanyId ? Number(authSelectedCompanyId) : null
      if (initCompanyId) {
        dispatch(fetchAll({ archived: activeTab === 'archived', page: 0, size: pageSize, sort: 'id,desc', companyIdOverride: initCompanyId }))
      } else {
        dispatch(fetchAllGlobal({ archived: activeTab === 'archived', page: 0, size: pageSize, sort: 'id,desc' }))
      }
    } else {
      dispatch(fetchAll({ archived: activeTab === 'archived', page: 0, size: pageSize, sort: 'id,desc' }))
    }
    dispatch(fetchUserRoles())
    dispatch(fetchDepartments({ page: 0, size: 100 }))
    dispatch(fetchJobPositions())
    dispatch(fetchJobRoles())
    dispatch(fetchWorkTypes())
    dispatch(fetchShiftSchedules())
    if (isEnterpriseAdmin() && user?.companyId) {
      dispatch(fetchMyCompany(user.companyId)).then(() => {
        dispatch(fetchBranches(user.companyId))
      })
    }
    if (isPlatformAdmin()) {
      // Super admin: pass selected company if any, else fetch globally (no companyId)
      dispatch(fetchOnlineStatus(authSelectedCompanyId ? Number(authSelectedCompanyId) : null))
    } else if (user?.companyId) {
      dispatch(fetchOnlineStatus(user.companyId))
    }
  }, [dispatch])

  const loadLeavers = (page = 0, size = pageSize) => {
    dispatch(fetchLeavers({ page, size, ...(selectedCompanyId ? { companyId: selectedCompanyId } : user?.companyId ? { companyId: user.companyId } : {}) }))
  }

  useEffect(() => {
    if (activeTab === 'leavers') loadLeavers(0)
  }, [activeTab, selectedCompanyId])

  // Super Admin with no company filter → global; otherwise scoped
  const load = (page, size = pageSize, q = search.trim()) => {
    if (isPlatformAdmin() && !selectedCompanyId) {
      dispatch(fetchAllGlobal({ archived: activeTab === 'archived', page, size, sort: 'id,desc', q }))
    } else if (isPlatformAdmin() && selectedCompanyId) {
      dispatch(fetchAll({ archived: activeTab === 'archived', page, size, sort: 'id,desc', q, companyIdOverride: selectedCompanyId }))
    } else {
      dispatch(fetchAll({ archived: activeTab === 'archived', page, size, sort: 'id,desc', q, ...(selectedCompanyId ? { filterByCompanyId: selectedCompanyId } : {}) }))
    }
  }

  useEffect(() => {
    if (!searchReady.current) { searchReady.current = true; return }
    const timer = window.setTimeout(() => { if (activeTab !== 'leavers') load(0) }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (activeTab !== 'leavers') load(0)
    setSelectedRows([])
  }, [activeTab])

  const openCreate = useCallback(() => { setEditing(null); setPhotoFile(null); setPhotoPreview(null); setModalOpen(true) }, [])
  const openEdit = useCallback((row) => {
    setEditing(row)
    setPhotoFile(null)
    setPhotoPreview(row.photoPath ? `${API_BASE_URL.replace('/api', '')}/media/${row.photoPath}` : null)
    setModalOpen(true)
  }, [])

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
      // Anyone who gets a Branch/Company dropdown (platform/enterprise admin) must
      // explicitly choose it — no pre-filled default, even a "reasonable" one. A silent
      // default is exactly what caused an employee meant for a newly created org to be
      // saved under the admin's own company instead: the dropdown had already
      // pre-selected a value, and it went un-reviewed before submitting. Leaving it
      // blank forces a conscious choice every time (the field is `required`, so the
      // form can't submit without it).
      //
      // Regular users without that dropdown (branch admin, HR manager, ...) only ever
      // belong to one company, so defaulting to it isn't a "fallback" in the same
      // sense — there's nothing else it could correctly be.
      const canPickCompany = isPlatformAdmin() || isEnterpriseAdmin()
      reset({ companyId: canPickCompany ? '' : (user?.companyId || ''), isActive: 'true' })
    }
  }, [modalOpen, editing])

  const onSubmit = async (data) => {
    if (submittingRef.current) return
    clearErrors()
    submittingRef.current = true
    setSaving(true)
    setSaveMessage(editing ? 'Saving employee details…' : 'Saving the employee profile and account details…')
    const { confirmPassword, password, ...rest } = data
    const payload = {
      ...rest,
      // Include password so the backend can set a custom initial password on employee create,
      // or create the user account on update when userId was previously null.
      password: password || undefined,
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
      dateOfBirth: data.dateOfBirth || undefined,
      dateJoining: data.dateJoining || undefined,
      gender: data.gender || undefined,
      maritalStatus: data.maritalStatus || undefined,
      employeeType: data.employeeType || undefined,
      experience: data.experience !== '' && data.experience != null ? Number(data.experience) : undefined,
      children: data.children !== '' && data.children != null ? Number(data.children) : undefined,
      basicPay: data.basicPay !== '' && data.basicPay != null ? Number(data.basicPay) : undefined,
      housingAllowance: data.housingAllowance !== '' && data.housingAllowance != null ? Number(data.housingAllowance) : undefined,
      transportAllowance: data.transportAllowance !== '' && data.transportAllowance != null ? Number(data.transportAllowance) : undefined,
      otherAllowance: data.otherAllowance !== '' && data.otherAllowance != null ? Number(data.otherAllowance) : undefined,
      totalSalary: data.totalSalary !== '' && data.totalSalary != null ? Number(data.totalSalary) : undefined,
      salaryPerHour: data.salaryPerHour !== '' && data.salaryPerHour != null ? Number(data.salaryPerHour) : undefined,
      wageType: data.wageType || undefined,
      contractEndDate: data.contractEndDate || undefined,
    }
    try {
      let savedId
      if (editing) {
        await dispatch(update({ id: editing.id, data: payload })).unwrap()
        savedId = editing.id
        toast.success('Employee updated')
      } else {
        const created = await dispatch(create(payload)).unwrap()
        savedId = created.id
        toast.success('Employee created')
      }
      if (photoFile && savedId) {
        setSaveMessage('Uploading the employee profile picture…')
        try {
          await dispatch(uploadPhoto({ id: savedId, file: photoFile })).unwrap()
        } catch {
          toast.error('Employee saved but photo upload failed')
        }
      }
      setModalOpen(false)
      setPhotoFile(null)
      setPhotoPreview(null)
      if (!editing) {
        setViewMode('grid')
        setSearch('')
        setStatusFilter('all')
        if (activeTab !== 'employees') setActiveTab('employees')
        else load(0, pageSize, '')
      } else load(pagination.page)
    } catch (e) { toast.error(applyFormErrors(e, setError)) }
    finally { submittingRef.current = false; setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      // companyId pins which org's schema to delete from — required when this row came
      // from the cross-org "All Companies" grid, where ids repeat across orgs.
      await dispatch(remove({ id: deleteTarget.id, companyId: deleteTarget.companyId })).unwrap()
      toast.success('Employee removed')
      setDeleteTarget(null)
      load(0)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleToggleActive = async () => {
    const employee = deleteTarget
    if (!employee || archiveSubmitting.current) return
    const archived = employee.isActive
    archiveSubmitting.current = true
    setArchiveSaving(true)
    try {
      await dispatch(setEmployeeArchived({ id: employee.id, archived, companyId: employee.companyId })).unwrap()
      toast.success(`Employee ${archived ? 'archived' : 'restored'}`)
      setDeleteTarget(null)
      load(0)
    } catch (e) { toast.error(e || `Failed to ${archived ? 'archive' : 'restore'} employee`) }
    finally { archiveSubmitting.current = false; setArchiveSaving(false) }
  }

  const handleHardDelete = async () => {
    try {
      await dispatch(hardDelete({ id: hardDeleteTarget.id, companyId: hardDeleteTarget.companyId })).unwrap()
      toast.success('Employee permanently deleted')
      setHardDeleteTarget(null)
      load(0)
    } catch (e) { toast.error(e || 'Error') }
  }

  const onlineSet = new Set(onlineEmployeeIds)

  const filtered = employees.filter(e => {
    const isOnline = onlineSet.has(e.id)
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'online' && isOnline) ||
      (statusFilter === 'offline' && !isOnline)
    return matchesStatus
  })

  const onlineCount = employees.filter(e => onlineSet.has(e.id)).length

  const columns = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={filtered.length > 0 && filtered.every(e => selectedRows.includes(e.id))}
          onChange={e => setSelectedRows(e.target.checked ? filtered.map(emp => emp.id) : [])}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={selectedRows.includes(row.original.id)}
          onChange={e => {
            e.stopPropagation()
            setSelectedRows(prev =>
              e.target.checked ? [...prev, row.original.id] : prev.filter(id => id !== row.original.id)
            )
          }}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.original.fullName || row.original.firstName} src={row.original.photoPath ? `${API_BASE_URL.replace('/api', '')}/media/${row.original.photoPath}` : undefined} size="sm" />
          <div>
            <p className="font-medium text-gray-900 text-sm">{row.original.fullName || '—'}</p>
            <p className="text-xs text-gray-500">{row.original.email || '—'}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'badgeId', header: 'Employee ID', cell: ({ getValue }) => getValue() || '—' },
    ...(isPlatformAdmin() ? [{ accessorKey: 'organizationName', header: 'Organization', cell: ({ getValue }) => getValue() || '—' }] : []),
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
      cell: ({ row }) => <Badge label={row.original.isActive ? 'Active' : 'Archived'} variant={row.original.isActive ? 'success' : 'danger'} />,
    },
    {
      id: 'online',
      header: 'Online',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span className={`w-2.5 h-2.5 rounded-full ${onlineSet.has(row.original.id) ? 'bg-green-400' : 'bg-gray-300'}`} />
          {onlineSet.has(row.original.id) ? 'Online' : 'Offline'}
        </span>
      ),
    },
    {
      id: 'loginAccess',
      header: 'Login',
      cell: ({ row }) => row.original.userId ? <span className={row.original.loginHeld ? 'text-amber-700 font-medium' : 'text-slate-500'}>{row.original.loginHeld ? 'On hold' : 'Not held'}</span> : 'No account',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/employees/${row.original.id}${row.original.companyId ? `?companyId=${row.original.companyId}` : ''}`)}>View</Button>
          {canManage && (
            <>
              <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
              {canHoldEmployeeLogin(row.original) && <Button size="sm" variant="secondary" onClick={() => openLoginHold(row.original)}>{row.original.loginHeld ? 'Resume login' : 'Hold login'}</Button>}
              {canArchiveEmployee(row.original) && <Button size="sm" variant={row.original.isActive ? 'danger' : 'success'} onClick={() => setDeleteTarget(row.original)}>
                {row.original.isActive ? 'Archive' : 'Restore'}
              </Button>}
            </>
          )}
          {isPlatformAdmin() && (
            <Button size="sm" variant="danger" onClick={() => setHardDeleteTarget(row.original)} title="Permanently delete — cannot be undone">
              Delete Permanently
            </Button>
          )}
        </div>
      ),
    },
  ]

  const branchesForEntAdmin = isEnterpriseAdmin() && user?.companyId
    ? (allBranches[user.companyId] || [])
    : []

  const baseCompanyOptions = isEnterpriseAdmin()
    ? [
        ...companies.map(c => ({ value: c.id, label: `${c.name} [Head Office]` })),
        ...branchesForEntAdmin.map(b => ({ value: b.id, label: `${b.name} [Branch]` })),
      ]
    : companies.map(c => ({ value: c.id, label: `${c.name} [${c.companyType || c.type || 'Company'}]` }))

  // An edit form must always show the employee's persisted company. If the current
  // admin's selector was loaded with a narrower company list, a native <select>
  // otherwise displays its first option, misleading the admin into thinking the
  // employee belongs to a different company.
  const companyOptions = editing?.companyId && !baseCompanyOptions.some(option => String(option.value) === String(editing.companyId))
    ? [{ value: editing.companyId, label: `${editing.companyName || 'Current company'} [Assigned]` }, ...baseCompanyOptions]
    : baseCompanyOptions

  // The single org a bulk import/template download targets — never falls back silently;
  // null here means "no organization is unambiguously selected", which disables both
  // actions rather than guessing (a platform admin viewing "All Organizations" has no
  // safe default to fall back to).
  const importTargetCompanyId = isPlatformAdmin() ? selectedCompanyId : (selectedCompanyId || user?.companyId || null)

  const departmentOptions = departments.map(d => ({ value: d.id, label: d.name }))
  const jobPositionOptions = jobPositions.map(p => ({ value: p.id, label: p.name }))
  const jobRoleOptions = jobRoles.map(r => ({ value: r.id, label: r.name, jobPositionId: r.jobPositionId ?? r.jobPosition?.id }))
  const workTypeOptions = workTypes.map(w => ({ value: w.id, label: w.name }))
  const shiftOptions = shiftSchedules.map(s => ({ value: s.id, label: s.name }))
  const reportingManagerOptions = employees.map(e => ({ value: e.id, label: e.fullName || e.firstName }))

  return (
    <div className="employees-page space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            {selectedRows.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setShowBulkUpdate(true)}>
                Bulk Update ({selectedRows.length})
              </Button>
            )}
            <Button
              variant="secondary" size="sm"
              disabled={!importTargetCompanyId}
              title={!importTargetCompanyId ? 'Select an organization above first' : undefined}
              onClick={() => dispatch(downloadImportTemplate(importTargetCompanyId))}
            >Download Template</Button>
            <Button
              variant="secondary" size="sm"
              disabled={!importTargetCompanyId}
              title={!importTargetCompanyId ? 'Select an organization above first' : undefined}
              onClick={() => importEmployeesRef.current?.click()}
            >Import Employees</Button>
            <input
              ref={importEmployeesRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={async e => {
                const f = e.target.files[0]
                if (!f) return
                e.target.value = ''
                // Strict guard: an import must target one explicit organization — never fall
                // back silently to the admin's own company. Must match the org currently
                // selected in the company picker above (same value Download Template uses) —
                // this previously always sent the logged-in admin's OWN companyId, so
                // importing while viewing a different organization silently imported into
                // the wrong org instead.
                if (!importTargetCompanyId) {
                  toast.error('Select an organization before importing employees')
                  return
                }
                const res = await dispatch(importEmployees({ companyId: importTargetCompanyId, file: f }))
                if (res.error) {
                  toast.error(res.payload)
                } else {
                  const { successCount, failureCount, failures } = res.payload
                  toast.success(`Imported ${successCount} employee(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`)
                  if (failureCount > 0) setImportFailures(failures || [])
                  setViewMode('grid')
                  setSearch('')
                  setStatusFilter('all')
                  if (activeTab !== 'employees') setActiveTab('employees')
                  else load(0, pageSize, '')
                }
              }}
            />
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Employee
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ id: 'employees', label: 'Employees' }, { id: 'archived', label: 'Archived employees' }, { id: 'leavers', label: 'Leavers' }].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'leavers' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <DataTable
            columns={[
              { id: 'name', header: 'Employee', cell: ({ row }) => row.original.employee?.fullName || `${row.original.employee?.firstName || ''} ${row.original.employee?.lastName || ''}`.trim() || '—' },
              { id: 'email', header: 'Email', cell: ({ row }) => row.original.employee?.email || '—' },
              { accessorKey: 'exitDate', header: 'Last Working Date', cell: ({ getValue }) => formatDate(getValue()) },
              { accessorKey: 'reasonOfLeaving', header: 'Reason', cell: ({ getValue }) => getValue() || '—' },
              { accessorKey: 'retentionPeriodMonths', header: 'Retention', cell: ({ getValue }) => getValue() ? `${getValue()} month${getValue() > 1 ? 's' : ''}` : '—' },
              { accessorKey: 'retentionExpiresAt', header: 'Retention Expires', cell: ({ getValue }) => getValue() ? formatDate(getValue()) : '—' },
              { accessorKey: 'employeeDeactivatedAt', header: 'Deactivated On', cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleString() : '—' },
            ]}
            data={leavers}
            loading={loading}
          />
          <div className="p-4">
            <Pagination
              page={leaversPagination.page}
              totalPages={Math.ceil(leaversPagination.total / pageSize)}
              onPageChange={loadLeavers}
            />
          </div>
        </div>
      ) : (
      <>
      {activeTab === 'archived' && <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">Archived employees cannot sign in and do not count toward active employee limits. Their records remain available. Restore an employee to return them to the active workforce.</p>}
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={activeTab === 'archived' ? 'Total Archived' : 'Total Active'} value={pagination.total || employees.length} icon="👥" color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Online on this page" value={onlineCount} icon="🟢" color="bg-green-50 text-green-600" />
        <StatCard label="Departments" value={departments.length} icon="🏢" color="bg-violet-50 text-violet-600" />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, employee ID..."
              maxLength={80}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
            />
          </div>

          {/* Online/Offline filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>

          {/* Platform admin: company picker — "All" uses global endpoint, specific company uses scoped */}
          {isPlatformAdmin() && companies.length > 0 && (
            <select
              value={selectedCompanyId || ''}
              onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null
                setSelectedCompanyId(id)
                dispatch(setSelectedCompany(id)) // keep in sync with header switcher
                if (id) {
                  dispatch(fetchAll({ archived: activeTab === 'archived', page: 0, size: pageSize, q: search.trim(), companyIdOverride: id }))
                  dispatch(fetchOnlineStatus(id))
                } else {
                  dispatch(fetchAllGlobal({ archived: activeTab === 'archived', page: 0, size: pageSize, q: search.trim() }))
                  dispatch(fetchOnlineStatus(null))
                }
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            >
              <option value="">All organizations</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Enterprise admin: branch picker */}
          {isEnterpriseAdmin() && (companies.length > 0 || branchesForEntAdmin.length > 0) && (
            <select
              value={selectedCompanyId || ''}
              onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null
                setSelectedCompanyId(id)
                dispatch(fetchAll({ archived: activeTab === 'archived', page: 0, size: pageSize, q: search.trim(), ...(id ? { filterByCompanyId: id } : {}) }))
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            >
              <option value="">All branches</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} [Head Office]</option>
              ))}
              {branchesForEntAdmin.map(b => (
                <option key={b.id} value={b.id}>{b.name} [Branch]</option>
              ))}
            </select>
          )}

          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={e => {
              const size = Number(e.target.value)
              setPageSize(size)
              load(0, size)
            }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
          >
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid view"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List view"
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {listError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>}
      {/* Keep the employee list scrolling independently from the page controls. */}
      <div className="employee-results-panel">
      <div className="employee-results-scroll">
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 text-2xl">👤</div>
          <p className="text-gray-900 font-semibold text-base">{activeTab === 'archived' ? 'No archived employees' : 'No employees found'}</p>
          <p className="text-gray-400 text-sm mt-1">{search ? 'Try a different name, email, or employee ID' : 'Try adjusting your filters'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="employee-directory-stack">
          {filtered.map((emp, idx) => (
            <EmployeeCard
              key={`${emp.companyId ?? 'x'}-${emp.id ?? idx}-${idx}`}
              employee={emp}
              role={roleByEmail[emp.email]}
              canManage={canManage}
              canArchive={canManage && canArchiveEmployee(emp)}
              canHoldLogin={canManage && canHoldEmployeeLogin(emp) && roleByEmail[emp.email] !== 'PLATFORM_SUPER_ADMIN'}
              canHardDelete={isPlatformAdmin()}
              isOnline={onlineSet.has(emp.id)}
              onView={setDetailsEmployee}
              onEdit={openEdit}
              onToggleActive={setDeleteTarget}
              onLoginHold={openLoginHold}
              onHardDelete={setHardDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filtered} loading={false} />
        </div>
      )}

      </div>
      <div className="employee-results-footer">
      <span className="employee-results-count">{pagination.total ? `Showing ${pagination.page * pageSize + 1}–${Math.min((pagination.page + 1) * pageSize, pagination.total)} of ${pagination.total} employees · page ${pagination.page + 1} of ${Math.max(1, Math.ceil(pagination.total / pageSize))}` : 'No employees to display'}</span>
      <Pagination
        page={pagination.page}
        totalPages={Math.ceil(pagination.total / pageSize)}
        onPageChange={load}
      />
      </div>
      </div>
      </>
      )}

      {/* Create / Edit Modal */}
      <EmployeeDetailsModal
        employee={detailsEmployee}
        role={detailsEmployee ? roleByEmail[detailsEmployee.email] : null}
        isOnline={detailsEmployee ? onlineSet.has(detailsEmployee.id) : false}
        onClose={() => setDetailsEmployee(null)}
        onFullProfile={() => {
          const employee = detailsEmployee
          setDetailsEmployee(null)
          if (employee) navigate(`/employees/${employee.id}${employee.companyId ? `?companyId=${employee.companyId}` : ''}`)
        }}
      />
      <Modal
        open={modalOpen}
        onClose={() => { if (!submittingRef.current) { setModalOpen(false); setPhotoFile(null); setPhotoPreview(null) } }}
        busy={saving}
        size="lg"
        panelClassName="employee-modal"
        title={editing ? 'Edit Employee' : 'New Employee'}
        footer={
          <div className="flex justify-end gap-2">
            {!saving && <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>}
            <Button disabled={saving} loading={saving} onClick={handleSubmit(onSubmit)}>{saving ? (editing ? 'Saving…' : 'Creating…') : editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        {saving && <SaveProgressCard title={editing ? 'Saving employee…' : 'Creating employee…'} message={saveMessage} />}
        <fieldset disabled={saving} hidden={saving} className="min-w-0">
        <EmployeeFormFields
          register={register}
          control={control}
          setValue={setValue}
          defaultCompanyId={user?.companyId}
          errors={errors}
          isEdit={!!editing}
          badgeId={editing?.badgeId}
          canSelectCompany={isPlatformAdmin() || isEnterpriseAdmin()}
          assignableRoles={assignableRoles}
          companyOptions={companyOptions}
          departmentOptions={departmentOptions}
          jobPositionOptions={jobPositionOptions}
          jobRoleOptions={jobRoleOptions}
          workTypeOptions={workTypeOptions}
          shiftOptions={shiftOptions}
          reportingManagerOptions={reportingManagerOptions}
          vertical
          photoPreview={photoPreview}
          onPhotoChange={(file) => {
            setPhotoFile(file)
            setPhotoPreview(file ? URL.createObjectURL(file) : null)
          }}
        />
        </fieldset>
      </Modal>

      <Modal open={!!loginTarget} onClose={() => setLoginTarget(null)} title={loginTarget?.loginHeld ? 'Resume employee login' : 'Hold employee login'} size="sm" busy={loginSaving}>
        <form onSubmit={handleLoginHold} className="space-y-4">
          <p className="text-sm text-slate-600">{loginTarget?.fullName}</p>
          <p className="text-sm text-slate-600">{loginTarget?.loginHeld
            ? 'Remove the hold on this login account. Employment status and other access restrictions still apply.'
            : 'Block sign-in and existing sessions for this login account across its companies. Employee records, employment status and payroll are preserved.'}</p>
          <label className="block text-sm font-medium text-slate-700">Reason <span className="text-red-600">*</span>
            <textarea value={loginReason} onChange={e => setLoginReason(e.target.value)} required maxLength={500} disabled={loginSaving} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Explain why login access is changing" />
          </label>
          <p className="text-xs text-slate-500">Your name, the reason and time will be recorded in the audit history.</p>
          <div className="flex justify-end gap-2">
            {!loginSaving && <Button type="button" variant="secondary" onClick={() => setLoginTarget(null)}>Cancel</Button>}
            <Button type="submit" disabled={loginSaving || !loginReason.trim()}>{loginSaving ? 'Updating…' : loginTarget?.loginHeld ? 'Resume login' : 'Hold login'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => { if (!archiveSubmitting.current) setDeleteTarget(null) }}
        onConfirm={handleToggleActive}
        title={deleteTarget?.isActive ? 'Archive employee' : 'Restore employee'}
        loading={archiveSaving}
        message={deleteTarget?.isActive
          ? `Archive "${deleteTarget?.fullName}"? This removes them from the active workforce and blocks login. All employee records and payroll history are preserved.`
          : `Restore "${deleteTarget?.fullName}" to the active workforce? Plan capacity limits apply. Any separate login hold, account restriction or revoked role remains in place.`}
        confirmLabel={deleteTarget?.isActive ? 'Archive' : 'Restore'}
      />

      <ConfirmModal
        open={!!hardDeleteTarget}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={handleHardDelete}
        title="Delete Employee Permanently"
        message={`Permanently delete "${hardDeleteTarget?.fullName}"? This removes the employee and ALL related records (attendance, payroll, leave, documents, etc.) forever. This cannot be undone.`}
        confirmLabel="Delete Permanently"
      />

      {showBulkUpdate && (
        <BulkUpdateModal
          employeeIds={selectedRows}
          onClose={() => setShowBulkUpdate(false)}
          onSuccess={() => { setSelectedRows([]); load(pagination.page) }}
        />
      )}

      <Modal
        open={!!importFailures?.length}
        onClose={() => setImportFailures(null)}
        title="Import failures"
        footer={<Button variant="secondary" onClick={() => setImportFailures(null)}>Close</Button>}
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {importFailures?.map((f, i) => (
            <div key={i} className="text-sm border border-gray-100 rounded-lg p-2">
              <span className="font-medium text-gray-700">Row {f.row}</span>
              {f.email && <span className="text-gray-400"> ({f.email})</span>}
              <p className="text-red-600 mt-0.5">{f.reason}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
