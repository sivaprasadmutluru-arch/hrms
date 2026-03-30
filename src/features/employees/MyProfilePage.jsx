import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Modal from '../../components/common/Modal'
import { formatDate } from '../../utils/formatters'

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

const FIELDS = [
  { label: 'First Name',                key: 'firstName' },
  { label: 'Last Name',                 key: 'lastName' },
  { label: 'Email',                     key: 'email' },
  { label: 'Phone',                     key: 'phone' },
  { label: 'Badge ID',                  key: 'badgeId' },
  { label: 'Gender',                    key: 'gender' },
  { label: 'Marital Status',            key: 'maritalStatus', format: v => v?.replace(/_/g, ' ') },
  { label: 'Nationality',               key: 'nationality' },
  { label: 'Date of Birth',             key: 'dateOfBirth',   format: formatDate },
  { label: 'Date of Joining',           key: 'dateJoining',   format: formatDate },
  { label: 'Employee Type',             key: 'employeeType',  format: v => v?.replace(/_/g, ' ') },
  { label: 'Department',                key: 'departmentName' },
  { label: 'Job Position',              key: 'jobPositionName' },
  { label: 'Job Role',                  key: 'jobRoleName' },
  { label: 'Work Type',                 key: 'workTypeName' },
  { label: 'Shift',                     key: 'shiftName' },
  { label: 'Reporting Manager',         key: 'reportingManagerName' },
  { label: 'Branch / Company',          key: 'companyName' },
  { label: 'Work Email',                key: 'workEmail' },
  { label: 'Work Phone',                key: 'workPhone' },
  { label: 'Qualification',             key: 'qualification' },
  { label: 'Experience (years)',         key: 'experience' },
  { label: 'Children',                  key: 'children' },
  { label: 'Permanent Address',         key: 'permanentAddress' },
  { label: 'Current Address',           key: 'currentAddress' },
  { label: 'Country',                   key: 'country' },
  { label: 'State',                     key: 'state' },
  { label: 'City',                      key: 'city' },
  { label: 'ZIP Code',                  key: 'zip' },
  { label: 'Emergency Contact',         key: 'emergencyContactName' },
  { label: 'Emergency Contact Phone',   key: 'emergencyContact' },
  { label: 'Emergency Contact Relation',key: 'emergencyContactRelation' },
]

export default function MyProfilePage() {
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    api.get('/ess/me')
      .then(res => setProfile(res.data))
      .catch(err => {
        if (err.response?.status !== 404) {
          toast.error('Failed to load profile')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const openEdit = () => setModalOpen(true)

  // Reset form after modal mounts so all fields exist in the DOM before values are set.
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
        companyId:    profile.companyId,
        departmentId: profile.departmentId,
        isActive:     profile.isActive,
        // Handle empty strings for enum/date fields — backend rejects "" as LocalDate or Enum
        gender:       data.gender || undefined,
        maritalStatus: data.maritalStatus || undefined,
        dateOfBirth:  data.dateOfBirth || undefined,
        // Coerce number inputs
        experience:   data.experience !== '' && data.experience != null ? Number(data.experience) : undefined,
        children:     data.children !== '' && data.children != null ? Number(data.children) : undefined,
      })
      setProfile(res.data)
      setModalOpen(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!profile) return <p className="text-gray-500 p-6">No employee profile linked to your account.</p>

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Your personal employee record"
        actions={<Button onClick={openEdit}>Edit Profile</Button>}
      />

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex items-center gap-5">
        <Avatar name={profile.fullName || profile.firstName} size="lg" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{profile.fullName || '—'}</h2>
          <p className="text-sm text-gray-500">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              label={profile.isActive ? 'Active' : 'Inactive'}
              variant={profile.isActive ? 'success' : 'danger'}
            />
            {profile.employeeType && (
              <Badge label={profile.employeeType.replace(/_/g, ' ')} variant="secondary" />
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {FIELDS.map(({ label, key, format }) => {
            const value = profile[key]
            const display = (value != null && value !== '') ? (format ? format(value) : value) : '—'
            return (
              <div key={key}>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
                <dd className="text-sm text-gray-900">{display}</dd>
              </div>
            )
          })}
        </dl>
      </div>

      {/* Edit Modal */}
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
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" error={errors.firstName?.message} {...register('firstName', { required: 'Required' })} />
            <Input label="Last Name" {...register('lastName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" {...register('phone')} />
            <Input label="Nationality" {...register('nationality')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Gender" options={[{ value: '', label: 'Select...' }, ...GENDERS]} {...register('gender')} />
            <Select label="Marital Status" options={[{ value: '', label: 'Select...' }, ...MARITAL_STATUSES]} {...register('maritalStatus')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
            <Input label="Qualification" {...register('qualification')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Experience (years)" type="number" {...register('experience')} />
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
          <div className="grid grid-cols-2 gap-3">
            <Input label="ZIP Code" {...register('zip')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country of Birth" {...register('countryOfBirth')} />
            <Input label="Place of Birth" {...register('placeOfBirth')} />
          </div>

          {/* Emergency contact */}
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
