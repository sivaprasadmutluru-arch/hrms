import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchBankDetails, saveBankDetails, selectBankDetails, selectLoading } from './employeeExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function BankDetailsPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const bankDetails = useSelector(selectBankDetails)
  const loading = useSelector(selectLoading)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    dispatch(fetchBankDetails(id)).then(res => {
      if (res.payload && !res.error) reset(res.payload)
    })
  }, [dispatch, id])

  const onSubmit = async (data) => {
    try {
      await dispatch(saveBankDetails({ employeeId: id, data })).unwrap()
      toast.success('Bank details saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  return (
    <div>
      <PageHeader title="Bank Details" subtitle="Manage employee bank account information for payroll" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bank Name" {...register('bankName')} />
            <Input label="Account Number" {...register('accountNumber')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Branch" {...register('branch')} />
            <Input label="IFSC / Routing Code" {...register('ifscCode')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="SWIFT Code" {...register('swiftCode')} />
            <Input label="Country" {...register('country')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="State" {...register('state')} />
            <Input label="City" {...register('city')} />
          </div>
          <Input label="Address" {...register('address')} />
          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
