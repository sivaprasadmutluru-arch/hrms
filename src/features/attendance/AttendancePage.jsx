import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, approve, reject,
  fetchLateComeEarlyOut, deleteLateComeEarlyOut,
  fetchOvertime, approveOvertime,
  selectAll, selectLoading, selectPagination, selectLateComeEarlyOut, selectOvertimeRecords
} from './attendanceSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import SearchInput from '../../components/common/SearchInput'
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'

const TABS = ['Attendance', 'Late / Early Out', 'Overtime']

export default function AttendancePage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const lateComeEarlyOut = useSelector(selectLateComeEarlyOut)
  const overtimeRecords = useSelector(selectOvertimeRecords)

  const [tab, setTab] = useState('Attendance')
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchAll({ page: 0, size: 20 }))
    dispatch(fetchLateComeEarlyOut())
  }, [dispatch])

  useEffect(() => {
    if (tab === 'Overtime' && user?.companyId) {
      dispatch(fetchOvertime(user.companyId))
    }
  }, [tab, dispatch, user])

  const handleApprove = async (id) => {
    try { await dispatch(approve(id)).unwrap(); toast.success('Approved') } catch { toast.error('Failed') }
  }
  const handleReject = async (id) => {
    try { await dispatch(reject(id)).unwrap(); toast.success('Rejected') } catch { toast.error('Failed') }
  }

  const handleDeleteLate = async (id) => {
    if (!window.confirm('Delete this record?')) return
    try { await dispatch(deleteLateComeEarlyOut(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleApproveOvertime = async (id) => {
    try { await dispatch(approveOvertime(id)).unwrap(); toast.success('Overtime approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(create({ ...formData, companyId: user?.companyId })).unwrap()
      toast.success('Attendance recorded')
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const attendanceColumns = [
    { accessorKey: 'employeeName', header: 'Employee' },
    { accessorKey: 'attendanceDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'checkIn', header: 'Check In', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'checkOut', header: 'Check Out', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'workedHour', header: 'Hours' },
    { accessorKey: 'attendanceValidated', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Pending'} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.isValidateRequest === true ? (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
      </div>
    ) : null },
  ]

  const lateColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { id: 'date', header: 'Attendance Date', cell: ({ row }) => formatDate(row.original.attendance?.attendanceDate) },
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => {
      const v = getValue()
      return <Badge label={v === 'LATE_COME' ? 'Late Come' : 'Early Out'} variant={v === 'LATE_COME' ? 'warning' : 'accent'} />
    }},
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDeleteLate(row.original.id)}>Delete</Button>
    )},
  ]

  const overtimeColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { accessorKey: 'month', header: 'Month' },
    { accessorKey: 'year', header: 'Year' },
    { accessorKey: 'overtimeHours', header: 'Overtime Hrs', cell: ({ getValue }) => getValue() != null ? `${getValue()}h` : '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => {
      const v = getValue()
      return <Badge label={v || 'PENDING'} variant={v === 'APPROVED' ? 'success' : v === 'REJECTED' ? 'danger' : 'default'} />
    }},
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'PENDING' ? (
      <Button size="sm" variant="success" onClick={() => handleApproveOvertime(row.original.id)}>Approve</Button>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Track employee attendance records"
        actions={
          <>
            <SearchInput onSearch={setSearch} className="w-48" />
            {tab === 'Attendance' && <Button onClick={() => { reset({}); setModalOpen(true) }}>+ Record</Button>}
          </>
        }
      />

      <div className="flex gap-2 border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Attendance' && (
        <>
          <DataTable columns={attendanceColumns} data={data} loading={loading} />
          <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
        </>
      )}

      {tab === 'Late / Early Out' && (
        <DataTable columns={lateColumns} data={lateComeEarlyOut} loading={loading} />
      )}

      {tab === 'Overtime' && (
        <DataTable columns={overtimeColumns} data={overtimeRecords} loading={loading} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Attendance"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Save</Button></div>}>
        <div className="space-y-4">
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Date" type="date" error={errors.attendanceDate?.message} {...register('attendanceDate', { required: 'Required' })} />
          <Input label="Check In Time" type="time" {...register('checkIn')} />
          <Input label="Check Out Time" type="time" {...register('checkOut')} />
        </div>
      </Modal>
    </div>
  )
}
