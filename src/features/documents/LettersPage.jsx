import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchLetters,
  deleteLetter,
  selectLetters,
  selectLettersLoading,
} from './documentsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import ConfirmModal from '../../components/common/ConfirmModal'
import LetterPreviewModal from './LetterPreviewModal'
import SendLetterEmailModal from './SendLetterEmailModal'
import LetterFormModal from './LetterFormModal'
import { API_BASE_URL } from '../../config/constants'
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

const TABS = [
  { key: 'ALL', label: 'All Letters' },
  { key: 'OFFER_LETTER', label: 'Offer Letters' },
  { key: 'EXPERIENCE_CERTIFICATE', label: 'Experience Certificates' },
  { key: 'RELIEVING_LETTER', label: 'Relieving Letters' },
]

export default function LettersPage() {
  const dispatch = useDispatch()
  const letters = useSelector(selectLetters)
  const loading = useSelector(selectLettersLoading)

  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals state
  const [formModal, setFormModal] = useState({ open: false, type: 'OFFER_LETTER', target: null })
  const [previewModal, setPreviewModal] = useState({ open: false, letter: null })
  const [emailModal, setEmailModal] = useState({ open: false, letter: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null })

  const loadData = () => {
    dispatch(fetchLetters({
      type: activeTab !== 'ALL' ? activeTab : undefined,
      search: search || undefined,
    }))
  }

  useEffect(() => {
    loadData()
  }, [dispatch, activeTab])

  // Filter letters locally by status and text search
  const filteredLetters = useMemo(() => {
    return letters.filter((item) => {
      if (activeTab !== 'ALL' && item.letterType !== activeTab) return false
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = item.recipientName?.toLowerCase().includes(q)
        const matchRef = item.referenceNumber?.toLowerCase().includes(q)
        const matchDesig = item.designation?.toLowerCase().includes(q)
        const matchEmail = item.recipientEmail?.toLowerCase().includes(q)
        const matchDept = item.department?.toLowerCase().includes(q)
        if (!matchName && !matchRef && !matchDesig && !matchEmail && !matchDept) return false
      }

      return true
    })
  }, [letters, activeTab, statusFilter, search])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = letters.length
    const offer = letters.filter((l) => l.letterType === 'OFFER_LETTER').length
    const exp = letters.filter((l) => l.letterType === 'EXPERIENCE_CERTIFICATE').length
    const rel = letters.filter((l) => l.letterType === 'RELIEVING_LETTER').length
    const sent = letters.filter((l) => l.status === 'SENT').length
    return { total, offer, exp, rel, sent }
  }, [letters])

  // Direct download handler
  const handleDownload = async (letter) => {
    try {
      const token = localStorage.getItem('token')
      const selectedCompanyId = localStorage.getItem('selectedCompanyId')
      const headers = { Authorization: `Bearer ${token}` }
      if (selectedCompanyId) headers['X-Company-Id'] = selectedCompanyId

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

  // Delete confirm handler
  const onConfirmDelete = async () => {
    if (!deleteModal.id) return
    try {
      await dispatch(deleteLetter(deleteModal.id)).unwrap()
      toast.success('Document deleted')
      loadData()
    } catch (err) {
      toast.error(err || 'Failed to delete')
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

  const columns = [
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
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.letterType
        if (type === 'OFFER_LETTER') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <BriefcaseIcon className="w-3.5 h-3.5" />
              Offer Letter
            </span>
          )
        }
        if (type === 'EXPERIENCE_CERTIFICATE') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <AcademicCapIcon className="w-3.5 h-3.5" />
              Experience Cert
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
            <DocumentTextIcon className="w-3.5 h-3.5" />
            Relieving Letter
          </span>
        )
      },
    },
    {
      accessorKey: 'recipientName',
      header: 'Recipient',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-gray-900 text-sm">
            {row.original.recipientName}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-xs">
            {row.original.recipientEmail || 'No email provided'}
          </div>
        </div>
      ),
    },
    {
      id: 'position',
      header: 'Position & Dept',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-gray-800">
            {row.original.designation || '—'}
          </div>
          <div className="text-xs text-gray-500">
            {row.original.department || '—'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'issueDate',
      header: 'Issued Date',
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 font-medium">
          {row.original.issueDate || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status || 'DRAFT'
        if (s === 'SENT') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <PaperAirplaneIcon className="w-3 h-3" />
              Sent via Email
            </span>
          )
        }
        if (s === 'ISSUED') {
          return <Badge label="Issued" variant="info" />
        }
        return <Badge label="Draft" variant="default" />
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const l = row.original
        return (
          <div className="flex items-center gap-1.5">
            {/* Preview & Print */}
            <button
              type="button"
              title="Preview & Print Document"
              onClick={() => setPreviewModal({ open: true, letter: l })}
              className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>

            {/* Direct Download */}
            <button
              type="button"
              title="Download PDF"
              onClick={() => handleDownload(l)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>

            {/* Send via Email */}
            <button
              type="button"
              title="Send via Email"
              onClick={() => setEmailModal({ open: true, letter: l })}
              className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button
              type="button"
              title="Edit Details"
              onClick={() => setFormModal({ open: true, type: l.letterType, target: l })}
              className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              type="button"
              title="Delete Document"
              onClick={() => setDeleteModal({ open: true, id: l.id })}
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Letters & Certificates"
        subtitle="Create, generate, preview, print, download, and email official Offer Letters, Experience Certificates, and Relieving Letters"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFormModal({ open: true, type: 'OFFER_LETTER', target: null })}
            >
              <PlusIcon className="w-4 h-4 mr-1 text-indigo-600" />
              + Offer Letter
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFormModal({ open: true, type: 'EXPERIENCE_CERTIFICATE', target: null })}
            >
              <PlusIcon className="w-4 h-4 mr-1 text-emerald-600" />
              + Experience Cert
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFormModal({ open: true, type: 'RELIEVING_LETTER', target: null })}
            >
              <PlusIcon className="w-4 h-4 mr-1 text-purple-600" />
              + Relieving Letter
            </Button>
            <Button
              size="sm"
              onClick={() => setFormModal({ open: true, type: 'OFFER_LETTER', target: null })}
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Create Document
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Documents</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          <span className="text-2xs text-gray-400 mt-0.5 block">{stats.sent} dispatched via email</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Offer Letters</p>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.offer}</p>
          <span className="text-2xs text-gray-400 mt-0.5 block">Employment appointments</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Experience Certs</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.exp}</p>
          <span className="text-2xs text-gray-400 mt-0.5 block">Service credentials</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Relieving Letters</p>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.rel}</p>
          <span className="text-2xs text-gray-400 mt-0.5 block">Clearance orders</span>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {TABS.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidate, ref #, role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="SENT">Sent via Email</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredLetters}
          loading={loading}
          emptyText="No letters or certificates found. Click 'Create Document' to generate one."
        />
      </div>

      {/* Creation / Edit Modal */}
      <LetterFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, type: 'OFFER_LETTER', target: null })}
        initialType={formModal.type}
        editTarget={formModal.target}
        onSuccess={loadData}
      />

      {/* PDF Document Preview & Print Modal */}
      <LetterPreviewModal
        open={previewModal.open}
        onClose={() => setPreviewModal({ open: false, letter: null })}
        letter={previewModal.letter}
        onSendEmail={(l) => {
          setPreviewModal({ open: false, letter: null })
          setEmailModal({ open: true, letter: l })
        }}
      />

      {/* Send Email Modal */}
      <SendLetterEmailModal
        open={emailModal.open}
        onClose={() => setEmailModal({ open: false, letter: null })}
        letter={emailModal.letter}
        onSuccess={loadData}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
      />
    </div>
  )
}
