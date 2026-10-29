import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Modal from '../../components/common/Modal'

export default function LeaveAttachmentActions({ requestId, file, companyId }) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])

  const open = async (download) => {
    setBusy(true)
    try {
      const headers = companyId ? { 'X-Company-Id': companyId, 'X-Filter-Company-Id': companyId } : {}
      const { data, headers: responseHeaders } = await api.get(
        `/leave/requests/${requestId}/files/${file.id}/content`,
        { responseType: 'blob', params: { download }, headers },
      )
      if (!active.current) return
      const type = (responseHeaders['content-type'] || '').split(';')[0]
      const canPreview = ['application/pdf', 'image/jpeg', 'image/png'].includes(type)
      const url = URL.createObjectURL(new Blob([data], { type }))
      if (!download && canPreview) {
        setPreview({ url, type })
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = file.fileName || 'attachment'
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        if (!download) toast('This file type has been downloaded for viewing.')
      }
    } catch (error) {
      if (!active.current) return
      toast.error(error.response?.status === 404
        ? 'The attachment file is no longer available. Please ask the employee to upload it again.'
        : 'Unable to open attachment. Please check your access and try again.')
    } finally {
      if (active.current) setBusy(false)
    }
  }

  return <>
    <div className="flex gap-3 shrink-0">
      <button type="button" disabled={busy} onClick={() => open(false)} className="text-indigo-700 font-semibold hover:underline disabled:opacity-50" aria-label={`View ${file.fileName || 'attachment'}`}>{busy ? 'Loading…' : 'View'}</button>
      <button type="button" disabled={busy} onClick={() => open(true)} className="text-indigo-700 font-semibold hover:underline disabled:opacity-50" aria-label={`Download ${file.fileName || 'attachment'}`}>Download</button>
    </div>
    <Modal open={!!preview} onClose={() => setPreview(null)} title={file.fileName || 'Attachment'} size="xl">
      {preview?.type === 'application/pdf'
        ? <iframe title="Leave certificate" src={preview.url} className="w-full h-[65vh]" />
        : preview && <img src={preview.url} alt="Leave certificate" className="max-h-[65vh] max-w-full mx-auto object-contain" />}
      <button type="button" onClick={() => open(true)} disabled={busy} className="mt-3 text-indigo-700 font-semibold">Download file</button>
    </Modal>
  </>
}
