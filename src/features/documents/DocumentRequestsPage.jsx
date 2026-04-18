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
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
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
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [statusModal, setStatusModal] = useState({ open: false, requestTitle: '' })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchDocumentRequests())
    dispatch(fetchEmployees({ page: 0, size: 200 }))
  }, [dispatch])

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
      const employees_payload = selectedEmployeeIds.map(id => ({ id }))
      await dispatch(createDocumentRequest({
        ...data,
        company: { id: user?.companyId },
        employees: employees_payload,
      })).unwrap()
      toast.success(`Document request created${employees_payload.length > 0 ? ` — ${employees_payload.length} employee(s) notified` : ''}`)
      setModalOpen(false)
      reset()
      setSelectedEmployeeIds([])
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'documentFormat', header: 'Format', cell: ({ getValue }) => getValue() || 'ANY' },
    { accessorKey: 'maxSizeMb', header: 'Max Size (MB)', cell: ({ getValue }) => getValue() ? `${getValue()} MB` : '—' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block">{getValue() || '—'}</span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => handleViewSubmissions(row.original)}>Submissions</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Document Requests" subtitle="Manage employee document requests"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ New Request</Button>} />
      <DataTable columns={columns} data={requests} loading={loading} />
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSelectedEmployeeIds([]) }} title="Create Document Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setSelectedEmployeeIds([]) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Select label="Format" options={FORMAT_OPTIONS} {...register('documentFormat')} />
          <Input label="Max Size (MB)" type="number" {...register('maxSizeMb')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notify Employees <span className="text-gray-400 font-normal">(select to send notifications)</span>
            </label>
            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
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
          </div>
        </div>
      </Modal>
    </div>
  )
}
