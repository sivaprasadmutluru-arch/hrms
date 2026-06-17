import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import {
  fetchLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
  selectLeaveTypes, selectLoading,
} from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import useAuth from '../../hooks/useAuth'

const PAYMENT_OPTIONS = [
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
]

const CARRYFORWARD_OPTIONS = [
  { value: 'NO_CARRYFORWARD', label: 'No Carry Forward' },
  { value: 'CARRYFORWARD', label: 'Yes – Carry Forward' },
  { value: 'CARRYFORWARD_EXPIRE', label: 'Yes – With Expiry' },
]

const APPROVAL_OPTIONS = [
  { value: 'AUTOMATIC', label: 'Not Required (Automatic)' },
  { value: 'MANAGER_VALIDATION', label: 'Required – Manager Approval' },
  { value: 'HR_VALIDATION', label: 'Required – HR Approval' },
]

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const PAYMENT_BADGE = { PAID: 'success', UNPAID: 'warning' }

const EXPIRE_PERIOD_OPTIONS = [
  { value: 'day', label: 'Day(s)' },
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
]

const RESET_BASED_OPTIONS = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
]

const RESET_MONTH_OPTIONS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

const RESET_DAY_OPTIONS = [
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
  { value: 'last day', label: 'Last day' },
]

const RESET_WEEKDAY_OPTIONS = [
  { value: '0', label: 'Monday' }, { value: '1', label: 'Tuesday' },
  { value: '2', label: 'Wednesday' }, { value: '3', label: 'Thursday' },
  { value: '4', label: 'Friday' }, { value: '5', label: 'Saturday' },
  { value: '6', label: 'Sunday' },
]

function defaultValues(lt) {
  return {
    name: lt?.name || '',
    totalDays: lt?.totalDays ?? '',
    paymentType: lt?.paymentType || 'PAID',
    carryforwardType: lt?.carryforwardType || 'NO_CARRYFORWARD',
    carryforwardMax: lt?.carryforwardMax ?? '',
    carryforwardExpireIn: lt?.carryforwardExpireIn ?? '',
    carryforwardExpirePeriod: lt?.carryforwardExpirePeriod || 'month',
    carryforwardExpireDate: lt?.carryforwardExpireDate || '',
    leaveValidationType: lt?.leaveValidationType || 'AUTOMATIC',
    isActive: lt ? String(lt.isActive !== false) : 'true',
    applicableEmployeeTypeIds: lt?.applicableEmployeeTypeIds?.map(String) || [],
    accrualEnabled: lt?.accrualEnabled || false,
    midYearJoinerMode: lt?.midYearJoinerMode || 'MANUAL',
    negativeBalanceAllowed: lt?.negativeBalanceAllowed || false,
    negativeBalanceLimit: lt?.negativeBalanceLimit ?? '',
    reset: lt?.reset || false,
    resetBased: lt?.resetBased || 'yearly',
    resetMonth: lt?.resetMonth || '1',
    resetDay: lt?.resetDay || '1',
    resetWeekend: lt?.resetWeekend || '0',
  }
}

export default function LeaveTypesPage() {
  const dispatch = useDispatch()
  const { isHRManager, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin } = useAuth()
  const leaveTypes = useSelector(selectLeaveTypes)
  const loading = useSelector(selectLoading)

  const [employeeTypes, setEmployeeTypes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const canManage = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    dispatch(fetchLeaveTypes())
    api.get('/employee-types').then(r => setEmployeeTypes(r.data || [])).catch(() => {})
  }, [dispatch])

  const openAdd = () => {
    setEditTarget(null)
    reset(defaultValues(null))
    setModalOpen(true)
  }

  const openEdit = (lt) => {
    setEditTarget(lt)
    reset(defaultValues(lt))
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    const hasCF = data.carryforwardType !== 'NO_CARRYFORWARD'
    const hasExpiry = data.carryforwardType === 'CARRYFORWARD_EXPIRE'
    const resetEnabled = data.reset === true || data.reset === 'true'
    const payload = {
      name: data.name,
      totalDays: data.totalDays !== '' ? Number(data.totalDays) : null,
      paymentType: data.paymentType,
      carryforwardType: data.carryforwardType,
      carryforwardMax: hasCF && data.carryforwardMax !== '' ? Number(data.carryforwardMax) : null,
      carryforwardExpireIn: hasExpiry && data.carryforwardExpireIn !== '' ? Number(data.carryforwardExpireIn) : null,
      carryforwardExpirePeriod: hasExpiry && data.carryforwardExpireIn !== '' ? data.carryforwardExpirePeriod : null,
      carryforwardExpireDate: hasExpiry && data.carryforwardExpireDate ? data.carryforwardExpireDate : null,
      leaveValidationType: data.leaveValidationType,
      isActive: data.isActive === 'true',
      applicableEmployeeTypes: (data.applicableEmployeeTypeIds || []).map(id => ({ id: Number(id) })),
      accrualEnabled: data.accrualEnabled,
      midYearJoinerMode: data.midYearJoinerMode || 'MANUAL',
      negativeBalanceAllowed: data.negativeBalanceAllowed,
      negativeBalanceLimit: data.negativeBalanceAllowed && data.negativeBalanceLimit !== '' ? Number(data.negativeBalanceLimit) : null,
      reset: resetEnabled,
      resetBased: resetEnabled ? data.resetBased : null,
      resetMonth: resetEnabled && data.resetBased === 'yearly' ? data.resetMonth : null,
      resetDay: resetEnabled && data.resetBased !== 'weekly' ? data.resetDay : null,
      resetWeekend: resetEnabled && data.resetBased === 'weekly' ? data.resetWeekend : null,
    }
    try {
      if (editTarget) {
        await dispatch(updateLeaveType({ id: editTarget.id, data: payload })).unwrap()
        toast.success('Leave type updated')
      } else {
        await dispatch(createLeaveType(payload)).unwrap()
        toast.success('Leave type created')
      }
      setModalOpen(false)
    } catch (e) {
      toast.error(e || 'Failed to save leave type')
    }
  }

  const confirmDelete = async () => {
    try {
      await dispatch(deleteLeaveType(deleteTarget.id)).unwrap()
      toast.success('Leave type deleted')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e || 'Failed to delete leave type')
    }
  }

  const columns = [
    {
      id: 'name',
      header: 'Leave Type',
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>,
    },
    {
      id: 'totalDays',
      header: 'Days Allowed',
      cell: ({ row }) => row.original.totalDays != null ? row.original.totalDays : '—',
    },
    {
      id: 'paymentType',
      header: 'Paid / Unpaid',
      cell: ({ row }) => (
        <Badge label={row.original.paymentType} variant={PAYMENT_BADGE[row.original.paymentType] || 'default'} />
      ),
    },
    {
      id: 'applicableCategories',
      header: 'Employee Category',
      cell: ({ row }) => {
        const names = row.original.applicableEmployeeTypeNames || []
        return names.length ? names.join(', ') : <span className="text-gray-400">All</span>
      },
    },
    {
      id: 'carryforwardType',
      header: 'Carry Forward',
      cell: ({ row }) => {
        const cf = row.original.carryforwardType
        const label = cf === 'NO_CARRYFORWARD' ? 'No' : cf === 'CARRYFORWARD' ? 'Yes' : 'Yes (Expiry)'
        const variant = cf === 'NO_CARRYFORWARD' ? 'default' : 'info'
        return <Badge label={label} variant={variant} />
      },
    },
    {
      id: 'approval',
      header: 'Approval',
      cell: ({ row }) => {
        const v = row.original.leaveValidationType
        const label = v === 'AUTOMATIC' ? 'Not Required' : v === 'MANAGER_VALIDATION' ? 'Manager' : 'HR'
        const variant = v === 'AUTOMATIC' ? 'default' : 'warning'
        return <Badge label={label} variant={variant} />
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          label={row.original.isActive !== false ? 'Active' : 'Inactive'}
          variant={row.original.isActive !== false ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => canManage ? (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        </div>
      ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Leave Types"
        subtitle="Define the types of leave available to employees"
        actions={canManage && <Button onClick={openAdd}>+ Add Leave Type</Button>}
      />

      <DataTable columns={columns} data={leaveTypes} loading={loading} />

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Leave Type' : 'Add Leave Type'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Leave Type Name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />

          <Input
            label="Number of Days Allowed"
            type="number"
            step="0.5"
            placeholder="e.g. 12"
            {...register('totalDays')}
          />

          <Select
            label="Paid or Unpaid"
            options={PAYMENT_OPTIONS}
            {...register('paymentType')}
          />

          {/* Applicable Employee Category — multi-checkbox */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Applicable Employee Category
              <span className="ml-1 text-xs text-gray-400 font-normal">(leave blank for all)</span>
            </label>
            {employeeTypes.length === 0 ? (
              <p className="text-sm text-gray-400">No employee categories configured.</p>
            ) : (
              <Controller
                name="applicableEmployeeTypeIds"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {employeeTypes.map(et => {
                      const checked = (field.value || []).includes(String(et.id))
                      return (
                        <label key={et.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={checked}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...(field.value || []), String(et.id)]
                                : (field.value || []).filter(v => v !== String(et.id))
                              field.onChange(next)
                            }}
                          />
                          {et.name}
                        </label>
                      )
                    })}
                  </div>
                )}
              />
            )}
          </div>

          <Select
            label="Carry Forward"
            options={CARRYFORWARD_OPTIONS}
            {...register('carryforwardType')}
          />

          {watch('carryforwardType') !== 'NO_CARRYFORWARD' && (
            <Input
              label="Max Carry Forward Days"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 5"
              {...register('carryforwardMax')}
            />
          )}

          {watch('carryforwardType') === 'CARRYFORWARD_EXPIRE' && (
            <div className="space-y-3 pl-3 border-l-2 border-indigo-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry Configuration</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Expires After"
                    type="number"
                    min="1"
                    placeholder="e.g. 3"
                    {...register('carryforwardExpireIn')}
                  />
                </div>
                <div className="flex-1">
                  <Select
                    label="Period"
                    options={EXPIRE_PERIOD_OPTIONS}
                    {...register('carryforwardExpirePeriod')}
                  />
                </div>
              </div>
              <Input
                label="Fixed Expiry Date (optional)"
                type="date"
                {...register('carryforwardExpireDate')}
              />
            </div>
          )}

          <Select
            label="Approval Required"
            options={APPROVAL_OPTIONS}
            {...register('leaveValidationType')}
          />

          <Select
            label="Status"
            options={STATUS_OPTIONS}
            {...register('isActive')}
          />

          {/* Accrual Settings */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Accrual Settings</p>
            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
              <input type="checkbox" {...register('accrualEnabled')} />
              Enable monthly accrual (leave earned gradually, not upfront)
            </label>
            {watch('accrualEnabled') && (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Monthly rate = {watch('totalDays') ? (Math.round((Number(watch('totalDays')) / 12) * 10) / 10).toFixed(1) : '?'} days/month
                </p>
                <Select
                  label="Mid-year joiner mode"
                  options={[
                    { value: 'MANUAL', label: 'Manual (HR sets opening balance; skip joining month)' },
                    { value: 'AUTO_PRORATA', label: 'Auto pro-rata (system calculates joining month)' },
                  ]}
                  {...register('midYearJoinerMode')}
                />
              </>
            )}
            <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
              <input type="checkbox" {...register('negativeBalanceAllowed')} />
              Allow negative balance
            </label>
            {watch('negativeBalanceAllowed') && (
              <Input
                label="Max negative balance (days)"
                type="number"
                min="0"
                step="0.5"
                className="mt-2"
                {...register('negativeBalanceLimit')}
              />
            )}
          </div>

          {/* Reset Settings */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Reset Settings</p>
            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
              <input type="checkbox" {...register('reset')} />
              Enable automatic leave balance reset
            </label>
            {watch('reset') && (
              <div className="space-y-3 pl-3 border-l-2 border-orange-100">
                <Select
                  label="Reset frequency"
                  options={RESET_BASED_OPTIONS}
                  {...register('resetBased')}
                />

                {watch('resetBased') === 'yearly' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select label="Reset month" options={RESET_MONTH_OPTIONS} {...register('resetMonth')} />
                    </div>
                    <div className="flex-1">
                      <Select label="Reset day" options={RESET_DAY_OPTIONS} {...register('resetDay')} />
                    </div>
                  </div>
                )}

                {watch('resetBased') === 'monthly' && (
                  <Select label="Reset day of month" options={RESET_DAY_OPTIONS} {...register('resetDay')} />
                )}

                {watch('resetBased') === 'weekly' && (
                  <Select label="Reset day of week" options={RESET_WEEKDAY_OPTIONS} {...register('resetWeekend')} />
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Leave Type"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>?
          This cannot be undone and may affect existing leave allocations.
        </p>
      </Modal>
    </div>
  )
}
