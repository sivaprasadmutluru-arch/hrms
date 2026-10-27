import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchFeedback, createFeedback, selectLoading } from './performanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { formatDate } from '../../utils/formatters'
import { StarIcon } from '@heroicons/react/24/solid'

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => <StarIcon key={i} className={`h-4 w-4 ${i <= count ? 'text-amber-400' : 'text-gray-200'}`} />)}
    </div>
  )
}

export default function FeedbackPage() {
  const dispatch = useDispatch()
  const feedback = useSelector(s => s.performance.feedback)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { dispatch(fetchFeedback()) }, [dispatch])

  const onSubmit = async (formData) => {
    try {
      await dispatch(createFeedback({ ...formData, rating: Number(formData.rating) })).unwrap()
      toast.success('Feedback submitted')
      setModalOpen(false)
      reset()
    } catch { toast.error('Failed') }
  }

  const columns = [
    { accessorKey: 'reviewerName', header: 'Reviewer' },
    { accessorKey: 'revieweeName', header: 'Reviewee' },
    { accessorKey: 'cycleId', header: 'Cycle' },
    { accessorKey: 'rating', header: 'Rating', cell: ({ getValue }) => <Stars count={getValue() || 0} /> },
    { accessorKey: 'comments', header: 'Comments', cell: ({ getValue }) => <span className="max-w-xs truncate block text-gray-600">{getValue() || '—'}</span> },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
  ]

  return (
    <div className="performance-workspace">
      <PageHeader title="Feedback" subtitle="Performance feedback and ratings"
        actions={<Button onClick={() => { reset({}); setModalOpen(true) }}>+ Give Feedback</Button>} />
      <div className="performance-table"><DataTable columns={columns} data={feedback} loading={loading} /></div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Give Feedback" size="lg" panelClassName="performance-form-modal performance-feedback-modal"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Submit</Button></div>}>
        <div className="performance-feedback-form">
          <Input label="Reviewee Employee ID" type="number" {...register('revieweeId')} />
          <Input label="Cycle ID" type="number" {...register('cycleId')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1–5)</label>
            <select {...register('rating')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea {...register('comments')} rows={3} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
