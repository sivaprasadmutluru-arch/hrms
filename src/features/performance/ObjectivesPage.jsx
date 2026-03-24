import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchObjectives, createObjective, selectLoading } from './performanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import { formatDate } from '../../utils/formatters'

export default function ObjectivesPage() {
  const dispatch = useDispatch()
  const objectives = useSelector(s => s.performance.objectives)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { dispatch(fetchObjectives()) }, [dispatch])

  const onSubmit = async (formData) => {
    try { await dispatch(createObjective(formData)).unwrap(); toast.success('Objective created'); setModalOpen(false); dispatch(fetchObjectives()) }
    catch { toast.error('Failed') }
  }

  const columns = [
    { accessorKey: 'employeeName', header: 'Employee' },
    { accessorKey: 'title', header: 'Objective' },
    { accessorKey: 'dueDate', header: 'Due', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'progress', header: 'Progress', cell: ({ getValue }) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-20">
          <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${getValue() || 0}%` }} />
        </div>
        <span className="text-xs text-gray-500">{getValue() || 0}%</span>
      </div>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Active'} variant={getValue() === 'COMPLETED' ? 'success' : getValue() === 'OVERDUE' ? 'danger' : 'primary'} /> },
  ]

  return (
    <div>
      <PageHeader title="Objectives" subtitle="Employee performance objectives and KPIs" actions={<Button onClick={() => { reset({}); setModalOpen(true) }}>+ New Objective</Button>} />
      <DataTable columns={columns} data={objectives} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Objective"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Create</Button></div>}>
        <div className="space-y-4">
          <Input label="Employee ID" {...register('employeeId')} />
          <Input label="Objective Title" {...register('title')} />
          <Input label="Due Date" type="date" {...register('dueDate')} />
          <Input label="Weight (%)" type="number" {...register('weight')} />
        </div>
      </Modal>
    </div>
  )
}
