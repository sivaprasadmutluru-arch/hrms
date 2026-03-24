import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchWorkInfo, saveWorkInfo, selectWorkInfo, selectLoading } from './employeeExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function WorkInfoPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const workInfo = useSelector(selectWorkInfo)
  const loading = useSelector(selectLoading)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchWorkInfo(id)).then(res => {
      if (res.payload && !res.error) reset(res.payload)
    })
  }, [dispatch, id])

  const onSubmit = async (data) => {
    try {
      await dispatch(saveWorkInfo({ employeeId: id, data })).unwrap()
      toast.success('Work information saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  return (
    <div>
      <PageHeader title="Work Information" subtitle="Manage employee work details and salary components" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Location" {...register('location')} />
            <Input label="Date of Joining" type="date" {...register('dateJoining')} />
          </div>
          <Input label="Contract End Date" type="date" {...register('contractEndDate')} />
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Salary Components</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Basic Salary" type="number" step="0.01" {...register('basicSalary')} />
              <Input label="Housing Allowance" type="number" step="0.01" {...register('housingAllowance')} />
              <Input label="Transport Allowance" type="number" step="0.01" {...register('transportAllowance')} />
              <Input label="Other Allowance" type="number" step="0.01" {...register('otherAllowance')} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Work Information'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
