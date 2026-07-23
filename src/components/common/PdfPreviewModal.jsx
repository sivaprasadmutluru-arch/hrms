import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline'
import { API_BASE_URL } from '../../config/constants'

export default function PdfPreviewModal({ open, onClose, payslipId, fileName, companyId }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!open || !payslipId) return

    let url = null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)

    const token = localStorage.getItem('token')
    const selectedCompanyId = localStorage.getItem('selectedCompanyId')
    const storedRoles = localStorage.getItem('roles')
    const isPlatformAdmin = storedRoles
      ? (() => { try { return JSON.parse(storedRoles).includes('PLATFORM_SUPER_ADMIN') } catch { return false } })()
      : false
    const fallbackCompanyId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}')?.companyId } catch { return null } })()
    // Prefer whatever company context we can actually resolve (the payslip's own company, then
    // the topbar-selected company) — only fall back to "no header" (public/unscoped) when a
    // platform admin genuinely has nothing selected ("All Companies" mode). Platform admins still
    // need the correct tenant schema resolved when a company IS known; unrestricted ACL access
    // doesn't mean "skip schema resolution".
    const resolvedCompanyId = companyId || selectedCompanyId || (isPlatformAdmin ? null : fallbackCompanyId)
    const headers = { Authorization: `Bearer ${token}` }
    if (resolvedCompanyId) headers['X-Company-Id'] = resolvedCompanyId
    fetch(`${API_BASE_URL}/payroll/payslips/${payslipId}/pdf`, { headers })
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.blob()
      })
      .then(blob => {
        url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        setBlobUrl(url)
      })
      .catch(err => setError(err.message || 'Failed to load PDF'))
      .finally(() => setLoading(false))

    return () => {
      // cleanup on unmount or payslipId change
    }
  }, [open, payslipId, companyId])

  const handleClose = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
    setError(null)
    onClose()
  }

  const handleDownload = () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName || `payslip-${payslipId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus()
      iframeRef.current.contentWindow.print()
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
                style={{ height: '90vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <DialogTitle className="text-base font-semibold text-gray-900">
                    Payslip Preview
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrint}
                      disabled={!blobUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <PrinterIcon className="h-4 w-4" />
                      Print
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={!blobUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Download
                    </button>
                    <button
                      onClick={handleClose}
                      className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 bg-gray-100 relative overflow-hidden">
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">Loading PDF…</span>
                      </div>
                    </div>
                  )}

                  {error && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-red-500">
                        <p className="text-sm font-medium">{error}</p>
                        <p className="text-xs text-gray-400 mt-1">Please try again.</p>
                      </div>
                    </div>
                  )}

                  {blobUrl && !loading && (
                    <iframe
                      ref={iframeRef}
                      src={blobUrl}
                      title="Payslip PDF"
                      className="w-full h-full border-0"
                    />
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
