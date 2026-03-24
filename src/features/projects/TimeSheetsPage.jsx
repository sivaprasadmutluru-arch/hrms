import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchTimesheets, createTimesheet, deleteTimesheet,
  selectTimesheets, selectLoading
} from './projectsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function TimeSheetsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const timesheets = useSelector(selectTimesheets)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchTimesheets()) }, [dispatch])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this timesheet entry?')) return
    try { await dispatch(deleteTimesheet(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(createTimesheet({
        ...data,
        hours: Number(data.hours),
        employee: { id: Number(data.employeeId) },
        task: data.taskId ? { id: Number(data.taskId) } : null,
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Timesheet entry added')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => getValue() || '—' },
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { id: 'task', header: 'Task', cell: ({ row }) => row.original.task?.title || `#${row.original.task?.id}` || '—' },
    { accessorKey: 'hours', header: 'Hours', cell: ({ getValue }) => getValue() ? `${getValue()}h` : '—' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block">{getValue() || '—'}</span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Timesheets" subtitle="Employee time log per task"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ Log Time</Button>} />
      <DataTable columns={columns} data={timesheets} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Time"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Save</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Task ID" {...register('taskId')} />
          <Input label="Date" type="date" error={errors.date?.message} {...register('date', { required: 'Required' })} />
          <Input label="Hours" type="number" step="0.25" error={errors.hours?.message} {...register('hours', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
