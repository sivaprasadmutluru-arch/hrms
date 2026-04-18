import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { API_BASE_URL } from '../../config/constants'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import { formatStatus } from '../../utils/formatters'
import AboutTab from './profile-tabs/AboutTab'
import WorkInfoTab from './profile-tabs/WorkInfoTab'
import PayrollTab from './profile-tabs/PayrollTab'
import BankDetailsTab from './profile-tabs/BankDetailsTab'
import DocumentsTab from './profile-tabs/DocumentsTab'
import BonusPointsTab from './profile-tabs/BonusPointsTab'

const GENDERS = [
  { value: 'MALE',   label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other' },
]

const MARITAL_STATUSES = [
  { value: 'SINGLE',   label: 'Single' },
  { value: 'MARRIED',  label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED',  label: 'Widowed' },
]

const TABS = [
  { key: 'about',      label: 'About' },
  { key: 'work-info',  label: 'Work Info' },
  { key: 'payroll',    label: 'Payroll' },
  { key: 'bank',       label: 'Bank Details' },
  { key: 'documents',  label: 'Documents' },
  { key: 'bonus',      label: 'Bonus Points' },
]

export default function MyProfilePage() {
  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('about')
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    api.get('/ess/me')
      .then(res => setProfile(res.data))
      .catch(err => {
        if (err.response?.status !== 404) toast.error('Failed to load profile')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!modalOpen || !profile) return
    reset({
      firstName:                profile.firstName,
      lastName:                 profile.lastName,
      phone:                    profile.phone,
      gender:                   profile.gender,
      nationality:              profile.nationality,
      dateOfBirth:              profile.dateOfBirth,
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
    })
  }, [modalOpen])

  const onSubmit = async (data) => {
    try {
      const res = await api.put(`/employees/${profile.id}`, {
        ...data,
        companyId:     profile.companyId,
        departmentId:  profile.departmentId,
        isActive:      profile.isActive,
        gender:        data.gender        || undefined,
        maritalStatus: data.maritalStatus || undefined,
        dateOfBirth:   data.dateOfBirth   || undefined,
        experience:    data.experience !== '' && data.experience != null ? Number(data.experience) : undefined,
        children:      data.children   !== '' && data.children   != null ? Number(data.children)   : undefined,
      })
      setProfile(res.data)
      setModalOpen(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await api.post(`/employees/${profile.id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
        : `${API_BASE_URL.replace('/api', '')}${profile.photoPath}`)
    : null

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!profile) return <p className="text-gray-500 p-6">No employee profile linked to your account.</p>

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">

      {/* ── Left panel ── */}
      <div className="lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:sticky lg:top-6">

          {/* Avatar with upload overlay */}
          <div className="flex flex-col items-center text-center">
            <div
              className="relative group cursor-pointer mb-4"
              onClick={() => photoInputRef.current?.click()}
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
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
                              opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChange}
            />

            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {profile.fullName || `${profile.firstName} ${profile.lastName || ''}`.trim()}
            </h2>
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
          </ul>

          <div className="border-t border-gray-100 my-4" />

          <Button className="w-full" onClick={() => setModalOpen(true)}>
            Edit Profile
          </Button>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200">

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {TABS.map(tab => (
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
            {activeTab === 'about'     && <AboutTab profile={profile} />}
            {activeTab === 'work-info' && <WorkInfoTab employeeId={profile.id} isSelf={true} />}
            {activeTab === 'payroll'   && <PayrollTab employeeId={profile.id} />}
            {activeTab === 'bank'      && <BankDetailsTab employeeId={profile.id} />}
            {activeTab === 'documents' && <DocumentsTab employeeId={profile.id} />}
            {activeTab === 'bonus'     && <BonusPointsTab employeeId={profile.id} />}
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Profile"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" error={errors.firstName?.message}
              {...register('firstName', { required: 'Required' })} />
            <Input label="Last Name" {...register('lastName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" {...register('phone')} />
            <Input label="Nationality" {...register('nationality')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Gender"
              options={[{ value: '', label: 'Select...' }, ...GENDERS]}
              {...register('gender')} />
            <Select label="Marital Status"
              options={[{ value: '', label: 'Select...' }, ...MARITAL_STATUSES]}
              {...register('maritalStatus')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
            <Input label="Qualification" {...register('qualification')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Experience (years)" type="number" {...register('experience')} />
            <Input label="Children" type="number" {...register('children')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Work Email" type="email" {...register('workEmail')} />
            <Input label="Work Phone" {...register('workPhone')} />
          </div>
          <Input label="Permanent Address" {...register('permanentAddress')} />
          <Input label="Current Address" {...register('currentAddress')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Country" {...register('country')} />
            <Input label="State" {...register('state')} />
            <Input label="City" {...register('city')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="ZIP Code" {...register('zip')} />
            <Input label="Country of Birth" {...register('countryOfBirth')} />
          </div>
          <Input label="Place of Birth" {...register('placeOfBirth')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emergency Contact Name" {...register('emergencyContactName')} />
            <Input label="Emergency Contact Phone" {...register('emergencyContact')} />
          </div>
          <Input label="Emergency Contact Relation" {...register('emergencyContactRelation')} />
        </div>
      </Modal>
    </div>
  )
}
