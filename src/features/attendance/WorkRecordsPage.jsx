import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchWorkRecords, 
  createWorkRecord, 
  updateWorkRecord, 
  deleteWorkRecord,
  fetchAttendanceActivities,
  selectWorkRecords,
  selectActivities,
  selectWorkRecordsPagination,
  selectLoading,
} from './attendanceSlice'
import { fetchAll as fetchEmployees, selectAll as selectAllEmployees } from '../employees/employeesSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import FormField from '../../components/common/FormField'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Badge from '../../components/common/Badge'
import Pagination from '../../components/common/Pagination'
import { formatDate } from '../../utils/formatters'
import api from '../../services/api'
import { ArrowDownTrayIcon, ClockIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline'

const RECORD_TYPES = [
  { value: 'FDP', label: 'Full Day' },
  { value: 'HDP', label: 'Half Day' },
  { value: 'ABS', label: 'Absent' },
  { value: 'OFF', label: 'Weekly Off' },
  { value: 'HOL', label: 'Holiday' },
]

const TYPE_COLORS = {
  FDP: 'success',
  HDP: 'warning',
  ABS: 'danger',
  OFF: 'default',
  HOL: 'info',
}

export default function WorkRecordsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  
  const workRecords = useSelector(selectWorkRecords) || []
  const activitiesData = useSelector(selectActivities)
  const employees = useSelector(selectAllEmployees) || []
  const pagination = useSelector(selectWorkRecordsPagination)
  const loading = useSelector(selectLoading)

  const [viewType, setViewType] = useState('calculated') // 'calculated' | 'individual'
  const [employeeId, setEmployeeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchEmployees({ size: 1000 }))
  }, [dispatch])

  const fetchData = (page = 0) => {
    const params = {
      page,
      size: 20,
      employeeId: employeeId || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      calculated: viewType === 'calculated' ? true : false,
    }
    if (viewType === 'calculated') {
      dispatch(fetchWorkRecords(params))
    } else {
      // If the user wants individual records from the same WorkRecord table,
      // they should use the 'calculated=false' filter.
      // If they want raw AttendanceActivity, we use fetchAttendanceActivities.
      // Based on user feedback, individual punches are in the same table.
      dispatch(fetchWorkRecords(params))
    }
  }

  useEffect(() => {
    fetchData(0)
  }, [viewType, employeeId, fromDate, toDate])

  const handleExport = async () => {
    if (!companyId) return
    try {
      const params = new URLSearchParams({
        companyId,
        employeeId: employeeId || '',
        from: fromDate || '',
        to: toDate || '',
        calculated: viewType === 'calculated' ? 'true' : 'false',
      })
      const res = await api.get(`/attendance/work-records/export?${params.toString()}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `work_records_${viewType}_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export successful')
    } catch (err) {
      toast.error('Export failed')
    }
  }

  const calculatedColumns = [
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
    { accessorKey: 'dayPercentage', header: 'Day %', cell: ({ getValue }) => {
      const val = getValue()
      return val != null ? `${(Number(val) * 100).toFixed(0)}%` : '—'
    }},
    { accessorKey: 'note', header: 'Note', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>Edit</Button>
        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const activityColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'atWork', header: 'Punch Hours' },
    { accessorKey: 'note', header: 'Punch Details', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const handleEdit = (record) => {
    setEditingId(record.id)
    setValue('employeeId', record.employee?.id)
    setValue('date', record.date)
    setValue('workRecordType', record.workRecordType)
    setValue('atWork', record.atWork)
    setValue('minHour', record.minHour)
    setValue('note', record.note)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return
    try {
      await dispatch(deleteWorkRecord(id)).unwrap()
      toast.success('Deleted')
    } catch (err) {
      toast.error(err)
    }
  }

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, companyId, isAttendanceRecord: true }
      if (editingId) {
        await dispatch(updateWorkRecord({ id: editingId, data: payload })).unwrap()
        toast.success('Updated')
      } else {
        await dispatch(createWorkRecord(payload)).unwrap()
        toast.success('Created')
      }
      setShowModal(false)
      reset()
    } catch (err) {
      toast.error(err)
    }
  }

  const tableData = Array.isArray(workRecords) ? workRecords : []
  
  const tablePagination = pagination

  return (
    <div className="attendance-workspace attendance-work-records-page space-y-6">
      <PageHeader
        title="Work Records"
        subtitle="Manage daily calculated hours and individual punches"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => { setEditingId(null); reset(); setShowModal(true) }}>
              Add Record
            </Button>
          </div>
        }
      />

      {/* Top Notch Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <FormField label="View Type" icon={<ClockIcon className="w-4 h-4" />}>
            <Select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              options={[
                { value: 'calculated', label: 'Calculated Daily Records' },
                { value: 'individual', label: 'Individual Punches (Raw)' },
              ]}
            />
          </FormField>
          
          <FormField label="Employee" icon={<UserIcon className="w-4 h-4" />}>
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              options={[
                { value: '', label: 'All Employees' },
                ...employees.map(e => ({
                  value: e.id,
                  label: `${e.firstName} ${e.lastName || ''} (${e.employeeCode || e.id})`
                }))
              ]}
            />
          </FormField>

          <FormField label="From Date" icon={<CalendarIcon className="w-4 h-4" />}>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </FormField>

          <FormField label="To Date" icon={<CalendarIcon className="w-4 h-4" />}>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </FormField>
        </div>
      </div>

      <div className="space-y-4">
        <DataTable
          columns={viewType === 'calculated' ? calculatedColumns : activityColumns}
          data={tableData}
          loading={loading}
        />

        {tablePagination && tablePagination.total > 0 && (
          <Pagination
            page={tablePagination.page}
            totalPages={Math.ceil(tablePagination.total / tablePagination.size)}
            onPageChange={(page) => fetchData(page)}
          />
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Work Record' : 'Add Work Record'}
        size="lg"
        panelClassName="work-record-modal"
        footer={
          <div className="work-record-modal-actions">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" form="work-record-form">{editingId ? 'Update record' : 'Save record'}</Button>
          </div>
        }
      >
        <form id="work-record-form" onSubmit={handleSubmit(onSubmit)} className="work-record-form">
          <FormField label="Employee" error={errors.employeeId?.message} className="work-record-employee-field">
            <Select
              {...register('employeeId', { required: 'Required' })}
              options={employees.map(e => ({
                value: e.id,
                label: `${e.firstName} ${e.lastName || ''}`
              }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4 work-record-date-fields">
            <Input label="Date" type="date" error={errors.date?.message} {...register('date', { required: 'Required' })} />
            <FormField label="Type">
              <Select {...register('workRecordType')} options={RECORD_TYPES} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4 work-record-hours-fields">
            <Input label="At Work (HH:MM)" {...register('atWork')} placeholder="08:30" />
            <Input label="Min Hour (HH:MM)" {...register('minHour')} placeholder="08:00" />
          </div>
          <Input label="Note" {...register('note')} className="work-record-note-field" />
        </form>
      </Modal>
    </div>
  )
}
