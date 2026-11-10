import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Button from '../../components/common/Button'
import { createLetter, updateLetter } from './documentsSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from '../employees/employeesSlice'
import useAuth from '../../hooks/useAuth'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'AED', label: 'AED (د.إ)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'SAR', label: 'SAR (﷼)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
]

const FREQUENCY_OPTIONS = [
  { value: 'Per Annum', label: 'Per Annum (Yearly)' },
  { value: 'Per Month', label: 'Per Month' },
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'Full-Time', label: 'Full-Time' },
  { value: 'Part-Time', label: 'Part-Time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Internship', label: 'Internship' },
]

const CONDUCT_OPTIONS = [
  { value: 'Exemplary', label: 'Exemplary' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Very Good', label: 'Very Good' },
  { value: 'Good', label: 'Good' },
  { value: 'Satisfactory', label: 'Satisfactory' },
]

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft (Under Review)' },
  { value: 'ISSUED', label: 'Issued (Official)' },
]

export default function LetterFormModal({ open, onClose, initialType = 'OFFER_LETTER', editTarget = null, onSuccess }) {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const employees = useSelector(selectEmployees)
  const [letterType, setLetterType] = useState(initialType)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      currency: 'USD',
      salaryFrequency: 'Per Annum',
      employmentType: 'Full-Time',
      probationPeriod: '3 Months',
      noticePeriod: '30 Days',
      conduct: 'Excellent',
      status: 'ISSUED',
      duesCleared: true,
      issueDate: new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    if (open) {
      dispatch(fetchEmployees({ page: 0, size: 200 }))
    }
  }, [open, dispatch])

  useEffect(() => {
    if (open) {
      if (editTarget) {
        setLetterType(editTarget.letterType)
        reset({
          letterType: editTarget.letterType,
          title: editTarget.title || '',
          referenceNumber: editTarget.referenceNumber || '',
          issueDate: editTarget.issueDate || new Date().toISOString().split('T')[0],
          status: editTarget.status || 'DRAFT',
          recipientName: editTarget.recipientName || '',
          recipientEmail: editTarget.recipientEmail || '',
          recipientPhone: editTarget.recipientPhone || '',
          recipientAddress: editTarget.recipientAddress || '',
          designation: editTarget.designation || '',
          department: editTarget.department || '',
          workLocation: editTarget.workLocation || '',
          joiningDate: editTarget.joiningDate || '',
          relievingDate: editTarget.relievingDate || '',
          resignationDate: editTarget.resignationDate || '',
          salary: editTarget.salary != null ? String(editTarget.salary) : '',
          currency: editTarget.currency || 'USD',
          salaryFrequency: editTarget.salaryFrequency || 'Per Annum',
          employmentType: editTarget.employmentType || 'Full-Time',
          probationPeriod: editTarget.probationPeriod || '3 Months',
          noticePeriod: editTarget.noticePeriod || '30 Days',
          acceptanceDeadline: editTarget.acceptanceDeadline || '',
          signatoryName: editTarget.signatoryName || user?.name || '',
          signatoryDesignation: editTarget.signatoryDesignation || 'Human Resources Manager',
          conduct: editTarget.conduct || 'Excellent',
          dutiesAndPerformance: editTarget.dutiesAndPerformance || '',
          duesCleared: editTarget.duesCleared !== false,
          customTerms: editTarget.customTerms || '',
          employeeId: editTarget.employee?.id ? String(editTarget.employee.id) : '',
        })
      } else {
        setLetterType(initialType)
        reset({
          currency: 'USD',
          salaryFrequency: 'Per Annum',
          employmentType: 'Full-Time',
          probationPeriod: '3 Months',
          noticePeriod: '30 Days',
          conduct: 'Excellent',
          status: 'ISSUED',
          duesCleared: true,
          issueDate: new Date().toISOString().split('T')[0],
          signatoryName: user?.name || 'Authorized Signatory',
          signatoryDesignation: 'Human Resources Manager',
        })
      }
    }
  }, [open, editTarget, initialType, reset, user])

  // Handle auto-fill when selecting an employee
  const handleEmployeeSelect = (empId) => {
    if (!empId) return
    const emp = employees.find((e) => String(e.id) === String(empId))
    if (!emp) return

    setValue('employeeId', String(emp.id))
    setValue('recipientName', `${emp.firstName || ''} ${emp.lastName || ''}`.trim())
    setValue('recipientEmail', emp.email || emp.workEmail || '')
    setValue('recipientPhone', emp.phone || emp.workPhone || '')
    setValue('designation', emp.jobPosition?.name || emp.jobRole?.name || '')
    setValue('department', emp.department?.name || '')
    setValue('workLocation', emp.city ? `${emp.city}, ${emp.country || ''}`.trim() : '')
    if (emp.dateJoining) {
      setValue('joiningDate', emp.dateJoining)
    }
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        letterType,
        salary: data.salary ? parseFloat(data.salary) : null,
        company: { id: user?.companyId },
        employee: data.employeeId ? { id: Number(data.employeeId) } : null,
        duesCleared: data.duesCleared === true || data.duesCleared === 'true',
      }

      if (editTarget) {
        await dispatch(updateLetter({ id: editTarget.id, ...payload })).unwrap()
        toast.success('Document updated successfully')
      } else {
        await dispatch(createLetter(payload)).unwrap()
        toast.success(`${getTypeTitle(letterType)} created successfully`)
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(err || 'Failed to save document')
    } finally {
      setSubmitting(false)
    }
  }

  function getTypeTitle(type) {
    switch (type) {
      case 'OFFER_LETTER': return 'Offer Letter'
      case 'EXPERIENCE_CERTIFICATE': return 'Experience Certificate'
      case 'RELIEVING_LETTER': return 'Relieving Letter'
      default: return 'HR Document'
    }
  }

  const typeConfig = {
    OFFER_LETTER: {
      title: 'Offer Letter',
      icon: '💼',
      description: 'Formal employment offer with compensation, terms, probation, and reporting details.',
    },
    EXPERIENCE_CERTIFICATE: {
      title: 'Experience Certificate',
      icon: '🎓',
      description: 'Official service certificate detailing employment tenure, role, and conduct.',
    },
    RELIEVING_LETTER: {
      title: 'Relieving Letter',
      icon: '📄',
      description: 'Formal relief order confirming acceptance of resignation and clearance of all dues.',
    },
  }

  const employeeOptions = [
    { value: '', label: '-- Select Employee to Auto-Fill Details --' },
    ...employees.map((e) => ({
      value: String(e.id),
      label: `${e.firstName || ''} ${e.lastName || ''} (${e.badgeId || 'No ID'}) - ${e.jobPosition?.name || 'Staff'}`,
    })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editTarget ? `Edit ${getTypeTitle(letterType)}` : `Create ${getTypeTitle(letterType)}`}
      size="2xl"
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={submitting}>
            {editTarget ? 'Update Document' : 'Generate Document'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Type Selector (Only in Create Mode) */}
        {!editTarget && (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Document Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.entries(typeConfig).map(([key, config]) => {
                const isSelected = letterType === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setLetterType(key)
                      setValue('title', '')
                    }}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-900 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                      <span>{config.icon}</span>
                      <span>{config.title}</span>
                    </div>
                    <span className="text-xs text-gray-500 leading-snug">
                      {config.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Employee Selector for Experience / Relieving Letters */}
        {(letterType === 'EXPERIENCE_CERTIFICATE' || letterType === 'RELIEVING_LETTER') && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Select Existing Employee
              </span>
              <span className="text-2xs text-amber-700">Auto-fills employee details below</span>
            </div>
            <select
              className="block w-full rounded-lg border border-amber-300 bg-white py-2 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 shadow-2xs"
              value={watch('employeeId') || ''}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
            >
              {employeeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Section 1: Recipient Information */}
        <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            {letterType === 'OFFER_LETTER' ? 'Candidate Details' : 'Employee Details'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name"
              placeholder="e.g. Sarah Connor"
              error={errors.recipientName?.message}
              {...register('recipientName', { required: 'Full name is required' })}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="sarah.connor@example.com"
              error={errors.recipientEmail?.message}
              {...register('recipientEmail', { required: 'Email address is required' })}
            />

            <Input
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              {...register('recipientPhone')}
            />

            <Input
              label="Work Location / Branch"
              placeholder="Headquarters / Hybrid"
              {...register('workLocation')}
            />
          </div>

          {letterType === 'OFFER_LETTER' && (
            <Input
              label="Residential Address"
              placeholder="Candidate's current residential address"
              {...register('recipientAddress')}
            />
          )}
        </div>

        {/* Section 2: Position & Department */}
        <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Position & Department
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Designation / Job Title"
              placeholder="e.g. Senior Software Engineer"
              error={errors.designation?.message}
              {...register('designation', { required: 'Designation is required' })}
            />

            <Input
              label="Department"
              placeholder="e.g. Information Technology"
              {...register('department')}
            />
          </div>
        </div>

        {/* Section 3: Document Specific Fields */}
        {letterType === 'OFFER_LETTER' && (
          <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Offer & Compensation Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Compensation Amount"
                type="number"
                step="0.01"
                placeholder="e.g. 95000"
                error={errors.salary?.message}
                {...register('salary', { required: 'Salary amount is required' })}
              />

              <Select
                label="Currency"
                options={CURRENCY_OPTIONS}
                {...register('currency')}
              />

              <Select
                label="Frequency"
                options={FREQUENCY_OPTIONS}
                {...register('salaryFrequency')}
              />

              <Select
                label="Employment Type"
                options={EMPLOYMENT_TYPE_OPTIONS}
                {...register('employmentType')}
              />

              <Input
                label="Expected Joining Date"
                type="date"
                error={errors.joiningDate?.message}
                {...register('joiningDate', { required: 'Joining date is required' })}
              />

              <Input
                label="Acceptance Deadline"
                type="date"
                {...register('acceptanceDeadline')}
              />

              <Input
                label="Probation Period"
                placeholder="e.g. 3 Months"
                {...register('probationPeriod')}
              />

              <Input
                label="Notice Period"
                placeholder="e.g. 30 Days"
                {...register('noticePeriod')}
              />
            </div>
          </div>
        )}

        {letterType === 'EXPERIENCE_CERTIFICATE' && (
          <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Tenure & Evaluation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Date of Joining"
                type="date"
                error={errors.joiningDate?.message}
                {...register('joiningDate', { required: 'Joining date is required' })}
              />

              <Input
                label="Date of Relieving"
                type="date"
                error={errors.relievingDate?.message}
                {...register('relievingDate', { required: 'Relieving date is required' })}
              />

              <Select
                label="Conduct / Character Rating"
                options={CONDUCT_OPTIONS}
                {...register('conduct')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Duties & Performance Remarks (Optional)
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-xl border border-gray-300 shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 bg-white"
                placeholder="Brief summary of achievements, roles, and exemplary conduct..."
                {...register('dutiesAndPerformance')}
              />
            </div>
          </div>
        )}

        {letterType === 'RELIEVING_LETTER' && (
          <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Relieving & Clearance Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Date of Joining"
                type="date"
                {...register('joiningDate')}
              />

              <Input
                label="Resignation Tendered Date"
                type="date"
                {...register('resignationDate')}
              />

              <Input
                label="Official Relieving Date"
                type="date"
                error={errors.relievingDate?.message}
                {...register('relievingDate', { required: 'Relieving date is required' })}
              />
            </div>

            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="duesCleared"
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                {...register('duesCleared')}
              />
              <label htmlFor="duesCleared" className="text-xs font-medium text-gray-800 cursor-pointer">
                Confirm that all company assets have been returned and all full & final dues are fully settled.
              </label>
            </div>
          </div>
        )}

        {/* Section 4: Signatory & Custom Clauses */}
        <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Signatory & Issue Settings
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Issue Date"
              type="date"
              error={errors.issueDate?.message}
              {...register('issueDate', { required: 'Issue date is required' })}
            />

            <Input
              label="Signatory Name"
              placeholder="e.g. Alex Morgan"
              error={errors.signatoryName?.message}
              {...register('signatoryName', { required: 'Signatory name is required' })}
            />

            <Input
              label="Signatory Designation"
              placeholder="e.g. VP Human Resources"
              error={errors.signatoryDesignation?.message}
              {...register('signatoryDesignation', { required: 'Signatory designation is required' })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Input
              label="Reference Number (Auto-generated if empty)"
              placeholder="e.g. OL-2026-0001"
              {...register('referenceNumber')}
            />

            <Select
              label="Document Status"
              options={STATUS_OPTIONS}
              {...register('status')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Custom Terms / Additional Clauses (Optional)
            </label>
            <textarea
              rows={2}
              className="block w-full rounded-xl border border-gray-300 shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 bg-white"
              placeholder="Any specific company conditions, project handover notes, or clauses..."
              {...register('customTerms')}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
