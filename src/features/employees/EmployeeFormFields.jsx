import { useRef } from 'react'
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
  { value: 'false', label: 'Inactive' },
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
 *   badgeId           — current badge ID (shown read-only in edit mode)
 *   canSelectCompany  — show company dropdown (platform/enterprise admin)
 *   assignableRoles   — role options for create form
 *   companyOptions, departmentOptions, jobPositionOptions,
 *   jobRoleOptions, workTypeOptions, shiftOptions,
 *   reportingManagerOptions — dropdown option arrays
 */
export { EMPLOYEE_TYPES, GENDERS, MARITAL_STATUSES, STATUS_OPTIONS, ACCESS_SCOPE_OPTIONS }

export default function EmployeeFormFields({
  register,
  errors,
  isEdit,
  badgeId,
  canSelectCompany,
  assignableRoles = [],
  companyOptions = [],
  departmentOptions = [],
  jobPositionOptions = [],
  jobRoleOptions = [],
  workTypeOptions = [],
  shiftOptions = [],
  reportingManagerOptions = [],
  photoPreview = null,
  onPhotoChange,
}) {
  const photoInputRef = useRef()

  return (
    <div className="space-y-4">

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

      {/* Badge ID — read-only in edit, editable on create */}
      <div className="grid grid-cols-2 gap-3">
        {isEdit ? (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Badge ID</label>
            <input
              value={badgeId || '—'}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-500 cursor-not-allowed"
            />
          </div>
        ) : (
          <Input label="Badge ID" placeholder="Auto-generated if left blank" {...register('badgeId')} />
        )}
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          {...register('isActive')}
        />
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" error={errors.firstName?.message}
          {...register('firstName', { required: 'Required' })} />
        <Input label="Last Name" {...register('lastName')} />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Phone" {...register('phone')} />
      </div>

      {/* Personal */}
      <div className="grid grid-cols-2 gap-3">
        <Select label="Gender"
          options={[{ value: '', label: 'Select...' }, ...GENDERS]}
          {...register('gender')} />
        <Select label="Marital Status"
          options={[{ value: '', label: 'None' }, ...MARITAL_STATUSES]}
          {...register('maritalStatus')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
        <Input label="Nationality" {...register('nationality')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Country of Birth" {...register('countryOfBirth')} />
        <Input label="Place of Birth" {...register('placeOfBirth')} />
      </div>

      {/* Work */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date of Joining" type="date" {...register('dateJoining')} />
        <Select label="Employee Type"
          options={[{ value: '', label: 'Select...' }, ...EMPLOYEE_TYPES]}
          {...register('employeeType')} />
      </div>

      {/* Create-only: role, access scope, and full contract/salary fields */}
      {!isEdit && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role"
              options={[{ value: '', label: 'None' }, ...assignableRoles]}
              {...register('role')} />
            <Select label="Access Scope"
              options={[{ value: '', label: 'None' }, ...ACCESS_SCOPE_OPTIONS]}
              {...register('accessScope')} />
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
                {...register('wageType')}
              />
              <Input label="Contract End Date" type="date" {...register('contractEndDate')} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input label="Basic Pay" type="number" placeholder="e.g. 5000" {...register('basicPay')} />
              <Input label="Housing Allowance" type="number" placeholder="e.g. 1000" {...register('housingAllowance')} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input label="Transport Allowance" type="number" placeholder="e.g. 500" {...register('transportAllowance')} />
              <Input label="Other Allowance" type="number" placeholder="e.g. 200" {...register('otherAllowance')} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input label="Total Salary" type="number" placeholder="Sum of all components" {...register('totalSalary')} />
              <Input label="Salary Per Hour" type="number" placeholder="e.g. 25" {...register('salaryPerHour')} />
            </div>
          </div>
        </>
      )}

      {/* Company (platform/enterprise admin only) */}
      {canSelectCompany && (
        <Select label="Branch / Company" options={companyOptions}
          error={errors.companyId?.message}
          {...register('companyId', { required: 'Required' })} />
      )}

      {/* Org structure */}
      <Select label="Department"
        options={[{ value: '', label: 'None' }, ...departmentOptions]}
        {...register('departmentId')} />
      <Select label="Job Position"
        options={[{ value: '', label: 'None' }, ...jobPositionOptions]}
        {...register('jobPositionId')} />
      <Select label="Job Role"
        options={[{ value: '', label: 'None' }, ...jobRoleOptions]}
        {...register('jobRoleId')} />
      <Select label="Work Type"
        options={[{ value: '', label: 'None' }, ...workTypeOptions]}
        {...register('workTypeId')} />
      <Select label="Shift"
        options={[{ value: '', label: 'None' }, ...shiftOptions]}
        {...register('shiftId')} />
      <Select label="Reporting Manager"
        options={[{ value: '', label: 'None' }, ...reportingManagerOptions]}
        {...register('reportingManagerId')} />

      {/* Professional */}
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

      {/* Emergency contact */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Emergency Contact Name" {...register('emergencyContactName')} />
        <Input label="Emergency Contact Number" {...register('emergencyContact')} />
      </div>
      <Input label="Emergency Contact Relation" {...register('emergencyContactRelation')} />
    </div>
  )
}
