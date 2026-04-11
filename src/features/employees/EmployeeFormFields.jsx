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
}) {
  return (
    <div className="space-y-4">

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

      {/* Create-only: password + role + basic pay */}
      {!isEdit && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Password" type="password" error={errors.password?.message}
              {...register('password', { required: 'Required' })} />
            <Input label="Confirm Password" type="password" error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Required',
                validate: (val, formValues) => val === formValues.password || 'Passwords do not match',
              })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role"
              options={[{ value: '', label: 'None' }, ...assignableRoles]}
              {...register('role')} />
            <Select label="Access Scope"
              options={[{ value: '', label: 'None' }, ...ACCESS_SCOPE_OPTIONS]}
              {...register('accessScope')} />
          </div>
          <Input
            label="Basic Pay (Monthly)"
            type="number"
            placeholder="e.g. 5000"
            {...register('basicPay')}
          />
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
