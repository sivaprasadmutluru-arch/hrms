import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { API_BASE_URL } from '../../config/constants'

export default function LetterPreviewModal({ open, onClose, letter, onSendEmail, companyId }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!open || !letter?.id) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        setBlobUrl(null)
      }
      return
    }

    setLoading(true)
    setError(null)

    const token = localStorage.getItem('token')
    const selectedCompanyId = localStorage.getItem('selectedCompanyId')
    const resolvedCompanyId = companyId || letter.company?.id || selectedCompanyId
    const headers = { Authorization: `Bearer ${token}` }
    if (resolvedCompanyId) headers['X-Company-Id'] = resolvedCompanyId

    fetch(`${API_BASE_URL}/documents/letters/${letter.id}/pdf`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`)
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        setBlobUrl(url)
      })
      .catch((err) => {
        setError(err.message || 'Failed to generate document preview')
      })
      .finally(() => setLoading(false))

    return () => {
      // Cleanup on letter id change
    }
  }, [open, letter?.id, companyId])

  const handleClose = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
    setError(null)
    onClose()
  }

  const handleDownload = () => {
    if (!blobUrl || !letter) return
    const a = document.createElement('a')
    a.href = blobUrl
    const safeRef = (letter.referenceNumber || 'document').replace(/[^a-zA-Z0-9.-]/g, '_')
    a.download = `${letter.letterType || 'LETTER'}_${safeRef}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
      } catch {
        // Fallback if cross-origin or iframe print blocked
        if (blobUrl) {
          const w = window.open(blobUrl, '_blank')
          if (w) {
            w.focus()
            w.print()
          }
        }
      }
    }
  }

  const typeLabels = {
    OFFER_LETTER: 'Offer Letter',
    EXPERIENCE_CERTIFICATE: 'Experience Certificate',
    RELIEVING_LETTER: 'Relieving Letter',
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ height: '92vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-base font-bold text-gray-900">
                      {letter?.title || (letter?.letterType ? typeLabels[letter.letterType] : 'Document Preview')}
                    </DialogTitle>
                    {letter?.referenceNumber && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {letter.referenceNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrint}
                      disabled={!blobUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-2xs"
                    >
                      <PrinterIcon className="h-4 w-4 text-gray-600" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={!blobUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors border border-indigo-200"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Download
                    </button>
                    {onSendEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          onSendEmail(letter)
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        Send Email
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClose}
                      className="ml-2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Body Viewer */}
                <div className="flex-1 bg-gray-100 relative overflow-hidden">
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-xs">
                      <div className="flex flex-col items-center gap-3 text-gray-600">
                        <svg className="animate-spin h-9 w-9 text-indigo-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm font-medium">Generating official PDF document…</span>
                      </div>
                    </div>
                  )}

                  {error && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="text-center max-w-md bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <XMarkIcon className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">Failed to Load Document</h4>
                        <p className="text-xs text-red-600 mb-4">{error}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null)
                            setLoading(true)
                          }}
                          className="px-4 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}

                  {blobUrl && !loading && (
                    <iframe
                      ref={iframeRef}
                      src={blobUrl}
                      title={letter?.title || 'Document PDF'}
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
