import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { API_BASE_URL } from '../../config/constants'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import { formatStatus } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'
import { fetchAll as fetchAll_companies, fetchMyCompany, fetchBranches, selectAll as selectCompanies, selectBranches } from '../companies/companiesSlice'
import { fetchAll as fetchDepartments, selectAll as selectDepartments } from '../departments/departmentsSlice'
import { fetchJobPositions, selectJobPositions, fetchWorkTypes, selectWorkTypes, fetchShiftSchedules, selectShiftSchedules, fetchJobRoles, selectJobRoles } from '../base/baseExtrasSlice'
import { selectAll as selectEmployees } from './employeesSlice'
import EmployeeFormFields from './EmployeeFormFields'
import AboutTab from './profile-tabs/AboutTab'
import WorkInfoTab from './profile-tabs/WorkInfoTab'
import PayrollTab from './profile-tabs/PayrollTab'
import BankDetailsTab from './profile-tabs/BankDetailsTab'
import DocumentsTab from './profile-tabs/DocumentsTab'
import BonusPointsTab from './profile-tabs/BonusPointsTab'
import PermissionsTab from './profile-tabs/PermissionsTab'
import EncashmentConditionTab from './profile-tabs/EncashmentConditionTab'

const TABS = [
  { key: 'about',       label: 'About' },
  { key: 'work-info',   label: 'Work Info' },
  { key: 'payroll',     label: 'Payroll' },
  { key: 'bank',        label: 'Bank Details' },
  { key: 'documents',   label: 'Documents' },
  { key: 'bonus',       label: 'Bonus Points' },
  { key: 'permissions', label: 'Permissions', adminOnly: true },
  { key: 'encashment',  label: 'Encashment', hrOnly: true },
]

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const companyIdParam = searchParams.get('companyId')
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager, user } = useAuth()

  const companies      = useSelector(selectCompanies)
  const allBranches    = useSelector(selectBranches)
  const departments    = useSelector(selectDepartments)
  const jobPositions   = useSelector(selectJobPositions)
  const jobRoles       = useSelector(selectJobRoles)
  const workTypes      = useSelector(selectWorkTypes)
  const shiftSchedules = useSelector(selectShiftSchedules)
  const employees      = useSelector(selectEmployees)

  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('about')
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef(null)

  const canManage = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    setLoading(true)
    const config = companyIdParam ? { headers: { 'X-Company-Id': companyIdParam } } : {}
    api.get(`/employees/${id}`, config)
      .then(res => setProfile(res.data))
      .catch(() => toast.error('Failed to load employee profile'))
      .finally(() => setLoading(false))
  }, [id, companyIdParam])

  useEffect(() => {
    if (isPlatformAdmin()) dispatch(fetchAll_companies({ page: 0, size: 100 }))
    dispatch(fetchDepartments({ page: 0, size: 100 }))
    dispatch(fetchJobPositions())
    dispatch(fetchJobRoles())
    dispatch(fetchWorkTypes())
    dispatch(fetchShiftSchedules())
    if (isEnterpriseAdmin() && user?.companyId) {
      dispatch(fetchMyCompany(user.companyId)).then(() => dispatch(fetchBranches(user.companyId)))
    }
  }, [dispatch])

  useEffect(() => {
    if (!modalOpen || !profile) return
    reset({
      firstName:                profile.firstName,
      lastName:                 profile.lastName,
      email:                    profile.email,
      phone:                    profile.phone,
      gender:                   profile.gender,
      nationality:              profile.nationality,
      dateOfBirth:              profile.dateOfBirth,
      dateJoining:              profile.dateJoining,
      employeeType:             profile.employeeType,
      maritalStatus:            profile.maritalStatus,
      permanentAddress:         profile.permanentAddress,
      currentAddress:           profile.currentAddress,
      country:                  profile.country,
      state:                    profile.state,
      city:                     profile.city,
      zip:                      profile.zip,
      countryOfBirth:           profile.countryOfBirth,
      placeOfBirth:             profile.placeOfBirth,
      workEmail:                profile.workEmail,
      workPhone:                profile.workPhone,
      qualification:            profile.qualification,
      experience:               profile.experience,
      children:                 profile.children,
      emergencyContactName:     profile.emergencyContactName,
      emergencyContact:         profile.emergencyContact,
      emergencyContactRelation: profile.emergencyContactRelation,
      companyId:                profile.companyId,
      departmentId:             profile.departmentId,
      jobPositionId:            profile.jobPositionId,
      jobRoleId:                profile.jobRoleId,
      workTypeId:               profile.workTypeId,
      shiftId:                  profile.shiftId,
      reportingManagerId:       profile.reportingManagerId,
      isActive:                 String(profile.isActive ?? true),
    })
  }, [modalOpen])

  const branchesForEntAdmin = isEnterpriseAdmin() && user?.companyId
    ? (allBranches[user.companyId] || [])
    : []

  const baseCompanyOptions = isEnterpriseAdmin()
    ? [
        ...companies.map(c => ({ value: c.id, label: `${c.name} [Head Office]` })),
        ...branchesForEntAdmin.map(b => ({ value: b.id, label: `${b.name} [Branch]` })),
      ]
    : companies.map(c => ({ value: c.id, label: `${c.name} [${c.companyType || c.type || 'Company'}]` }))

  // Ordinary edits cannot transfer an employee across companies. Keeping the selector
  // limited to the persisted company prevents a filtered options list from submitting
  // the browser's first visible option as an unintended company change.
  const companyOptions = profile?.companyId
    ? [{ value: profile.companyId, label: `${profile.companyName || 'Current company'} [Assigned]` }]
    : baseCompanyOptions

  const departmentOptions       = departments.map(d => ({ value: d.id, label: d.name }))
  const jobPositionOptions      = jobPositions.map(p => ({ value: p.id, label: p.name }))
  const jobRoleOptions          = jobRoles.map(r => ({ value: r.id, label: r.name }))
  const workTypeOptions         = workTypes.map(w => ({ value: w.id, label: w.name }))
  const shiftOptions            = shiftSchedules.map(s => ({ value: s.id, label: s.name }))
  const reportingManagerOptions = employees.map(e => ({ value: e.id, label: e.fullName || e.firstName }))

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        badgeId:            profile.badgeId,
        companyId:          profile.companyId,
        departmentId:       data.departmentId       ? Number(data.departmentId)       : undefined,
        jobPositionId:      data.jobPositionId      ? Number(data.jobPositionId)      : undefined,
        jobRoleId:          data.jobRoleId          ? Number(data.jobRoleId)          : undefined,
        workTypeId:         data.workTypeId         ? Number(data.workTypeId)         : undefined,
        shiftId:            data.shiftId            ? Number(data.shiftId)            : undefined,
        reportingManagerId: data.reportingManagerId ? Number(data.reportingManagerId) : undefined,
        isActive:           data.isActive === 'true',
        gender:             data.gender        || undefined,
        maritalStatus:      data.maritalStatus || undefined,
        dateOfBirth:        data.dateOfBirth   || undefined,
        dateJoining:        data.dateJoining   || undefined,
        employeeType:       data.employeeType  || undefined,
        experience:         data.experience !== '' && data.experience != null ? Number(data.experience) : undefined,
        children:           data.children   !== '' && data.children   != null ? Number(data.children)   : undefined,
      }
      const companyId = profile.companyId || companyIdParam
      const config = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
      const res = await api.put(`/employees/${profile.id}`, payload, config)
      setProfile(res.data)
      setModalOpen(false)
      toast.success('Employee updated')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employee')
    }
  }

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const photoCompanyId = profile.companyId || companyIdParam
      const res = await api.post(`/employees/${profile.id}/photo`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(photoCompanyId ? { 'X-Company-Id': photoCompanyId } : {}),
        },
      })
      setProfile(prev => ({ ...prev, photoPath: res.data?.photoPath ?? res.data }))
      toast.success('Photo updated')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const photoUrl = profile?.photoPath
    ? (profile.photoPath.startsWith('http')
        ? profile.photoPath
        : `${API_BASE_URL.replace('/api', '')}/media/${profile.photoPath.replace(/^\//, '')}`)
    : null

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!profile) return <p className="text-gray-500 p-6">Employee not found.</p>

  return (
    <div className="space-y-4 p-6">

      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Employees
      </button>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left panel ── */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:sticky lg:top-6">

            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`relative mb-4 ${canManage ? 'group cursor-pointer' : ''}`}
                onClick={() => canManage && photoInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <Avatar
                    name={profile.fullName || profile.firstName}
                    src={photoUrl}
                    size="xl"
                    className="!h-24 !w-24 !text-2xl"
                  />
                )}
                {canManage && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
                                  opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>
                )}
              </div>
              {canManage && (
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoChange}
                />
              )}

              <h2 className="text-base font-semibold text-gray-900 leading-tight">
                {profile.fullName || `${profile.firstName} ${profile.lastName || ''}`.trim()}
              </h2>
              {profile.badgeId && (
                <p className="text-xs font-mono text-gray-400 mt-0.5">{profile.badgeId}</p>
              )}
              {profile.jobPositionName && (
                <p className="text-xs text-gray-500 mt-0.5">{profile.jobPositionName}</p>
              )}

              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                <Badge
                  label={profile.isActive ? 'Active' : 'Inactive'}
                  variant={profile.isActive ? 'success' : 'danger'}
                />
                {profile.employeeType && (
                  <Badge label={formatStatus(profile.employeeType)} variant="secondary" />
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 my-4" />

            {/* Contact quick-info */}
            <ul className="space-y-2 text-xs text-gray-600">
              {profile.workEmail && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">✉</span>
                  <span className="break-all">{profile.workEmail}</span>
                </li>
              )}
              {profile.email && profile.email !== profile.workEmail && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">✉</span>
                  <span className="break-all">{profile.email}</span>
                </li>
              )}
              {profile.workPhone && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">☎</span>
                  <span>{profile.workPhone}</span>
                </li>
              )}
              {profile.phone && profile.phone !== profile.workPhone && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">☎</span>
                  <span>{profile.phone}</span>
                </li>
              )}
              {profile.departmentName && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">🏢</span>
                  <span>{profile.departmentName}</span>
                </li>
              )}
              {profile.companyName && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">🏬</span>
                  <span>{profile.companyName}</span>
                </li>
              )}
              {profile.reportingManagerName && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">👤</span>
                  <span>Reports to: {profile.reportingManagerName}</span>
                </li>
              )}
              {profile.dateJoining && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">📅</span>
                  <span>Joined: {profile.dateJoining}</span>
                </li>
              )}
            </ul>

            {canManage && (
              <>
                <div className="border-t border-gray-100 my-4" />
                <Button className="w-full" onClick={() => setModalOpen(true)}>
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200">

            {/* Tab bar */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {TABS.filter(tab => {
                if (tab.adminOnly && !(isPlatformAdmin() || isEnterpriseAdmin())) return false
                if (tab.hrOnly && !(isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager())) return false
                return true
              }).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2
                    ${activeTab === tab.key
                      ? 'text-indigo-600 border-indigo-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {activeTab === 'about'       && <AboutTab profile={profile} />}
              {activeTab === 'work-info'   && <WorkInfoTab employeeId={profile.id} companyId={profile.companyId || companyIdParam} />}
              {activeTab === 'payroll'     && <PayrollTab employeeId={profile.id} companyId={profile.companyId || companyIdParam} />}
              {activeTab === 'bank'        && <BankDetailsTab employeeId={profile.id} companyId={profile.companyId || companyIdParam} />}
              {activeTab === 'documents'   && <DocumentsTab employeeId={profile.id} companyId={profile.companyId || companyIdParam} />}
              {activeTab === 'bonus'       && <BonusPointsTab employeeId={profile.id} companyId={profile.companyId || companyIdParam} />}
              {activeTab === 'permissions' && <PermissionsTab employeeId={profile.id} companyId={profile.companyId || companyIdParam} />}
              {activeTab === 'encashment'  && <EncashmentConditionTab employeeId={profile.id} companyId={profile.companyId || companyIdParam} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {canManage && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Edit Employee"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit(onSubmit)}>Save</Button>
            </div>
          }
        >
          <EmployeeFormFields
            register={register}
            errors={errors}
            isEdit={true}
            badgeId={profile?.badgeId}
            canSelectCompany={isPlatformAdmin() || isEnterpriseAdmin()}
            companyOptions={companyOptions}
            departmentOptions={departmentOptions}
            jobPositionOptions={jobPositionOptions}
            jobRoleOptions={jobRoleOptions}
            workTypeOptions={workTypeOptions}
            shiftOptions={shiftOptions}
            reportingManagerOptions={reportingManagerOptions}
          />
        </Modal>
      )}
    </div>
  )
}
