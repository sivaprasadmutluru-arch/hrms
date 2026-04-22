import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

function useRotatingSchedules() {
  const { user } = useAuth()
  const [rotatingShifts, setRotatingShifts] = useState([])
  const [rotatingWorkTypes, setRotatingWorkTypes] = useState([])
  const [employeeShifts, setEmployeeShifts] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, wt, es] = await Promise.all([
        api.get('/rotating-shifts'),
        api.get('/rotating-work-types'),
        api.get('/employee-shifts'),
      ])
      setRotatingShifts(s.data.content || s.data)
      setRotatingWorkTypes(wt.data.content || wt.data)
      setEmployeeShifts(es.data.content || es.data)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load rotating schedules')
    }
    setLoading(false)
  }

  const createShift = async (data) => {
    await api.post('/rotating-shifts', {
      name: data.name,
      company: { id: user?.companyId },
      shift1: data.shift1Id ? { id: Number(data.shift1Id) } : undefined,
      shift2: data.shift2Id ? { id: Number(data.shift2Id) } : undefined,
    })
    load()
  }

  const updateShift = async (id, data) => {
    await api.put(`/rotating-shifts/${id}`, {
      name: data.name,
      shift1: data.shift1Id ? { id: Number(data.shift1Id) } : undefined,
      shift2: data.shift2Id ? { id: Number(data.shift2Id) } : undefined,
    })
    load()
  }

  const deleteShift = async (id) => {
    await api.delete(`/rotating-shifts/${id}`)
    load()
  }

  const createWorkType = async (data) => {
    await api.post('/rotating-work-types', {
      name: data.name,
      company: { id: user?.companyId },
      workType1: { id: Number(data.workType1Id) },
      workType2: { id: Number(data.workType2Id) },
    })
    load()
  }

  const deleteWorkType = async (id) => {
    await api.delete(`/rotating-work-types/${id}`)
    load()
  }

  return { rotatingShifts, rotatingWorkTypes, employeeShifts, loading, load, createShift, updateShift, deleteShift, createWorkType, deleteWorkType }
}

export default function RotatingSchedulesPage() {
  const { rotatingShifts, rotatingWorkTypes, employeeShifts, loading, load, createShift, updateShift, deleteShift, createWorkType, deleteWorkType } = useRotatingSchedules()
  const [tab, setTab] = useState('Shifts')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); reset(); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); reset({ name: row.name, shift1Id: row.shift1?.id || '', shift2Id: row.shift2?.id || '' }); setModalOpen(true) }

  const onSubmit = async (data) => {
    try {
      if (tab === 'Shifts') {
        if (editing) {
          await updateShift(editing.id, data)
          toast.success('Rotating shift updated')
        } else {
          await createShift(data)
          toast.success('Rotating shift created')
        }
      } else {
        await createWorkType(data)
        toast.success('Rotating work type created')
      }
      setModalOpen(false)
      reset()
    } catch { toast.error('Failed') }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try {
      if (tab === 'Shifts') { await deleteShift(confirmModal.id) } else { await deleteWorkType(confirmModal.id) }
      toast.success('Deleted')
    } catch { toast.error('Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const shiftColumns = [
    { accessorKey: 'name', header: 'Name' },
    { id: 'shift1', header: 'Shift 1', cell: ({ row }) => row.original.shift1?.name || '—' },
    { id: 'shift2', header: 'Shift 2', cell: ({ row }) => row.original.shift2?.name || '—' },
    { id: 'employees', header: 'Employees', cell: ({ row }) => row.original.employees?.length ?? 0 },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const wtColumns = [
    { accessorKey: 'name', header: 'Name' },
    { id: 'wt1', header: 'Work Type 1', cell: ({ row }) => row.original.workType1?.workTypeName || '—' },
    { id: 'wt2', header: 'Work Type 2', cell: ({ row }) => row.original.workType2?.workTypeName || '—' },
    { id: 'employees', header: 'Employees', cell: ({ row }) => row.original.employees?.length ?? 0 },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Rotating Schedules" subtitle="Rotating shifts and work types"
        actions={<Button onClick={openCreate}>+ Add</Button>} />
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['Shifts', 'Work Types'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Shifts' && <DataTable columns={shiftColumns} data={rotatingShifts} loading={loading} />}
      {tab === 'Work Types' && <DataTable columns={wtColumns} data={rotatingWorkTypes} loading={loading} />}

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title={`Delete ${tab === 'Shifts' ? 'Rotating Shift' : 'Rotating Work Type'}`}
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} Rotating ${tab === 'Shifts' ? 'Shift' : 'Work Type'}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Save Changes' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Name" {...register('name', { required: 'Required' })} />
          {tab === 'Shifts' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift 1 *</label>
                <select
                  {...register('shift1Id', { required: 'Required' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select first shift...</option>
                  {employeeShifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift 2 *</label>
                <select
                  {...register('shift2Id', { required: 'Required' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select second shift...</option>
                  {employeeShifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {tab === 'Work Types' && (
            <>
              <Input label="Work Type 1 ID" {...register('workType1Id', { required: 'Required' })} />
              <Input label="Work Type 2 ID" {...register('workType2Id', { required: 'Required' })} />
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
