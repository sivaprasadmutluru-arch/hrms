import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDocumentRequests, createDocumentRequest, deleteDocumentRequest,
  fetchSubmissionStatus,
  selectDocumentRequests, selectDocumentsLoading,
  selectSubmissionStatus, selectSubmissionLoading,
} from './documentsSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from '../employees/employeesSlice'
import api from '../../services/api'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

const FORMAT_OPTIONS = [
  { value: 'ANY', label: 'Any' },
  { value: 'PDF', label: 'PDF' },
  { value: 'DOCX', label: 'DOCX' },
  { value: 'XLSX', label: 'XLSX' },
  { value: 'JPG', label: 'JPG' },
  { value: 'PNG', label: 'PNG' },
]

export default function DocumentRequestsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const requests = useSelector(selectDocumentRequests)
  const loading = useSelector(selectDocumentsLoading)
  const employees = useSelector(selectEmployees)
  const submissionStatus = useSelector(selectSubmissionStatus)
  const submissionLoading = useSelector(selectSubmissionLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [statusModal, setStatusModal] = useState({ open: false, requestTitle: '' })
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchDocumentRequests())
    dispatch(fetchEmployees({ page: 0, size: 200 }))
  }, [dispatch])

  const openEdit = (row) => {
    setEditTarget(row)
    reset({
      title: row.title,
      documentFormat: row.documentFormat || 'ANY',
      maxSizeMb: row.maxSizeMb || '',
      description: row.description || '',
    })
    setSelectedEmployeeIds([])
    setModalOpen(true)
  }

  const handleViewSubmissions = (row) => {
    dispatch(fetchSubmissionStatus(row.id))
    setStatusModal({ open: true, requestTitle: row.title })
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteDocumentRequest(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const toggleEmployee = (id) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const onSubmit = async (data) => {
    try {
      if (editTarget) {
        await api.put(`/documents/requests/${editTarget.id}`, {
          ...data,
          company: { id: user?.companyId },
        })
        toast.success('Document request updated')
        setEditTarget(null)
        dispatch(fetchDocumentRequests())
      } else {
        const employees_payload = selectedEmployeeIds.map(id => ({ id }))
        await dispatch(createDocumentRequest({
          ...data,
          company: { id: user?.companyId },
          employees: employees_payload,
        })).unwrap()
        toast.success(`Document request created${employees_payload.length > 0 ? ` — ${employees_payload.length} employee(s) notified` : ''}`)
      }
      setModalOpen(false)
      reset()
      setSelectedEmployeeIds([])
    } catch (e) { toast.error(e || 'Error') }
  }

  const filteredRequests = requests.filter(request =>
    `${request.title || ''} ${request.description || ''} ${request.documentFormat || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="document-requests-page">
      <section className="document-requests-hero">
        <div className="document-requests-hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3.75h7l5 5v11.5H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z"/><path d="M14 4v5h5M9 14h6M9 17h6"/></svg>
        </div>
        <div className="document-requests-hero-copy">
          <span className="document-requests-eyebrow">PEOPLE OPERATIONS</span>
          <h1>Document requests</h1>
          <p>Collect and track the documents your team needs to submit.</p>
        </div>
        <Button onClick={() => { setEditTarget(null); reset(); setModalOpen(true) }}>+ New request</Button>
      </section>

      <section className="document-requests-summary" aria-label="Document request summary">
        <div className="document-requests-stat"><span className="document-requests-stat-icon">▤</span><div><span className="document-requests-stat-label">Active requests</span><strong>{requests.length}</strong></div></div>
        <div className="document-requests-stat"><span className="document-requests-stat-icon document-requests-stat-icon-blue">♙</span><div><span className="document-requests-stat-label">Employees available</span><strong>{employees.length}</strong></div></div>
        <div className="document-requests-summary-note"><span className="document-requests-status-dot" /> Requests are shared with selected employees</div>
      </section>

      <section className="document-requests-library">
        <div className="document-requests-library-head">
          <div><h2>Request library</h2><p>Review formats, requirements, and employee submissions.</p></div>
          <label className="document-requests-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search requests" aria-label="Search document requests" />
          </label>
        </div>

        {loading ? <div className="document-requests-loading"><span />Loading document requests…</div> : filteredRequests.length === 0 ? (
          <div className="document-requests-empty"><span className="document-requests-empty-icon">▤</span><h3>{search ? 'No matching requests' : 'No document requests yet'}</h3><p>{search ? 'Try a different title, description, or format.' : 'Create a request to collect documents from your employees.'}</p>{!search && <Button onClick={() => { setEditTarget(null); reset(); setModalOpen(true) }}>Create first request</Button>}</div>
        ) : (
          <div className="document-requests-grid">
            {filteredRequests.map(request => (
              <article className="document-request-card" key={request.id}>
                <div className="document-request-card-top">
                  <span className="document-request-file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3.75h7l5 5v11.5H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z"/><path d="M14 4v5h5M9 14h6M9 17h4"/></svg></span>
                  <span className="document-request-format">{request.documentFormat || 'ANY'} format</span>
                </div>
                <h3>{request.title}</h3>
                <p className="document-request-description">{request.description || 'No additional instructions provided.'}</p>
                <div className="document-request-meta"><span>Maximum file size</span><strong>{request.maxSizeMb ? `${request.maxSizeMb} MB` : 'No limit set'}</strong></div>
                <div className="document-request-actions">
                  <Button size="sm" variant="secondary" onClick={() => handleViewSubmissions(request)}>Submissions</Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(request)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(request.id)}>Delete</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Document Request"
        message="Are you sure you want to delete this document request? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, requestTitle: '' })}
        title={`Submissions — ${statusModal.requestTitle}`}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setStatusModal({ open: false, requestTitle: '' })}>Close</Button>
          </div>
        }
      >
        {submissionLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : submissionStatus.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No employees tagged to this request.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {submissionStatus.map((item) => {
              const isPending = !item.status
              const statusConfig = {
                SUBMITTED: { label: 'Submitted', cls: 'bg-blue-100 text-blue-700' },
                APPROVED:  { label: 'Approved',  cls: 'bg-green-100 text-green-700' },
                REJECTED:  { label: 'Rejected',  cls: 'bg-red-100 text-red-700' },
              }
              const badge = isPending
                ? { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' }
                : (statusConfig[item.status] || { label: item.status, cls: 'bg-gray-100 text-gray-700' })

              return (
                <div key={item.employeeId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.employeeName}</p>
                    <p className="text-xs text-gray-400">{item.badgeId} · {item.email}</p>
                    {item.rejectReason && (
                      <p className="text-xs text-red-500 mt-0.5">Reason: {item.rejectReason}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {item.submittedAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(item.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); setSelectedEmployeeIds([]) }} title={editTarget ? 'Edit Document Request' : 'Create Document Request'} size="lg" panelClassName="document-request-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null); setSelectedEmployeeIds([]) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="document-request-form">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Select label="Format" options={FORMAT_OPTIONS} {...register('documentFormat')} />
          <Input label="Max Size (MB)" type="number" {...register('maxSizeMb')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
          {!editTarget && <div className="document-request-recipient-block">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notify employees <span className="text-gray-400 font-normal">Choose who will be notified</span>
            </label>
            <div className="document-request-recipient-list border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
              {employees.length === 0 ? (
                <p className="text-xs text-gray-400 p-3">No employees found</p>
              ) : (
                employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                    />
                    <span className="text-sm text-gray-700">{emp.fullName || emp.firstName}</span>
                    {emp.departmentName && <span className="text-xs text-gray-400 ml-auto">{emp.departmentName}</span>}
                  </label>
                ))
              )}
            </div>
            {selectedEmployeeIds.length > 0 && (
              <p className="text-xs text-indigo-600 mt-1">{selectedEmployeeIds.length} employee(s) selected</p>
            )}
          </div>}
        </div>
      </Modal>
    </div>
  )
}
