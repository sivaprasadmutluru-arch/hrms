import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
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

// Inline minimal slice for rotating schedules (not added to store — standalone page state)
function useRotatingSchedules() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const [rotatingShifts, setRotatingShifts] = useState([])
  const [rotatingWorkTypes, setRotatingWorkTypes] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, wt] = await Promise.all([
        api.get('/rotating-shifts'),
        api.get('/rotating-work-types'),
      ])
      setRotatingShifts(s.data.content || s.data)
      setRotatingWorkTypes(wt.data.content || wt.data)
    } catch {}
    setLoading(false)
  }

  const createShift = async (data) => {
    await api.post('/rotating-shifts', { ...data, company: { id: user?.companyId } })
    load()
  }

  const deleteShift = async (id) => {
    await api.delete(`/rotating-shifts/${id}`)
    load()
  }

  const createWorkType = async (data) => {
    await api.post('/rotating-work-types', { ...data, company: { id: user?.companyId } })
    load()
  }

  const deleteWorkType = async (id) => {
    await api.delete(`/rotating-work-types/${id}`)
    load()
  }

  return { rotatingShifts, rotatingWorkTypes, loading, load, createShift, deleteShift, createWorkType, deleteWorkType }
}

export default function RotatingSchedulesPage() {
  const { rotatingShifts, rotatingWorkTypes, loading, load, createShift, deleteShift, createWorkType, deleteWorkType } = useRotatingSchedules()
  const [tab, setTab] = useState('Shifts')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { load() }, [])

  const onSubmit = async (data) => {
    try {
      if (tab === 'Shifts') {
        await createShift({ name: data.name })
        toast.success('Rotating shift created')
      } else {
        await createWorkType({ name: data.name, workType1: { id: Number(data.workType1Id) }, workType2: { id: Number(data.workType2Id) } })
        toast.success('Rotating work type created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error('Failed') }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try {
      if (tab === 'Shifts') { await deleteShift(confirmModal.id) } else { await deleteWorkType(confirmModal.id) }
      toast.success('Deleted')
    } catch (e) { toast.error('Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const shiftColumns = [
    { accessorKey: 'name', header: 'Name' },
    { id: 'employees', header: 'Employees', cell: ({ row }) => row.original.employees?.length ?? 0 },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
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
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ Add</Button>} />
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add Rotating ${tab === 'Shifts' ? 'Shift' : 'Work Type'}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Name" {...register('name', { required: 'Required' })} />
          {tab === 'Work Types' && <>
            <Input label="Work Type 1 ID" {...register('workType1Id', { required: 'Required' })} />
            <Input label="Work Type 2 ID" {...register('workType2Id', { required: 'Required' })} />
          </>}
        </div>
      </Modal>
    </div>
  )
}
