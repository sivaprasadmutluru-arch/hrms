import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { fetchApplicants, hireApplicant, rejectApplicant, selectLoading } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate } from '../../utils/formatters'

export default function ApplicantsPage() {
  const dispatch = useDispatch()
  const applicants = useSelector(s => s.recruitment.applicants)
  const loading = useSelector(selectLoading)
  const [detail, setDetail] = useState(null)

  useEffect(() => { dispatch(fetchApplicants({ page: 0, size: 20 })) }, [dispatch])

  const handleHire = async (id) => {
    try { await dispatch(hireApplicant(id)).unwrap(); toast.success('Applicant hired'); dispatch(fetchApplicants({ page: 0, size: 20 })) }
    catch { toast.error('Failed') }
  }
  const handleReject = async (id) => {
    try { await dispatch(rejectApplicant(id)).unwrap(); toast.success('Applicant rejected'); dispatch(fetchApplicants({ page: 0, size: 20 })) }
    catch { toast.error('Failed') }
  }

  const STAGE_VARIANT = { APPLIED: 'default', SCREENING: 'warning', INTERVIEW: 'primary', OFFERED: 'accent', HIRED: 'success', REJECTED: 'danger' }

  const columns = [
    { accessorKey: 'name', header: 'Applicant' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'jobTitle', header: 'Position' },
    { accessorKey: 'appliedDate', header: 'Applied', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'stage', header: 'Stage', cell: ({ getValue }) => <Badge label={getValue() || 'Applied'} variant={STAGE_VARIANT[getValue()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDetail(row.original)}>View</Button>
        {row.original.stage !== 'HIRED' && row.original.stage !== 'REJECTED' && (
          <>
            <Button size="sm" variant="success" onClick={() => handleHire(row.original.id)}>Hire</Button>
            <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
          </>
        )}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Applicants" subtitle="Review and manage job applicants" />
      <DataTable columns={columns} data={applicants} loading={loading} />
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Applicant Details" size="md">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{detail.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{detail.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{detail.phone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Position</span><span>{detail.jobTitle}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Applied</span><span>{formatDate(detail.appliedDate)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Stage</span><Badge label={detail.stage} variant="primary" /></div>
            {detail.resumeUrl && <a href={detail.resumeUrl} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:underline">View Resume</a>}
          </div>
        )}
      </Modal>
    </div>
  )
}
