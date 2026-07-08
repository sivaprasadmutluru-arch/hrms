import { useEffect, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { createDocument } from '../../documents/documentsSlice'
import Spinner from '../../../components/common/Spinner'
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import Input from '../../../components/common/Input'
import { formatDate } from '../../../utils/formatters'
import { API_BASE_URL } from '../../../config/constants'

export default function DocumentsTab({ employeeId, companyId }) {
  const dispatch = useDispatch()
  const [docs, setDocs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const loadDocs = useCallback(() => {
    if (!employeeId) return
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    setLoading(true)
    api.get(`/documents/employee/${employeeId}`, cfg)
      .then(res => setDocs(Array.isArray(res.data) ? res.data : res.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId, companyId])

  useEffect(() => { loadDocs() }, [loadDocs])

  const onSubmit = async (data) => {
    setUploading(true)
    try {
      const requestConfig = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
      let filePath = null
      if (data.file?.[0]) {
        const formData = new FormData()
        formData.append('file', data.file[0])
        const uploadRes = await api.post('/files/document', formData, requestConfig)
        filePath = uploadRes.data.path
      }
      await dispatch(createDocument({
        title: data.title,
        issueDate: data.issueDate || null,
        expiryDate: data.expiryDate || null,
        status: 'SUBMITTED',
        filePath,
        employee: { id: employeeId },
        company: companyId ? { id: companyId } : null,
        requestConfig,
      })).unwrap()
      toast.success('Document uploaded')
      setModalOpen(false)
      reset()
      loadDocs()
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => { reset(); setModalOpen(true) }}>+ Upload Document</Button>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-gray-400 py-6">No documents uploaded.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{doc.title || doc.fileName || 'Document'}</p>
                {doc.createdAt && (
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.createdAt)}</p>
                )}
              </div>
              {doc.filePath && (
                <a
                  href={`${API_BASE_URL}/files/${doc.filePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reset() }}
        title="Upload Document"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); reset() }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={uploading}>Upload</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} placeholder="e.g. Passport"
            {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input
              type="file"
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              {...register('file')}
            />
          </div>
          <Input label="Issue Date" type="date" {...register('issueDate')} />
          <Input label="Expiry Date" type="date" {...register('expiryDate')} />
        </div>
      </Modal>
    </div>
  )
}
