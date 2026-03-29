import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchFaceDetectionConfig, saveFaceDetectionConfig,
  fetchFaceDetectionEmployees, createFaceDetectionEmployee, deleteFaceDetectionEmployee,
  selectFaceDetectionConfig, selectFaceDetectionEmployees, selectFaceDetectionLoading
} from './faceDetectionSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function FaceDetectionPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const config = useSelector(selectFaceDetectionConfig)
  const employees = useSelector(selectFaceDetectionEmployees)
  const loading = useSelector(selectFaceDetectionLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    dispatch(fetchFaceDetectionConfig())
    dispatch(fetchFaceDetectionEmployees())
  }, [dispatch])

  const handleToggle = async () => {
    try {
      await dispatch(saveFaceDetectionConfig({
        start: !config?.start,
        company: { id: user?.companyId },
      })).unwrap()
      toast.success(`Face detection ${!config?.start ? 'enabled' : 'disabled'}`)
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this employee from face detection?')) return
    try { await dispatch(deleteFaceDetectionEmployee(id)).unwrap(); toast.success('Removed') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(createFaceDetectionEmployee({
        employee: { id: parseInt(data.employeeId) },
        imagePath: data.imagePath,
      })).unwrap()
      toast.success('Employee registered for face detection')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Failed') }
  }

  const columns = [
    { accessorKey: 'employee', header: 'Employee ID', cell: ({ getValue }) => getValue()?.id || '—' },
    { accessorKey: 'imagePath', header: 'Image Path' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Remove</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Face Detection" subtitle="Manage face detection for attendance" />

      {/* Config toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Face Detection Status</h2>
            <p className="text-sm text-gray-500 mt-1">
              {config?.start ? 'Face detection is currently enabled' : 'Face detection is currently disabled'}
            </p>
          </div>
          <Button
            variant={config?.start ? 'danger' : 'primary'}
            onClick={handleToggle}
            disabled={loading}
          >
            {config?.start ? 'Disable' : 'Enable'} Face Detection
          </Button>
        </div>
      </div>

      {/* Employees */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-900">Registered Employees</h2>
        <Button onClick={() => { reset({}); setModalOpen(true) }}>+ Register Employee</Button>
      </div>
      <DataTable columns={columns} data={employees} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register Employee for Face Detection"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Register</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Employee ID" type="number" {...register('employeeId', { required: true })} />
          <Input label="Image Path" {...register('imagePath')} />
        </div>
      </Modal>
    </div>
  )
}
