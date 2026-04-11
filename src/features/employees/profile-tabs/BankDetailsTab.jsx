import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import Spinner from '../../../components/common/Spinner'
import Button from '../../../components/common/Button'
import Input from '../../../components/common/Input'
import Modal from '../../../components/common/Modal'

const Field = ({ label, value }) => (
  <div>
    <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
    <dd className="text-sm text-gray-900">{value || '—'}</dd>
  </div>
)

export default function BankDetailsTab({ employeeId, companyId }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const { register, handleSubmit, reset } = useForm()
  const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}

  const load = () => {
    api.get(`/employees/${employeeId}/bank-details`, cfg)
      .then(res => setDetails(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (employeeId) load() }, [employeeId, companyId])

  useEffect(() => {
    if (!modalOpen || !details) return
    reset({
      bankName:      details.bankName,
      accountNumber: details.accountNumber,
      branch:        details.branch,
      ifscCode:      details.ifscCode,
      swiftCode:     details.swiftCode,
      country:       details.country,
      state:         details.state,
      city:          details.city,
      address:       details.address,
    })
  }, [modalOpen])

  const onSubmit = async (data) => {
    try {
      const method = details ? 'put' : 'post'
      const res = await api[method](`/employees/${employeeId}/bank-details`, data, cfg)
      setDetails(res.data)
      setModalOpen(false)
      toast.success('Bank details updated')
    } catch {
      toast.error('Failed to update bank details')
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setModalOpen(true)}>
          {details ? 'Edit Bank Details' : 'Add Bank Details'}
        </Button>
      </div>

      {details ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Bank Name"       value={details.bankName} />
          <Field label="Account Number"  value={details.accountNumber} />
          <Field label="Branch"          value={details.branch} />
          <Field label="IFSC / Routing Code" value={details.ifscCode} />
          <Field label="SWIFT Code"      value={details.swiftCode} />
          <Field label="Country"         value={details.country} />
          <Field label="State"           value={details.state} />
          <Field label="City"            value={details.city} />
          <Field label="Address"         value={details.address} />
        </dl>
      ) : (
        <p className="text-sm text-gray-400">No bank details added yet.</p>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Bank Details"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bank Name"      {...register('bankName')} />
            <Input label="Account Number" {...register('accountNumber')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Branch"         {...register('branch')} />
            <Input label="IFSC / Routing Code" {...register('ifscCode')} />
          </div>
          <Input label="SWIFT Code"       {...register('swiftCode')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Country"        {...register('country')} />
            <Input label="State"          {...register('state')} />
            <Input label="City"           {...register('city')} />
          </div>
          <Input label="Address"          {...register('address')} />
        </div>
      </Modal>
    </div>
  )
}
