import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchRejectedCandidates, rejectCandidate,
  fetchCandidateDocumentRequests, createCandidateDocumentRequest,
  selectRejectedCandidates, selectCandidateDocumentRequests, selectLoading,
} from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import useAuth from '../../hooks/useAuth'

const TABS = ['Document Requests', 'Rejected Candidates']

export default function CandidateDocumentsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const rejected = useSelector(selectRejectedCandidates)
  const docRequests = useSelector(selectCandidateDocumentRequests)
  const loading = useSelector(selectLoading)

  const [tab, setTab] = useState('Document Requests')
  const [docModal, setDocModal] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)

  const { register: regDoc, handleSubmit: handleDoc, reset: resetDoc, formState: { errors: errDoc } } = useForm()
  const { register: regReject, handleSubmit: handleReject, reset: resetReject, formState: { errors: errReject } } = useForm()

  useEffect(() => {
    if (user?.companyId) dispatch(fetchRejectedCandidates({ companyId: user.companyId }))
  }, [dispatch, user?.companyId])

  const onSubmitDocRequest = async (data) => {
    try {
      await dispatch(createCandidateDocumentRequest({
        candidateId: Number(data.candidateId),
        data: { documentName: data.documentName, description: data.description, company: { id: user?.companyId } },
      })).unwrap()
      dispatch(fetchCandidateDocumentRequests(Number(data.candidateId)))
      toast.success('Document request sent')
      setDocModal(false)
      resetDoc()
    } catch (e) { toast.error(e || 'Error') }
  }

  const onSubmitReject = async (data) => {
    try {
      await dispatch(rejectCandidate({ ...data, company: { id: user?.companyId } })).unwrap()
      toast.success('Candidate marked as rejected')
      setRejectModal(false)
      resetReject()
    } catch (e) { toast.error(e || 'Error') }
  }

  const rejectedColumns = [
    { id: 'candidate', header: 'Candidate', cell: ({ row }) => row.original.candidate?.name || '—' },
    { id: 'post', header: 'Post', cell: ({ row }) => row.original.recruitmentPost?.name || '—' },
    { id: 'reason', header: 'Reason', cell: ({ row }) => row.original.rejectReason?.reason || '—' },
    { accessorKey: 'description', header: 'Notes', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
  ]

  const docColumns = [
    { id: 'candidate', header: 'Candidate', cell: ({ row }) => row.original.candidate?.name || `ID:${row.original.candidate?.id}` || '—' },
    { accessorKey: 'documentName', header: 'Document' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={getValue() === 'RECEIVED' ? 'success' : getValue() === 'REJECTED' ? 'danger' : 'default'} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Candidate Documents"
        subtitle="Document requests and rejected candidates"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { resetReject(); setRejectModal(true) }}>+ Reject Candidate</Button>
            <Button onClick={() => { resetDoc(); setDocModal(true) }}>+ Request Document</Button>
          </div>
        } />

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Document Requests' && <DataTable columns={docColumns} data={docRequests} loading={loading} />}
      {tab === 'Rejected Candidates' && <DataTable columns={rejectedColumns} data={rejected} loading={loading} />}

      <Modal open={docModal} onClose={() => setDocModal(false)} title="Request Document from Candidate"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDocModal(false)}>Cancel</Button><Button onClick={handleDoc(onSubmitDocRequest)}>Send</Button></div>}>
        <div className="space-y-4">
          <Input label="Candidate ID" error={errDoc.candidateId?.message} {...regDoc('candidateId', { required: 'Required' })} />
          <Input label="Document Name" error={errDoc.documentName?.message} {...regDoc('documentName', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} {...regDoc('description')} />
          </div>
        </div>
      </Modal>

      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Candidate"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button><Button variant="danger" onClick={handleReject(onSubmitReject)}>Reject</Button></div>}>
        <div className="space-y-4">
          <Input label="Candidate ID" error={errReject['candidate.id']?.message} {...regReject('candidate.id', { required: 'Required' })} />
          <Input label="Reject Reason ID (optional)" {...regReject('rejectReason.id')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} {...regReject('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
