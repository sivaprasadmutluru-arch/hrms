import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, selectAll, selectLoading, selectPagination,
  fetchLeavers, selectLeavers, selectLeaversPagination,
  fetchEmployeeTasks, assignEmployeeTask, completeEmployeeTask,
  fetchOffboardingNotes, addOffboardingNote, deleteOffboardingNote,
  selectEmployeeTasks, selectOffboardingNotes,
} from './offboardingSlice'
import { fetchAll as fetchEmployees } from '../employees/employeesSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Combobox from '../../components/common/Combobox'
import Pagination from '../../components/common/Pagination'
import { formatDate } from '../../utils/formatters'

const employeeName = (e) => [e?.firstName, e?.lastName].filter(Boolean).join(' ') || `Employee #${e?.id}`

export default function OffboardingPage() {
  const dispatch = useDispatch()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const leavers = useSelector(selectLeavers)
  const leaversPagination = useSelector(selectLeaversPagination)
  const employeeTasks = useSelector(selectEmployeeTasks)
  const offboardingNotes = useSelector(selectOffboardingNotes)
  const employees = useSelector(s => s.employees?.data || [])

  const employeeOptions = useMemo(() => employees.map(e => ({
    value: e.id,
    label: employeeName(e),
    sublabel: e.badgeId,
    searchText: `${employeeName(e)} ${e.badgeId || ''} ${e.email || ''}`,
  })), [employees])

  const [tab, setTab] = useState('Active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)
  const [detailTab, setDetailTab] = useState('tasks')
  const [noteText, setNoteText] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const { register: regTask, handleSubmit: handleTaskSubmit, reset: resetTask, setValue: setTaskValue, watch: watchTask, formState: { errors: taskErrors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])
  useEffect(() => { dispatch(fetchEmployees({ page: 0, size: 1000 })) }, [dispatch])
  useEffect(() => { if (tab === 'Leavers') dispatch(fetchLeavers({ page: 0, size: 20 })) }, [dispatch, tab])

  useEffect(() => {
    if (detailRecord) {
      dispatch(fetchEmployeeTasks(detailRecord.id))
      dispatch(fetchOffboardingNotes(detailRecord.id))
    }
  }, [dispatch, detailRecord])

  const openDetail = (row) => { setDetailRecord(row); setDetailTab('tasks'); setDetailOpen(true) }

  const openEdit = (row) => {
    setEditTarget(row)
    reset({
      employee: { id: row.employee?.id },
      noticePeriodType: row.noticePeriodType,
      exitDate: row.exitDate,
      reasonOfLeaving: row.reasonOfLeaving,
      retentionPeriodMonths: row.retentionPeriodMonths,
      immediateLeaving: row.immediateLeaving,
    })
    setModalOpen(true)
  }

  const handleComplete = async (id) => {
    try { await api.put(`/offboarding/${id}/complete`); toast.success('Completed'); dispatch(fetchAll({ page: 0, size: 20 })) }
    catch { toast.error('Failed') }
  }

  const handleCompleteTask = async (id) => {
    try { await dispatch(completeEmployeeTask(id)).unwrap(); toast.success('Task completed') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    try {
      await dispatch(addOffboardingNote({ offboardingId: detailRecord.id, data: { note: noteText } })).unwrap()
      setNoteText('')
      toast.success('Note added')
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDeleteNote = async (id) => {
    try { await dispatch(deleteOffboardingNote(id)).unwrap(); toast.success('Note deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    if (!formData.employee?.id) { toast.error('Please select an employee'); return }
    try {
      if (editTarget) {
        await api.put(`/offboarding/${editTarget.id}`, formData)
        toast.success('Offboarding updated')
        setEditTarget(null)
      } else {
        await dispatch(create(formData)).unwrap()
        toast.success('Offboarding started')
      }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const onTaskSubmit = async (formData) => {
    try {
      await dispatch(assignEmployeeTask({ offboardingId: detailRecord.id, data: formData })).unwrap()
      toast.success('Task assigned')
      setTaskModalOpen(false)
      resetTask({})
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { id: 'firstName', header: 'First Name', cell: ({ row }) => row.original.employee?.firstName || '—' },
    { id: 'lastName', header: 'Last Name', cell: ({ row }) => row.original.employee?.lastName || '—' },
    { accessorKey: 'exitDate', header: 'Exit Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'noticePeriodType', header: 'Notice Period' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'PENDING'} variant={getValue() === 'COMPLETED' ? 'success' : getValue() === 'IN_PROGRESS' ? 'info' : 'warning'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openDetail(row.original)}>Details</Button>
        {row.original.status !== 'COMPLETED' && (
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        )}
        {row.original.status !== 'COMPLETED' && (
          <Button size="sm" variant="success" onClick={() => handleComplete(row.original.id)}>Complete</Button>
        )}
      </div>
    )},
  ]

  const leaverColumns = [
    { id: 'firstName', header: 'First Name', cell: ({ row }) => row.original.employee?.firstName || '—' },
    { id: 'lastName', header: 'Last Name', cell: ({ row }) => row.original.employee?.lastName || '—' },
    { accessorKey: 'exitDate', header: 'Exit Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'reasonOfLeaving', header: 'Reason', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'employeeDeactivatedAt', header: 'Deactivated On', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="secondary" onClick={() => openDetail(row.original)}>Details</Button>
    )},
  ]

  const taskColumns = [
    { accessorKey: 'title', header: 'Task' },
    { accessorKey: 'dueDate', header: 'Due', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'isCompleted', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() ? 'Done' : 'Pending'} variant={getValue() ? 'success' : 'warning'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      !row.original.isCompleted && <Button size="sm" variant="success" onClick={() => handleCompleteTask(row.original.id)}>Mark Done</Button>
    )},
  ]

  return (
    <div className="offboarding-workspace">
      <PageHeader title="Offboarding" subtitle="Manage employee exit process"
        actions={<Button onClick={() => { setEditTarget(null); reset({}); setModalOpen(true) }}>+ Start Offboarding</Button>} />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['Active', 'Leavers'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Active' && (
        <>
          <DataTable columns={columns} data={data} loading={loading} />
          <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
        </>
      )}

      {tab === 'Leavers' && (
        <>
          <DataTable columns={leaverColumns} data={leavers} loading={loading} />
          <Pagination page={leaversPagination.page} totalPages={Math.ceil(leaversPagination.total / leaversPagination.size)} onPageChange={p => dispatch(fetchLeavers({ page: p, size: 20 }))} />
        </>
      )}

      {/* Start Offboarding Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Offboarding' : 'Start Offboarding'} size="lg" panelClassName="offboarding-form-modal offboarding-start-modal"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Start'}</Button></div>}>
        <div className="offboarding-start-form">
          <Combobox
            label="Employee"
            options={employeeOptions}
            value={watch('employee.id') ?? null}
            onChange={(v) => setValue('employee.id', v, { shouldValidate: true })}
            placeholder="Search employee by name or badge..."
            emptyText="No employees found"
          />
          <Select label="Notice Period" options={['IMMEDIATE', 'TWO_WEEKS', 'ONE_MONTH', 'THREE_MONTHS']} {...register('noticePeriodType')} />
          <Input label="Last Working Date / Exit Date" type="date" error={errors.exitDate?.message} {...register('exitDate', { required: 'Required' })} />
          <Select label="Profile Retention Period" placeholder="Select retention period" options={[
            { value: '1', label: '1 month' },
            { value: '2', label: '2 months' },
            { value: '3', label: '3 months' },
          ]} {...register('retentionPeriodMonths', { valueAsNumber: true })} />
          <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
            <input type="checkbox" {...register('immediateLeaving')} />
            Immediate leaving (deactivate now instead of waiting for the exit date)
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason of Leaving</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} {...register('reasonOfLeaving')} />
          </div>
        </div>
      </Modal>

      {/* Detail Modal (Tasks + Notes) */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} panelClassName="offboarding-form-modal"
        title={`Offboarding: ${detailRecord?.employee?.firstName || ''} ${detailRecord?.employee?.lastName || ''}`}
        footer={
          <div className="flex justify-between items-center">
            <Button size="sm" onClick={() => { resetTask({}); setTaskModalOpen(true) }}>+ Assign Task</Button>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>Close</Button>
          </div>
        }>
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-gray-200 mb-2">
            {['tasks', 'notes'].map(t => (
              <button key={t} onClick={() => setDetailTab(t)}
                className={`pb-2 px-1 text-sm font-medium border-b-2 capitalize transition-colors ${detailTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                {t}
              </button>
            ))}
          </div>

          {detailTab === 'tasks' && (
            <DataTable columns={taskColumns} data={employeeTasks} loading={loading} />
          )}

          {detailTab === 'notes' && (
            <div className="space-y-3">
              {offboardingNotes.map(n => (
                <div key={n.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 text-sm text-gray-700">{n.note}</div>
                  <button onClick={() => handleDeleteNote(n.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                </div>
              ))}
              {offboardingNotes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
              <div className="flex gap-2 pt-2">
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote() } }}
                  placeholder="Add a note..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button size="sm" onClick={handleAddNote}>Add</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Assign Task Modal */}
      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Assign Task" panelClassName="offboarding-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>Cancel</Button>
            <Button onClick={handleTaskSubmit(onTaskSubmit)}>Assign</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Task Title" error={taskErrors.title?.message} {...regTask('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} {...regTask('description')} />
          </div>
          <Input label="Due Date" type="date" {...regTask('dueDate')} />
          <Combobox
            label="Assign To"
            options={employeeOptions}
            value={watchTask('assignedTo.id') ?? null}
            onChange={(v) => setTaskValue('assignedTo.id', v, { shouldValidate: true })}
            placeholder="Search employee by name or badge..."
            emptyText="No employees found"
          />
        </div>
      </Modal>
    </div>
  )
}
