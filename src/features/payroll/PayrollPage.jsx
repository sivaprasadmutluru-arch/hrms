import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { ChevronDownIcon, ChevronRightIcon, TrashIcon, EnvelopeIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import PdfPreviewModal from '../../components/common/PdfPreviewModal'
import ConfirmModal from '../../components/common/ConfirmModal'
import {
  fetchPayslips, exportPayslipsExcel, generatePayslip, generateBulkPayslips,
  deletePayslip, deletePayslipGroup, confirmPayslip, markPaid, sendPayslipEmail,
  selectLoading, selectExportingExcel,
} from './payrollSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from '../employees/employeesSlice'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'
import useCurrency from '../../hooks/useCurrency'

const STATUS_VARIANT = {
  PAID: 'success',
  CONFIRMED: 'primary',
  DRAFT: 'default',
  REVIEW_ONGOING: 'warning',
  MIXED: 'secondary',
}

const PAYSLIP_STATUSES = ['DRAFT', 'REVIEW_ONGOING', 'CONFIRMED', 'PAID']

function groupStatus(payslips) {
  const statuses = [...new Set(payslips.map(p => p.status).filter(Boolean))]
  return statuses.length === 1 ? statuses[0] : 'MIXED'
}

export default function PayrollPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const formatCurrency = useCurrency().format
  const companyId = effectiveCompanyId
  const payslips = useSelector(s => s.payroll.payslips)
  const employees = useSelector(selectEmployees)
  const loading = useSelector(selectLoading)
  const exportingExcel = useSelector(selectExportingExcel)

  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [exportingGroupKey, setExportingGroupKey] = useState(null)
  const [exportModal, setExportModal] = useState(false)
  const [generateModal, setGenerateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // payslipId or 'bulk'
  const [pdfPreviewId, setPdfPreviewId] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, id: null, group: null, count: null })

  const { register: regExport, handleSubmit: handleExportSubmit, reset: resetExport } = useForm()
  const { register: regGen, handleSubmit: handleGenSubmit, reset: resetGen, watch: watchGen } = useForm({
    defaultValues: { mode: 'bulk' },
  })
  const genMode = watchGen('mode')

  useEffect(() => {
    dispatch(fetchPayslips({ page: 0, size: 100 }))
    dispatch(fetchEmployees({ page: 0, size: 100 }))
  }, [dispatch])

  // Group payslips by groupName, fall back to period key
  const groups = useMemo(() => {
    const map = {}
    payslips.forEach(p => {
      const key = p.groupName || `${p.startDate}__${p.endDate}`
      if (!map[key]) {
        map[key] = {
          key,
          groupName: p.groupName || null,
          startDate: p.startDate,
          endDate: p.endDate,
          payslips: [],
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
        }
      }
      map[key].payslips.push(p)
      map[key].totalGross += Number(p.grossPay) || 0
      map[key].totalDeductions += Number(p.deduction) || 0
      map[key].totalNet += Number(p.netPay) || 0
    })
    return Object.values(map).sort((a, b) => {
      if (!a.startDate) return 1
      if (!b.startDate) return -1
      return b.startDate.localeCompare(a.startDate)
    })
  }, [payslips])

  const allPayslipIds = useMemo(() => payslips.map(p => p.id), [payslips])

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectGroup = (groupPayslips) => {
    const ids = groupPayslips.map(p => p.id)
    const allSelected = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach(id => next.delete(id))
      } else {
        ids.forEach(id => next.add(id))
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === allPayslipIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allPayslipIds))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // ── Per-row actions ────────────────────────────────────────────────────────
  const handleDownloadPdf = (id) => setPdfPreviewId(id)

  const handleConfirmOne = async (id) => {
    setActionLoading(id)
    try {
      await dispatch(confirmPayslip(id)).unwrap()
      toast.success('Payslip confirmed')
    } catch (e) {
      toast.error(e || 'Failed to confirm')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkPaidOne = async (id) => {
    setActionLoading(id)
    try {
      await dispatch(markPaid(id)).unwrap()
      toast.success('Marked as paid')
    } catch (e) {
      toast.error(e || 'Failed to mark paid')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteOne = (id) => setConfirmModal({ open: true, action: 'one', id, group: null, count: null })

  const onConfirmDelete = async () => {
    const { action, id, group, count } = confirmModal
    setConfirmModal(prev => ({ ...prev, open: false }))
    if (action === 'one') {
      setActionLoading(id)
      try {
        await dispatch(deletePayslip(id)).unwrap()
        toast.success('Payslip deleted')
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
      } catch (e) { toast.error(e || 'Failed to delete') }
      finally { setActionLoading(null) }
    } else if (action === 'bulk') {
      setActionLoading('bulk')
      try {
        await dispatch(deletePayslipGroup([...selectedIds])).unwrap()
        toast.success(`${count} payslip(s) deleted`)
        clearSelection()
      } catch (e) { toast.error(e || 'Bulk delete failed') }
      finally { setActionLoading(null) }
    } else if (action === 'group') {
      setActionLoading('bulk')
      try {
        await dispatch(deletePayslipGroup(group.payslips.map(p => p.id))).unwrap()
        toast.success('Payroll group deleted')
        clearSelection()
      } catch (e) { toast.error(e || 'Failed to delete group') }
      finally { setActionLoading(null) }
    }
  }

  const handleEmailOne = async (id) => {
    setActionLoading(id)
    try {
      await dispatch(sendPayslipEmail(id)).unwrap()
      toast.success('Email sent')
    } catch (e) {
      toast.error(e || 'Failed to send email')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkEmail = async () => {
    const ids = [...selectedIds]
    setActionLoading('bulk')
    let sent = 0
    for (const id of ids) {
      try { await dispatch(sendPayslipEmail(id)).unwrap(); sent++ } catch { /* continue */ }
    }
    toast.success(`Sent ${sent}/${ids.length} emails`)
    setActionLoading(null)
  }

  const handleBulkDelete = () => setConfirmModal({ open: true, action: 'bulk', id: null, group: null, count: selectedIds.size })

  const handleDeleteGroup = (e, group) => {
    e.stopPropagation()
    setConfirmModal({ open: true, action: 'group', id: null, group, count: group.payslips.length })
  }

  const handleBulkConfirm = async () => {
    const ids = [...selectedIds]
    setActionLoading('bulk')
    let done = 0
    for (const id of ids) {
      try { await dispatch(confirmPayslip(id)).unwrap(); done++ } catch { /* continue */ }
    }
    toast.success(`Confirmed ${done}/${ids.length} payslip(s)`)
    setActionLoading(null)
  }

  const handleBulkMarkPaid = async () => {
    const ids = [...selectedIds]
    setActionLoading('bulk')
    let done = 0
    for (const id of ids) {
      try { await dispatch(markPaid(id)).unwrap(); done++ } catch { /* continue */ }
    }
    toast.success(`Marked ${done}/${ids.length} as paid`)
    setActionLoading(null)
  }

  const handleExportExcel = async (formData) => {
    const filters = {}
    if (formData.status) filters.status = formData.status
    if (formData.startDate) filters.startDate = formData.startDate
    if (formData.endDate) filters.endDate = formData.endDate
    try {
      await dispatch(exportPayslipsExcel(filters)).unwrap()
      toast.success('Excel export downloaded')
      setExportModal(false)
      resetExport()
    } catch (e) {
      toast.error(e || 'Export failed')
    }
  }

  const handleGenerate = async (formData) => {
    if (!companyId) return toast.error('Company not found')
    if (!formData.startDate || !formData.endDate) return toast.error('Start and end dates are required')
    setGenerating(true)
    try {
      if (formData.mode === 'bulk') {
        await dispatch(generateBulkPayslips({ companyId, startDate: formData.startDate, endDate: formData.endDate })).unwrap()
        toast.success('Payslips generated for all active employees')
      } else {
        if (!formData.employeeId) return toast.error('Select an employee')
        await dispatch(generatePayslip({ employeeId: formData.employeeId, startDate: formData.startDate, endDate: formData.endDate, companyId })).unwrap()
        toast.success('Payslip generated')
      }
      setGenerateModal(false)
      resetGen({ mode: 'bulk' })
      dispatch(fetchPayslips({ page: 0, size: 500 }))
    } catch (e) {
      toast.error(e || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleExportGroup = async (e, group) => {
    e.stopPropagation()
    setExportingGroupKey(group.key)
    try {
      await dispatch(exportPayslipsExcel({
        startDate: group.startDate,
        endDate: group.endDate,
      })).unwrap()
      toast.success(`Excel downloaded for ${group.groupName || group.startDate}`)
    } catch (e) {
      toast.error(e || 'Export failed')
    } finally {
      setExportingGroupKey(null)
    }
  }

  const isBulkLoading = actionLoading === 'bulk'

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Payroll runs grouped by batch and pay period"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => { resetGen({ mode: 'bulk' }); setGenerateModal(true) }}>
              Generate Payroll
            </Button>
            <Button variant="secondary" onClick={() => { resetExport(); setExportModal(true) }} disabled={exportingExcel}>
              {exportingExcel ? 'Exporting…' : 'Export Excel'}
            </Button>
          </div>
        }
      />

      {/* ── Bulk action bar ──────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
          <span className="font-medium text-indigo-700 flex-shrink-0">
            {selectedIds.size} selected
          </span>
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={handleBulkEmail}
              disabled={isBulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <EnvelopeIcon className="h-3.5 w-3.5" />
              Bulk Email
            </button>
            <button
              onClick={handleBulkConfirm}
              disabled={isBulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-indigo-300 bg-white text-indigo-700 text-xs font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              Confirm All
            </button>
            <button
              onClick={handleBulkMarkPaid}
              disabled={isBulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-300 bg-white text-emerald-700 text-xs font-medium hover:bg-emerald-50 disabled:opacity-50 transition-colors"
            >
              Mark All Paid
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-300 bg-white text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Bulk Delete
            </button>
          </div>
          <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading payroll data…</div>
      ) : groups.length === 0 ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">No payroll records found.</div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = expandedGroups.has(group.key)
            const status = groupStatus(group.payslips)
            const label = group.groupName || (group.startDate ? `${group.startDate} – ${group.endDate}` : 'Ungrouped')
            const groupIds = group.payslips.map(p => p.id)
            const allGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id))
            const someGroupSelected = groupIds.some(id => selectedIds.has(id))

            return (
              <div key={group.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">

                {/* ── Group header row ─────────────────────────────────── */}
                <div className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                  {/* Group checkbox */}
                  <input
                    type="checkbox"
                    checked={allGroupSelected}
                    ref={el => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected }}
                    onChange={() => toggleSelectGroup(group.payslips)}
                    onClick={e => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 cursor-pointer"
                  />

                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="flex-1 flex items-center gap-4 text-left min-w-0"
                  >
                    <span className="text-gray-400 flex-shrink-0">
                      {isOpen
                        ? <ChevronDownIcon className="h-4 w-4" />
                        : <ChevronRightIcon className="h-4 w-4" />}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{label}</p>
                      {group.groupName && group.startDate && (
                        <p className="text-xs text-gray-400 mt-0.5">{group.startDate} – {group.endDate}</p>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-8 text-sm flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">Employees</p>
                        <p className="font-medium text-gray-700">{group.payslips.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">Gross Pay</p>
                        <p className="font-medium text-gray-700">{formatCurrency(group.totalGross)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">Deductions</p>
                        <p className="font-medium text-red-600">{formatCurrency(group.totalDeductions)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">Net Pay</p>
                        <p className="font-semibold text-emerald-700">{formatCurrency(group.totalNet)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">Status</p>
                        <Badge label={status.replace('_', ' ')} variant={STATUS_VARIANT[status] || 'default'} />
                      </div>
                    </div>
                  </button>

                  <div
                    onClick={(e) => handleExportGroup(e, group)}
                    role="button"
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors flex-shrink-0 ${
                      exportingGroupKey === group.key
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer'
                    }`}
                  >
                    {exportingGroupKey === group.key ? 'Exporting…' : 'Excel ↓'}
                  </div>
                  <button
                    onClick={(e) => handleDeleteGroup(e, group)}
                    disabled={isBulkLoading}
                    className="px-3 py-1.5 rounded-md border border-red-300 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>

                {/* ── Expanded individual payslips ─────────────────────── */}
                {isOpen && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="px-3 py-2 text-center font-medium">
                            <input
                              type="checkbox"
                              checked={allGroupSelected}
                              ref={el => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected }}
                              onChange={() => toggleSelectGroup(group.payslips)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-5 py-2 text-left font-medium">Employee</th>
                          <th className="px-4 py-2 text-right font-medium">Basic Pay</th>
                          <th className="px-4 py-2 text-right font-medium">Housing</th>
                          <th className="px-4 py-2 text-right font-medium">Transport</th>
                          <th className="px-4 py-2 text-right font-medium">Other Allow.</th>
                          <th className="px-4 py-2 text-right font-medium">Gross Pay</th>
                          <th className="px-4 py-2 text-right font-medium">Deductions</th>
                          <th className="px-4 py-2 text-right font-medium">Net Pay</th>
                          <th className="px-4 py-2 text-center font-medium">Status</th>
                          <th className="px-4 py-2 text-center font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.payslips.map(p => {
                          const emp = p.employee
                          const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
                          let payHead = null
                          try { payHead = p.payHeadData ? JSON.parse(p.payHeadData) : null } catch { /* ignore */ }
                          const allowances = payHead?.allowances ?? []
                          const housingAllow = p.housingAllowance || allowances.find(a => a.title?.toLowerCase().includes('housing'))?.amount || 0
                          const transportAllow = p.transportAllowance || allowances.find(a => a.title?.toLowerCase().includes('transport'))?.amount || 0
                          const otherAllow = p.otherAllowance || allowances.find(a => a.title?.toLowerCase().includes('other'))?.amount || 0
                          const isRowLoading = actionLoading === p.id
                          const isSelected = selectedIds.has(p.id)

                          return (
                            <tr
                              key={p.id}
                              className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                            >
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(p.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-5 py-2.5 font-medium text-gray-800">{name}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(p.basicPay)}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(housingAllow)}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(transportAllow)}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(otherAllow)}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(p.grossPay)}</td>
                              <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(p.deduction)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(p.netPay)}</td>
                              <td className="px-4 py-2.5 text-center">
                                <Badge label={(p.status || 'DRAFT').replace('_', ' ')} variant={STATUS_VARIANT[p.status] || 'default'} />
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {/* PDF Preview */}
                                  <button
                                    onClick={() => handleDownloadPdf(p.id)}
                                    disabled={isRowLoading}
                                    title="Preview PDF"
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-40"
                                  >
                                    <DocumentTextIcon className="h-3.5 w-3.5" />
                                  </button>
                                  {/* Email */}
                                  <button
                                    onClick={() => handleEmailOne(p.id)}
                                    disabled={isRowLoading}
                                    title="Send Email"
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                                  >
                                    <EnvelopeIcon className="h-3.5 w-3.5" />
                                  </button>
                                  {/* Confirm */}
                                  {p.status === 'DRAFT' && (
                                    <button
                                      onClick={() => handleConfirmOne(p.id)}
                                      disabled={isRowLoading}
                                      className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors disabled:opacity-40"
                                    >
                                      {isRowLoading ? '…' : 'Confirm'}
                                    </button>
                                  )}
                                  {/* Mark Paid */}
                                  {p.status === 'CONFIRMED' && (
                                    <button
                                      onClick={() => handleMarkPaidOne(p.id)}
                                      disabled={isRowLoading}
                                      className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors disabled:opacity-40"
                                    >
                                      {isRowLoading ? '…' : 'Mark Paid'}
                                    </button>
                                  )}
                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteOne(p.id)}
                                    disabled={isRowLoading}
                                    title="Delete"
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                                  >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 text-sm font-semibold border-t border-gray-200">
                        <tr>
                          <td className="px-3 py-2.5" />
                          <td className="px-5 py-2.5 text-gray-500">Total ({group.payslips.length})</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">—</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600">—</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600">—</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600">—</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(group.totalGross)}</td>
                          <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(group.totalDeductions)}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-700">{formatCurrency(group.totalNet)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Select All footer (when payslips exist) */}
      {!loading && payslips.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <button onClick={toggleSelectAll} className="hover:text-indigo-600 underline underline-offset-2">
            {selectedIds.size === allPayslipIds.length ? 'Deselect All' : 'Select All'} ({allPayslipIds.length})
          </button>
          {selectedIds.size > 0 && (
            <span className="text-indigo-600 font-medium">{selectedIds.size} selected</span>
          )}
        </div>
      )}

      {/* Generate Payroll Modal */}
      <Modal
        open={generateModal}
        onClose={() => setGenerateModal(false)}
        title="Generate Payroll"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGenerateModal(false)}>Cancel</Button>
            <Button onClick={handleGenSubmit(handleGenerate)} disabled={generating}>
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...regGen('mode')}
            >
              <option value="bulk">All active employees</option>
              <option value="single">Single employee</option>
            </select>
          </div>
          {genMode === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...regGen('employeeId')}
              >
                <option value="">— Select employee —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {[emp.firstName, emp.lastName].filter(Boolean).join(' ') || `Employee #${emp.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input label="Pay Period Start" type="date" {...regGen('startDate')} />
          <Input label="Pay Period End" type="date" {...regGen('endDate')} />
        </div>
      </Modal>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={!!pdfPreviewId}
        onClose={() => setPdfPreviewId(null)}
        payslipId={pdfPreviewId}
      />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: null, id: null, group: null, count: null })}
        onConfirm={onConfirmDelete}
        title={confirmModal.action === 'one' ? 'Delete Payslip' : confirmModal.action === 'bulk' ? 'Delete Selected Payslips' : 'Delete Payroll Group'}
        message={
          confirmModal.action === 'one' ? 'Are you sure you want to delete this payslip? This cannot be undone.' :
          confirmModal.action === 'bulk' ? `Delete ${confirmModal.count} selected payslip(s)? This cannot be undone.` :
          `Delete all ${confirmModal.count} payslip(s) in this group? This cannot be undone.`
        }
        confirmLabel="Delete"
        loading={isBulkLoading}
      />

      {/* Export Excel Modal */}
      <Modal
        open={exportModal}
        onClose={() => setExportModal(false)}
        title="Export Payroll to Excel"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setExportModal(false)}>Cancel</Button>
            <Button onClick={handleExportSubmit(handleExportExcel)} disabled={exportingExcel}>
              {exportingExcel ? 'Downloading…' : 'Download Excel'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Downloads a two-sheet Excel file (Summary + Detailed). Leave filters blank to export all payroll records.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...regExport('status')}
            >
              <option value="">All statuses</option>
              {PAYSLIP_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <Input label="From Date" type="date" {...regExport('startDate')} />
          <Input label="To Date" type="date" {...regExport('endDate')} />
        </div>
      </Modal>
    </div>
  )
}
