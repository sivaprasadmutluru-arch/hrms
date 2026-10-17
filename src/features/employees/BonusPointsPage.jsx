import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from './employeesSlice'
import { fetchBonusPoints, updateBonusPoints, selectBonusPoints, selectLoading } from './employeeExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import DataTable from '../../components/common/DataTable'
import useAuth from '../../hooks/useAuth'

export default function BonusPointsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const employees = useSelector(selectEmployees)
  const bonusPoints = useSelector(selectBonusPoints)
  const loading = useSelector(selectLoading)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    dispatch(fetchEmployees({ page: 0, size: 200 }))
  }, [dispatch])

  const openAdjust = (emp) => {
    setSelectedEmployee(emp)
    dispatch(fetchBonusPoints(emp.id)).then(res => {
      reset({ points: res.payload?.points || 0, reason: '' })
    })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(updateBonusPoints({
        employeeId: selectedEmployee.id,
        data: { ...data, points: Number(data.points), company: { id: user?.companyId } }
      })).unwrap()
      toast.success('Bonus points updated')
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm text-gray-900">{row.original.fullName || `${row.original.firstName} ${row.original.lastName}`}</p>
          <p className="text-xs text-gray-500">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: 'badgeId', header: 'Employee ID' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button size="sm" variant="secondary" onClick={() => openAdjust(row.original)}>Adjust Points</Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Bonus Points" subtitle="View and adjust employee recognition points" />
      <DataTable columns={columns} data={employees} loading={loading} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Adjust Points — ${selectedEmployee?.fullName || selectedEmployee?.firstName}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Points" type="number" {...register('points')} />
          <Input label="Reason" {...register('reason')} />
        </div>
      </Modal>
    </div>
  )
}
