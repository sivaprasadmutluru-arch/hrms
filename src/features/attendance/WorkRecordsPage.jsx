import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchWorkRecords, createWorkRecord, updateWorkRecord, deleteWorkRecord,
  selectWorkRecords, selectWorkRecordsPagination, selectLoading
} from './attendanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

const RECORD_TYPES = [
  { value: 'FDP', label: 'Present (Full Day)' },
  { value: 'HDP', label: 'Half Day Present' },
  { value: 'ABS', label: 'Absent' },
  { value: 'HD', label: 'Holiday / Company Leave' },
  { value: 'CONF', label: 'Conflict' },
  { value: 'DFT', label: 'Draft' },
]

const TYPE_COLORS = {
  FDP: 'success', HDP: 'warning', ABS: 'danger', HD: 'info', CONF: 'accent', DFT: 'default'
}

export default function WorkRecordsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const records = useSelector(selectWorkRecords)
  const pagination = useSelector(selectWorkRecordsPagination)
  const loading = useSelector(selectLoading)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchWorkRecords({ page: 0, size: 20 }))
  }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    reset({
      recordName: r.recordName, workRecordType: r.workRecordType,
      date: r.date, atWork: r.atWork, minHour: r.minHour,
      note: r.note, dayPercentage: r.dayPercentage
    })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        employee: { id: data.employeeId },
        company: { id: user?.companyId },
      }
      if (editing) {
        await dispatch(updateWorkRecord({ id: editing.id, data: payload })).unwrap()
        toast.success('Work record updated')
      } else {
        await dispatch(createWorkRecord(payload)).unwrap()
        toast.success('Work record created')
      }
      setModalOpen(false)
      dispatch(fetchWorkRecords({ page: pagination.page, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this work record?')) return
    try { await dispatch(deleteWorkRecord(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'workRecordType', header: 'Status', cell: ({ getValue }) => {
      const v = getValue()
      const label = RECORD_TYPES.find(t => t.value === v)?.label || v || '—'
      return <Badge label={label} variant={TYPE_COLORS[v] || 'default'} />
    }},
    { accessorKey: 'atWork', header: 'At Work' },
    { accessorKey: 'minHour', header: 'Min Hour' },
    { accessorKey: 'dayPercentage', header: 'Day %', cell: ({ getValue }) => getValue() != null ? `${(getValue() * 100).toFixed(0)}%` : '—' },
    { accessorKey: 'note', header: 'Note', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="Work Records"
        subtitle="Daily work presence records per employee"
        actions={<Button onClick={openCreate}>+ New Record</Button>}
      />
      <DataTable columns={columns} data={records} loading={loading} />
      <Pagination
        page={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.size)}
        onPageChange={p => dispatch(fetchWorkRecords({ page: p, size: 20 }))}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Work Record' : 'New Work Record'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Employee ID" type="number" error={errors.employeeId?.message}
            {...register('employeeId', { required: 'Required' })} />
          <Select label="Record Type" options={RECORD_TYPES}
            error={errors.workRecordType?.message}
            {...register('workRecordType', { required: 'Required' })} />
          <Input label="Date" type="date" error={errors.date?.message}
            {...register('date', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="At Work (HH:MM)" placeholder="08:00" {...register('atWork')} />
            <Input label="Min Hour (HH:MM)" placeholder="08:00" {...register('minHour')} />
          </div>
          <Input label="Record Name" {...register('recordName')} />
          <Input label="Day Percentage (0-1)" type="number" step="0.01" {...register('dayPercentage')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('note')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
