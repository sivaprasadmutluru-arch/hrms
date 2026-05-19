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

function defaultValues(lt) {
  return {
    name: lt?.name || '',
    totalDays: lt?.totalDays ?? '',
    paymentType: lt?.paymentType || 'PAID',
    carryforwardType: lt?.carryforwardType || 'NO_CARRYFORWARD',
    leaveValidationType: lt?.leaveValidationType || 'AUTOMATIC',
    isActive: lt ? String(lt.isActive !== false) : 'true',
    applicableEmployeeTypeIds: lt?.applicableEmployeeTypeIds?.map(String) || [],
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

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm()

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
    const payload = {
      name: data.name,
      totalDays: data.totalDays !== '' ? Number(data.totalDays) : null,
      paymentType: data.paymentType,
      carryforwardType: data.carryforwardType,
      leaveValidationType: data.leaveValidationType,
      isActive: data.isActive === 'true',
      applicableEmployeeTypes: (data.applicableEmployeeTypeIds || []).map(id => ({ id: Number(id) })),
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
