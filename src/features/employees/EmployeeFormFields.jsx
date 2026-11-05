import { useEffect, useRef, useState } from 'react'
import { useWatch } from 'react-hook-form'
import api from '../../services/api'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'

const EMPLOYEE_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT',  label: 'Contract' },
  { value: 'INTERN',    label: 'Intern' },
]

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

const STATUS_OPTIONS = [
  { value: 'true',  label: 'Active' },
  { value: 'false', label: 'Archived' },
]

const ACCESS_SCOPE_OPTIONS = [
  { value: 'SELF',        label: 'Self (own records only)' },
  { value: 'DEPARTMENT',  label: 'Department' },
  { value: 'BRANCH',      label: 'Branch' },
  { value: 'HEAD_OFFICE', label: 'Head Office' },
  { value: 'ENTERPRISE',  label: 'Enterprise (all)' },
]

/**
 * Shared form fields for creating and editing an employee.
 *
 * Props:
 *   register, errors  — from react-hook-form
 *   isEdit            — true when editing an existing employee
 *   canSelectCompany  — show company dropdown (platform/enterprise admin)
 *   assignableRoles   — role options for create form
 *   companyOptions, departmentOptions, jobPositionOptions,
 *   jobRoleOptions, workTypeOptions, shiftOptions,
 *   reportingManagerOptions — dropdown option arrays
 */
export { EMPLOYEE_TYPES, GENDERS, MARITAL_STATUSES, STATUS_OPTIONS, ACCESS_SCOPE_OPTIONS }

export default function EmployeeFormFields({
  register,
  control,
  setValue,
  defaultCompanyId,
  errors,
  isEdit,
  canSelectCompany,
  assignableRoles = [],
  companyOptions = [],
  jobRoleOptions = [],
  workTypeOptions = [],
  shiftOptions = [],
  reportingManagerOptions = [],
  photoPreview = null,
  onPhotoChange,
  vertical = false,
}) {
  const photoInputRef = useRef()
  const watchedCompanyId = useWatch({ control, name: 'companyId' })
  const departmentId = useWatch({ control, name: 'departmentId' })
  const jobPositionId = useWatch({ control, name: 'jobPositionId' })
  const [jobRoleId, workTypeId, shiftId, reportingManagerId] = useWatch({
    control, name: ['jobRoleId', 'workTypeId', 'shiftId', 'reportingManagerId'],
  })
  const companyId = canSelectCompany ? watchedCompanyId : watchedCompanyId || defaultCompanyId
  const [setup, setSetup] = useState(null)
  useEffect(() => {
    if (!companyId) return
    let active = true
    api.get(`/companies/${companyId}/employee-setup`).then(({ data }) => {
      if (active) setSetup({ ...data, companyId: String(companyId) })
    }).catch(error => { if (active) setSetup({ companyId: String(companyId), error: error.response?.data?.message || 'Could not load departments and job positions' }) })
    return () => { active = false }
  }, [companyId])
  const currentSetup = setup?.companyId === String(companyId) ? setup : null
  const departmentOptions = (currentSetup?.departments || []).map(item => ({ value: item.id, label: item.name }))
  const jobPositionOptions = (currentSetup?.jobPositions || []).filter(item => String(item.departmentId) === String(departmentId)).map(item => ({ value: item.id, label: item.name }))
  const clearPosition = () => { setValue('jobPositionId', ''); setValue('jobRoleId', '') }


  return (
    <div className={`space-y-4 employee-form-fields ${vertical ? 'employee-form-fields-vertical' : ''}`}>

      {/* Photo picker */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-indigo-400 transition-colors"
          onClick={() => photoInputRef.current?.click()}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {photoPreview ? 'Change photo' : 'Upload photo'}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 5MB</p>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => onPhotoChange?.(e.target.files[0] || null)}
        />
      </div>

      {vertical && <div className="employee-form-section-label">Identity &amp; contact</div>}
      {/* Employee ID */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Employee ID"
          placeholder="Auto-generated if left blank"
          error={errors.badgeId?.message} {...register('badgeId')}
        />
        <Select
          label="Employment status"
          options={STATUS_OPTIONS}
          error={errors.isActive?.message} {...register('isActive')}
        />
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" error={errors.firstName?.message}
          {...register('firstName', { required: 'Enter the employee’s first name', setValueAs: value => value?.trim(), maxLength: { value: 255, message: 'First name must be at most 255 characters' } })} />
        <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <Input label={isEdit ? 'Email' : 'Email *'} type="email" error={errors.email?.message} {...register('email', {
          required: isEdit ? false : 'Email is required to create a login account',
          setValueAs: value => value?.trim(),
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
          maxLength: { value: 254, message: 'Email must be at most 254 characters' }
        })} />
        <Input label={isEdit ? 'Phone' : 'Phone *'} error={errors.phone?.message} {...register('phone', {
          required: isEdit ? false : 'Phone is required — it is used as the default login password'
        })} />
      </div>
      {!isEdit && (
        <p className="text-xs text-slate-500 -mt-1">
          📧 Email is used as the login username. &nbsp;🔑 Default login password = phone number (employee can change it after first login).
        </p>
      )}

      {vertical && <div className="employee-form-section-label">Personal details</div>}
      {/* Personal */}
      <div className="grid grid-cols-2 gap-3">
        <Select label="Gender"
          options={[{ value: '', label: 'Select...' }, ...GENDERS]}
          error={errors.gender?.message} {...register('gender')} />
        <Select label="Marital Status"
          options={[{ value: '', label: 'None' }, ...MARITAL_STATUSES]}
          error={errors.maritalStatus?.message} {...register('maritalStatus')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date of Birth" type="date" error={errors.dateOfBirth?.message} {...register('dateOfBirth', { validate: value => !value || value <= new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) || 'Date of birth cannot be in the future' })} />
        <Input label="Nationality" error={errors.nationality?.message} {...register('nationality')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Country of Birth" error={errors.countryOfBirth?.message} {...register('countryOfBirth')} />
        <Input label="Place of Birth" error={errors.placeOfBirth?.message} {...register('placeOfBirth')} />
      </div>

      {vertical && <div className="employee-form-section-label">Employment details</div>}
      {/* Work */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date of Joining" type="date" error={errors.dateJoining?.message} {...register('dateJoining')} />
        <Select label="Employee Type"
          options={[{ value: '', label: 'Select...' }, ...EMPLOYEE_TYPES]}
          error={errors.employeeType?.message} {...register('employeeType')} />
      </div>

      {/* Create-only: role, access scope, and full contract/salary fields */}
      {!isEdit && (
        <>
          {vertical && <div className="employee-form-section-label">Access &amp; compensation</div>}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role"
              options={[{ value: '', label: 'None' }, ...assignableRoles]}
              error={errors.role?.message} {...register('role')} />
            <Select label="Access Scope"
              options={[{ value: '', label: 'None' }, ...ACCESS_SCOPE_OPTIONS]}
              error={errors.accessScope?.message} {...register('accessScope')} />
          </div>

          {/* Salary / Contract */}
          <div className="pt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Salary &amp; Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Wage Type"
                options={[
                  { value: 'MONTHLY', label: 'Monthly' },
                  { value: 'HOURLY',  label: 'Hourly' },
                  { value: 'DAILY',   label: 'Daily' },
                ]}
                error={errors.wageType?.message} {...register('wageType')}
              />
              <Input label="Contract End Date" type="date" error={errors.contractEndDate?.message} {...register('contractEndDate')} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input label="Basic Pay" type="number" placeholder="e.g. 5000" error={errors.basicPay?.message} {...register('basicPay', { min: { value: 0, message: 'Amount cannot be negative' } })} />
              <Input label="Housing Allowance" type="number" placeholder="e.g. 1000" error={errors.housingAllowance?.message} {...register('housingAllowance', { min: { value: 0, message: 'Amount cannot be negative' } })} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input label="Transport Allowance" type="number" placeholder="e.g. 500" error={errors.transportAllowance?.message} {...register('transportAllowance', { min: { value: 0, message: 'Amount cannot be negative' } })} />
              <Input label="Other Allowance" type="number" placeholder="e.g. 200" error={errors.otherAllowance?.message} {...register('otherAllowance', { min: { value: 0, message: 'Amount cannot be negative' } })} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input label="Total Salary" type="number" placeholder="Sum of all components" error={errors.totalSalary?.message} {...register('totalSalary', { min: { value: 0, message: 'Amount cannot be negative' } })} />
              <Input label="Salary Per Hour" type="number" placeholder="e.g. 25" error={errors.salaryPerHour?.message} {...register('salaryPerHour', { min: { value: 0, message: 'Amount cannot be negative' } })} />
            </div>
          </div>
        </>
      )}

      {/* Company (platform/enterprise admin only) — placeholder is required, not cosmetic:
          without it a <select> with no matching option silently renders as whichever
          company happens to be first in the list, which would defeat the "no default"
          guard in EmployeesPage and could submit the wrong company without any visible
          sign that nothing was actually chosen. */}
      {canSelectCompany && (
        <Select label="Branch / Company"
          value={companyId ?? ''} options={companyOptions}
          placeholder="Select organization / branch..."
          error={errors.companyId?.message}
          {...register('companyId', { required: 'Select the employee’s company', onChange: () => { setValue('departmentId', ''); clearPosition() } })} />
      )}

      {vertical && <div className="employee-form-section-label">Team &amp; reporting</div>}
      {/* Org structure */}
      {currentSetup?.industryLabel && <p className="text-xs font-medium text-slate-600">Organization type: {currentSetup.industryLabel}</p>}
      <Select label="Department"
        value={departmentId ?? ''}
        options={[{ value: '', label: 'None' }, ...departmentOptions]}
        disabled={!companyId || !currentSetup || !!currentSetup.error}
        error={errors.departmentId?.message} {...register('departmentId', { onChange: clearPosition })} />
      <Select label="Job Position"
        value={jobPositionId ?? ''}
        options={[{ value: '', label: departmentId ? 'Select job position...' : 'Select a department first' }, ...jobPositionOptions]}
        disabled={!departmentId || !currentSetup || !!currentSetup.error}
        error={errors.jobPositionId?.message} {...register('jobPositionId', { onChange: () => setValue('jobRoleId', '') })} />
      {currentSetup?.error && <p role="alert" className="text-sm text-red-600">{currentSetup.error}</p>}
      <p className="text-xs text-slate-500">Standard and custom positions for the selected company are available under their department.</p>
      <Select label="Job Role"
        value={jobRoleId ?? ''}
        options={[{ value: '', label: jobPositionId ? 'Select job role...' : 'Select a job position first' }, ...jobRoleOptions.filter(role => String(role.jobPositionId) === String(jobPositionId))]}
        disabled={!jobPositionId}
        {...register('jobRoleId')} />
      <Select label="Work Type"
        value={workTypeId ?? ''}
        options={[{ value: '', label: 'None' }, ...workTypeOptions]}
        error={errors.workTypeId?.message} {...register('workTypeId')} />
      <Select label="Shift"
        value={shiftId ?? ''}
        options={[{ value: '', label: 'None' }, ...shiftOptions]}
        error={errors.shiftId?.message} {...register('shiftId')} />
      <Select label="Reporting Manager"
        value={reportingManagerId ?? ''}
        options={[{ value: '', label: 'None' }, ...reportingManagerOptions]}
        error={errors.reportingManagerId?.message} {...register('reportingManagerId')} />

      {vertical && <div className="employee-form-section-label">Professional background</div>}
      {/* Professional */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Qualification" error={errors.qualification?.message} {...register('qualification')} />
        <Input label="Experience (years)" type="number" error={errors.experience?.message} {...register('experience', { min: { value: 0, message: 'Experience cannot be negative' } })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Children" type="number" error={errors.children?.message} {...register('children', { min: { value: 0, message: 'Number of children cannot be negative' } })} />
      </div>

      {vertical && <div className="employee-form-section-label">Work &amp; emergency contact</div>}
      {/* Work contact */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Work Email" type="email" error={errors.workEmail?.message} {...register('workEmail', { setValueAs: value => value?.trim(), pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid work email address' }, maxLength: { value: 254, message: 'Work email must be at most 254 characters' } })} />
        <Input label="Work Phone" error={errors.workPhone?.message} {...register('workPhone')} />
      </div>

      {/* Address */}
      <Input label="Permanent Address" error={errors.permanentAddress?.message} {...register('permanentAddress')} />
      <Input label="Current Address" error={errors.currentAddress?.message} {...register('currentAddress')} />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Country" error={errors.country?.message} {...register('country')} />
        <Input label="State" error={errors.state?.message} {...register('state')} />
        <Input label="City" error={errors.city?.message} {...register('city')} />
      </div>
      <Input label="ZIP Code" error={errors.zip?.message} {...register('zip')} />

      {/* Emergency contact */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Emergency Contact Name" error={errors.emergencyContactName?.message} {...register('emergencyContactName')} />
        <Input label="Emergency Contact Number" error={errors.emergencyContact?.message} {...register('emergencyContact')} />
      </div>
      <Input label="Emergency Contact Relation" error={errors.emergencyContactRelation?.message} {...register('emergencyContactRelation')} />
    </div>
  )
}
