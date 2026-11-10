import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMyRequests, fetchMyDocuments, createDocument, approveDocument, rejectDocument,
  fetchMyLetters, selectMyRequests, selectDocuments, selectDocumentsLoading, selectMyLetters
} from './documentsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'
import LetterPreviewModal from './LetterPreviewModal'
import { API_BASE_URL } from '../../config/constants'
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

const STATUS_VARIANT = { APPROVED: 'success', REJECTED: 'danger', SUBMITTED: 'info', REQUESTED: 'warning' }

export default function MyDocumentsPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const isEmp = isEmployee()
  const myRequests = useSelector(selectMyRequests)
  const documents = useSelector(selectDocuments)
  const myLetters = useSelector(selectMyLetters)
  const loading = useSelector(selectDocumentsLoading)
  const [activeTab, setActiveTab] = useState('LETTERS') // 'LETTERS' or 'UPLOADS'
  const [modalOpen, setModalOpen] = useState(false)
  const [previewLetter, setPreviewLetter] = useState(null)
  const [respondingTo, setRespondingTo] = useState(null) // document request being responded to
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchMyDocuments())
    dispatch(fetchMyLetters())
    if (isEmp) dispatch(fetchMyRequests())
  }, [dispatch, isEmp])

  const handleApprove = async (id) => {
    try { await dispatch(approveDocument(id)).unwrap(); toast.success('Document approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Reject reason (optional):')
    if (reason === null) return
    try { await dispatch(rejectDocument({ id, rejectReason: reason })).unwrap(); toast.success('Document rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const openRespond = (request) => {
    setRespondingTo(request)
    reset({ title: request.title })
    setModalOpen(true)
  }

  const openSubmit = () => {
    setRespondingTo(null)
    reset({})
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      let filePath = null
      if (data.file?.[0]) {
        const formData = new FormData()
        formData.append('file', data.file[0])
        const uploadRes = await import('../../services/api').then(m => m.default.post('/files/document', formData))
        filePath = uploadRes.data.path
      }
      await dispatch(createDocument({
        title: data.title,
        issueDate: data.issueDate || null,
        expiryDate: data.expiryDate || null,
        notifyBeforeDays: data.notifyBeforeDays ? Number(data.notifyBeforeDays) : null,
        status: 'SUBMITTED',
        filePath,
        documentRequest: respondingTo ? { id: respondingTo.id } : null,
        employee: { id: user?.employeeId || Number(data.employeeId) },
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Document submitted')
      setModalOpen(false)
      reset()
      setRespondingTo(null)
    } catch (e) {
      toast.error(typeof e === 'string' ? e : (e?.response?.data?.message || e?.message || 'Failed to submit document'))
    }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { accessorKey: 'expiryDate', header: 'Expires', cell: ({ getValue }) => getValue() || '—' },
    { id: 'status', header: 'Status', cell: ({ row }) => (
      <Badge label={row.original.status || 'SUBMITTED'} variant={STATUS_VARIANT[row.original.status] || 'default'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => {
      const s = row.original.status
      if (isEmp || s === 'APPROVED' || s === 'REJECTED') return null
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
        </div>
      )
    }},
  ]

  const handleLetterDownload = async (letter) => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await fetch(`${API_BASE_URL}/documents/letters/${letter.id}/pdf?download=true`, { headers })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeRef = (letter.referenceNumber || 'DOC').replace(/[^a-zA-Z0-9.-]/g, '_')
      a.download = `${letter.letterType}_${safeRef}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Document downloaded')
    } catch {
      toast.error('Failed to download document')
    }
  }

  const letterColumns = [
    {
      accessorKey: 'referenceNumber',
      header: 'Ref #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
          {row.original.referenceNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'letterType',
      header: 'Document Type',
      cell: ({ row }) => {
        const type = row.original.letterType
        if (type === 'OFFER_LETTER') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <BriefcaseIcon className="w-3.5 h-3.5" />
              Offer Letter
            </span>
          )
        }
        if (type === 'EXPERIENCE_CERTIFICATE') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <AcademicCapIcon className="w-3.5 h-3.5" />
              Experience Certificate
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
            <DocumentTextIcon className="w-3.5 h-3.5" />
            Relieving Letter
          </span>
        )
      },
    },
    {
      accessorKey: 'designation',
      header: 'Position & Dept',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-gray-800">{row.original.designation || '—'}</div>
          <div className="text-xs text-gray-500">{row.original.department || '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'issueDate',
      header: 'Issued Date',
      cell: ({ row }) => <span className="text-xs text-gray-600 font-medium">{row.original.issueDate || '—'}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPreviewLetter(row.original)}
            className="inline-flex items-center gap-1"
          >
            <PrinterIcon className="w-3.5 h-3.5" />
            Preview & Print
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleLetterDownload(row.original)}
            className="inline-flex items-center gap-1"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Download
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Documents"
        subtitle="Access your official letters, certificates, and submitted files"
        actions={<Button onClick={openSubmit}>+ Submit Document</Button>}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('LETTERS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'LETTERS' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Letters & Certificates ({myLetters.length})
        </button>
        <button
          onClick={() => setActiveTab('UPLOADS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'UPLOADS' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Uploaded Documents ({documents.length})
        </button>
      </div>

      {activeTab === 'LETTERS' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-gray-800">
              Official Letters & Certificates
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Offer letters, experience certificates, and relieving letters issued to you
            </p>
          </div>
          <DataTable
            columns={letterColumns}
            data={myLetters}
            loading={loading}
            emptyText="No official letters or certificates have been issued to your account yet."
          />
        </div>
      )}

      {activeTab === 'UPLOADS' && (
        <>
          {/* Pending requests for employee */}
          {isEmp && myRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-amber-800 mb-3">
                Pending Document Requests ({myRequests.length})
              </h2>
              <div className="space-y-2">
                {myRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 px-4 py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                      {req.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{req.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        {req.documentFormat && <span>Format: {req.documentFormat}</span>}
                        {req.maxSizeMb && <span>Max: {req.maxSizeMb} MB</span>}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openRespond(req)}>Upload</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEmp && myRequests.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 text-sm text-green-700">
              No pending document requests.
            </div>
          )}

          {/* Submitted documents */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-gray-700">Submitted Documents</h2>
            </div>
            <DataTable columns={columns} data={documents} loading={loading} />
          </div>
        </>
      )}

      {/* PDF Document Preview & Print Modal */}
      <LetterPreviewModal
        open={Boolean(previewLetter)}
        onClose={() => setPreviewLetter(null)}
        letter={previewLetter}
      />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setRespondingTo(null) }}
        title={respondingTo ? `Upload: ${respondingTo.title}` : 'Submit Document'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setRespondingTo(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          {!isEmp && (
            <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: !user?.employeeId ? 'Required' : false })} />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input type="file" className="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" {...register('file')} />
          </div>
          <Input label="Issue Date" type="date" {...register('issueDate')} />
          <Input label="Expiry Date" type="date" {...register('expiryDate')} />
        </div>
      </Modal>
    </div>
  )
}
