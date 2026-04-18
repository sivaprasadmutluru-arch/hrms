import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDisciplinaryActions, createDisciplinaryAction, updateDisciplinaryAction,
  deleteDisciplinaryAction, selectDisciplinaryActions, selectLoading
} from './employeeExtrasSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from './employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Badge from '../../components/common/Badge'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import { formatDate } from '../../utils/formatters'

const ACTION_TYPES = [
  { value: 'VERBAL_WARNING', label: 'Verbal Warning' },
  { value: 'WRITTEN_WARNING', label: 'Written Warning' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'DEMOTION', label: 'Demotion' },
  { value: 'TERMINATION', label: 'Termination' },
]

const ACTION_VARIANTS = {
  VERBAL_WARNING: 'secondary', WRITTEN_WARNING: 'secondary',
  WARNING: 'accent', SUSPENSION: 'danger', DEMOTION: 'danger', TERMINATION: 'danger',
}

export default function DisciplinaryPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const actions = useSelector(selectDisciplinaryActions)
  const employees = useSelector(selectEmployees)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchDisciplinaryActions())
    dispatch(fetchEmployees({ page: 0, size: 200 }))
  }, [dispatch])

  const openCreate = () => { setEditing(null); reset({ startDate: new Date().toISOString().slice(0, 10) }); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({
      ...row,
      actionType: row.actionType,
      employeeIds: row.employees?.map(e => String(e.id)) ?? [],
    })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      company: { id: user?.companyId },
      employees: data.employeeIds ? String(data.employeeIds).split(',').map(id => ({ id: Number(id.trim()) })) : [],
    }
    try {
      if (editing) {
        await dispatch(updateDisciplinaryAction({ id: editing.id, data: payload })).unwrap()
        toast.success('Disciplinary action updated')
      } else {
        await dispatch(createDisciplinaryAction(payload)).unwrap()
        toast.success('Disciplinary action created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteDisciplinaryAction(deleteTarget.id)).unwrap()
      toast.success('Disciplinary action deleted')
      setDeleteTarget(null)
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    {
      id: 'employees',
      header: 'Employees',
      cell: ({ row }) => (
        <div className="text-sm text-gray-700">
          {row.original.employees?.map(e => e.fullName || `${e.firstName} ${e.lastName}`).join(', ') || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'actionType',
      header: 'Action Type',
      cell: ({ getValue }) => <Badge label={getValue()?.replace(/_/g, ' ') || '—'} variant={ACTION_VARIANTS[getValue()] || 'secondary'} />,
    },
    { accessorKey: 'startDate', header: 'Start Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'days', header: 'Days' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Disciplinary Actions"
        subtitle="Track and manage employee disciplinary records"
        actions={<Button onClick={openCreate}>+ New Action</Button>}
      />
      <DataTable columns={columns} data={actions} loading={loading} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Disciplinary Action' : 'New Disciplinary Action'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Action Type"
            options={ACTION_TYPES}
            error={errors.actionType?.message}
            {...register('actionType', { required: 'Required' })}
          />
          <Input label="Start Date" type="date" {...register('startDate')} />
          <Input label="Duration (days)" type="number" {...register('days')} />
          <Input label="Description" {...register('description')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employees</label>
            <select multiple className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" {...register('employeeIds')}>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.fullName || `${e.firstName} ${e.lastName}`}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Disciplinary Action"
        message="Are you sure you want to delete this disciplinary action?"
        confirmLabel="Delete"
      />
    </div>
  )
}
