import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  fetchEmployeePayslips, fetchMonthPayslips,
  confirmPayslip, markPaid, submitPayslip, reopenPayslip,
  submitPayslipsBulk, confirmPayslipsBulk, markPaidBulk,
  generateBulkPayslips, selectLoading, sendPayslipEmail, exportPayslipsExcel,
} from './payrollSlice'
import { useForm } from 'react-hook-form'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import PdfPreviewModal from '../../components/common/PdfPreviewModal'
import useCurrency from '../../hooks/useCurrency'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  FolderIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

const STATUS_VARIANT = {
  PAID: 'success',
  CONFIRMED: 'primary',
  DRAFT: 'default',
  REVIEW_ONGOING: 'warning',
}

const STATUS_LABEL = {
  DRAFT: 'Draft',
  REVIEW_ONGOING: 'Pending',
  CONFIRMED: 'Approved',
  PAID: 'Paid',
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function PayslipsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isEmployee, isAccountant, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin, isHRManager } = useAuth()
  const isEmp = isEmployee()
  // Can approve/pay/reopen payslips — roles with payroll:approve authority
  const canApprovePayroll = isAccountant() || isBranchAdmin() || isEnterpriseAdmin() || isPlatformAdmin()
  // Can submit Draft payslips for review — HR prepares/submits (PAY-006 req #7), Accountant/admins too
  const canSubmitPayslip = canApprovePayroll || isHRManager()
  const formatCurrency = useCurrency().format
  const employeePayslips = useSelector(s => s.payroll.payslips)
  const monthPayslips = useSelector(s => s.payroll.monthPayslips)
  const payslips = isEmp ? employeePayslips : monthPayslips
  const loading = useSelector(selectLoading)
  const [detail, setDetail] = useState(null)
  const [genModal, setGenModal] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  // Month-folder navigation (PAY-006 req #2-4) — admin/HR/accountant view only
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(null) // 1-12, null = folder grid

  // Bulk approval (PAY-006 req #5/#10/#11)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(null) // { action, label, ids }
  const [payModal, setPayModal] = useState(null) // { id } | { bulk: true, ids }
  const [reopenModal, setReopenModal] = useState(null) // { id }
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [reopenReason, setReopenReason] = useState('')

  useEffect(() => {
    if (isEmp && user?.employeeId) {
      dispatch(fetchEmployeePayslips(user.employeeId))
    } else if (!isEmp) {
      dispatch(fetchMonthPayslips({ year: selectedYear }))
    }
  }, [dispatch, isEmp, user?.employeeId, selectedYear])

  const reload = () => dispatch(fetchMonthPayslips({ year: selectedYear }))
  const openMonth = (month) => {
    setSelectedMonth(month)
    setSelectedIds(new Set())
    setSearch('')
  }
  const backToMonths = () => {
    setSelectedMonth(null)
    setSelectedIds(new Set())
    setSearch('')
  }
  const changeYear = (year) => {
    setSelectedYear(year)
    setSelectedMonth(null)
    setSelectedIds(new Set())
    setSearch('')
  }

  const handleConfirm = async (id) => {
    try { await dispatch(confirmPayslip(id)).unwrap(); toast.success('Payslip approved') } catch (e) { toast.error(e || 'Failed') }
  }
  const handleSubmitForReview = async (id) => {
    try { await dispatch(submitPayslip(id)).unwrap(); toast.success('Submitted for review') } catch (e) { toast.error(e || 'Failed') }
  }
  const handleSendEmail = async (id) => {
    try { await dispatch(sendPayslipEmail(id)).unwrap(); toast.success('Email sent') } catch (e) { toast.error(e || 'Failed to send email') }
  }

  const getPayslipCompanyId = (payslip) => payslip?.companyId || payslip?.company?.id || payslip?.employee?.companyId || payslip?.employee?.company?.id || null
  const handleDownloadPdf = (payslip) => setPdfPreview({
    id: payslip.id,
    companyId: getPayslipCompanyId(payslip),
  })

  const submitPayment = async () => {
    if (!payModal) return
    try {
      if (payModal.bulk) {
        const result = await dispatch(markPaidBulk({
          payslipIds: payModal.ids, selectAll: false, paymentReference, paymentDate,
        })).unwrap()
        toast.success(`Marked ${result.succeeded.length} paid${result.failed.length ? `, ${result.failed.length} failed` : ''}`)
        setSelectedIds(new Set())
      } else {
        await dispatch(markPaid({ id: payModal.id, paymentReference, paymentDate })).unwrap()
        toast.success('Marked as paid')
      }
      setPayModal(null)
      setPaymentReference('')
      reload()
    } catch (e) { toast.error(e || 'Failed') }
  }

  const submitReopen = async () => {
    if (!reopenModal) return
    try {
      await dispatch(reopenPayslip({ id: reopenModal.id, reason: reopenReason })).unwrap()
      toast.success('Payslip reopened')
      setReopenModal(null)
      setReopenReason('')
      reload()
    } catch (e) { toast.error(e || 'Failed') }
  }

  const runBulkAction = async () => {
    if (!bulkConfirm) return
    const { action, ids } = bulkConfirm
    try {
      let result
      if (action === 'submit') result = await dispatch(submitPayslipsBulk({ payslipIds: ids, selectAll: false })).unwrap()
      if (action === 'confirm') result = await dispatch(confirmPayslipsBulk({ payslipIds: ids, selectAll: false })).unwrap()
      toast.success(`${result.succeeded.length} succeeded${result.failed.length ? `, ${result.failed.length} failed` : ''}`)
      setSelectedIds(new Set())
      setBulkConfirm(null)
      reload()
    } catch (e) { toast.error(e || 'Bulk action failed'); setBulkConfirm(null) }
  }

  const handleBulkGenerate = async (formData) => {
    try {
      const result = await dispatch(generateBulkPayslips({
        companyId: user?.companyId,
        startDate: formData.startDate,
        endDate: formData.endDate,
      })).unwrap()
      toast.success(`Generated ${result.length} payslip(s)`)
      setGenModal(false)
      reset()
      reload()
    } catch (e) { toast.error(e || 'Generation failed') }
  }

  // Group into Year > Month folders (PAY-006 req #2/3)
  const monthGroups = useMemo(() => {
    const groups = {}
    for (const p of payslips) {
      if (!p.startDate) continue
      const month = Number(p.startDate.slice(5, 7))
      groups[month] = groups[month] || []
      groups[month].push(p)
    }
    return groups
  }, [payslips])

  const monthList = isEmp ? payslips : (selectedMonth ? (monthGroups[selectedMonth] || []) : [])
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = new Set([selectedYear])
    for (let year = currentYear + 1; year >= currentYear - 5; year -= 1) years.add(year)
    for (const p of payslips) {
      if (p.startDate) years.add(Number(p.startDate.slice(0, 4)))
    }
    return Array.from(years).filter(Boolean).sort((a, b) => b - a)
  }, [payslips, selectedYear])

  const monthCards = useMemo(() => MONTH_NAMES.map((name, index) => {
    const month = index + 1
    const rows = monthGroups[month] || []
    const netPay = rows.reduce((sum, p) => sum + (Number(p.netPay) || 0), 0)
    return {
      month,
      name,
      rows,
      netPay,
      paid: rows.filter(p => p.status === 'PAID').length,
      approved: rows.filter(p => p.status === 'CONFIRMED').length,
      pending: rows.filter(p => p.status === 'DRAFT' || p.status === 'REVIEW_ONGOING').length,
    }
  }), [monthGroups])

  const filtered = search
    ? monthList.filter(p => {
        const emp = p.employee
        const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : ''
        return `${name} ${p.status || ''} ${p.startDate || ''}`.toLowerCase().includes(search.toLowerCase())
      })
    : monthList

  const paidCount = payslips.filter(p => p.status === 'PAID').length
  const pendingCount = payslips.filter(p => p.status === 'DRAFT' || p.status === 'REVIEW_ONGOING').length
  const confirmedCount = payslips.filter(p => p.status === 'CONFIRMED').length

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    const visibleIds = filtered.map(p => p.id)
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) visibleIds.forEach(id => next.delete(id))
      else visibleIds.forEach(id => next.add(id))
      return next
    })
  }

  // Bulk bar only makes sense when every selected row shares the same current status
  const selectedRows = filtered.filter(p => selectedIds.has(p.id))
  const selectedRowIds = selectedRows.map(p => p.id)
  const allVisibleSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
  const selectedStatus = selectedRows.length > 0 && selectedRows.every(p => p.status === selectedRows[0].status)
    ? selectedRows[0].status : null

  const columns = [
    ...(!isEmp ? [{
      id: 'select',
      header: () => (
        <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={allVisibleSelected}
          onChange={toggleSelectAll} />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={selectedIds.has(row.original.id)}
          onChange={(e) => { e.stopPropagation(); toggleSelected(row.original.id) }}
          onClick={(e) => e.stopPropagation()} />
      ),
    }] : []),
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold flex-shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-gray-900 text-sm">{name}</span>
          </div>
        )
      },
    },
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => {
        const { startDate, endDate } = row.original
        return (
          <span className="text-sm text-gray-600">
            {startDate && endDate ? `${startDate} – ${endDate}` : startDate || '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'grossPay',
      header: 'Gross',
      cell: ({ getValue }) => <span className="text-sm text-gray-700 tabular-nums">{formatCurrency(getValue())}</span>,
    },
    {
      accessorKey: 'deduction',
      header: 'Deductions',
      cell: ({ getValue }) => <span className="text-sm text-red-500 tabular-nums">{formatCurrency(getValue())}</span>,
    },
    {
      accessorKey: 'netPay',
      header: 'Net Pay',
      cell: ({ getValue }) => <span className="text-sm font-semibold text-emerald-700 tabular-nums">{formatCurrency(getValue())}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge label={STATUS_LABEL[getValue()] || 'Draft'} variant={STATUS_VARIANT[getValue()] || 'default'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDetail(row.original)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View"
          >
            <DocumentTextIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDownloadPdf(row.original)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download PDF"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
          {canApprovePayroll && (
            <button
              onClick={() => handleSendEmail(row.original.id)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Send Email"
            >
              <EnvelopeIcon className="h-4 w-4" />
            </button>
          )}
          {canSubmitPayslip && row.original.status === 'DRAFT' && (
            <button
              onClick={() => handleSubmitForReview(row.original.id)}
              className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
              Submit
            </button>
          )}
          {canApprovePayroll && row.original.status === 'REVIEW_ONGOING' && (
            <button
              onClick={() => handleConfirm(row.original.id)}
              className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Approve
            </button>
          )}
          {canApprovePayroll && row.original.status === 'CONFIRMED' && (
            <button
              onClick={() => { setPayModal({ id: row.original.id }); setPaymentReference('') }}
              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              Mark Paid
            </button>
          )}
          {canApprovePayroll && row.original.status === 'PAID' && (
            <button
              onClick={() => { setReopenModal({ id: row.original.id }); setReopenReason('') }}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reopen
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="payroll-workspace space-y-5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col gap-5 rounded-2xl border border-[#DCE7F2] bg-gradient-to-r from-white via-white to-[#F2F7FD] px-5 py-5 shadow-[0_8px_24px_rgba(30,65,96,0.045)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FC] text-[#2D6FB4] ring-1 ring-inset ring-[#D7E6F7]">
            <DocumentTextIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6B19]">Payroll · Records</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#17324F]">Payslips</h1>
            <p className="mt-1 text-sm text-slate-500">
            {isEmp ? 'Your payslips and earnings history' : 'Employee payslip management'}
            </p>
          </div>
        </div>
        {!isEmp && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              onClick={() => dispatch(exportPayslipsExcel({})).unwrap().catch(() => toast.error('Export failed'))}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D8E4F0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#35516E] shadow-sm transition hover:border-[#AFC9E4] hover:bg-[#F7FAFE]"
              title="Export to Excel"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={() => navigate('/payroll/import')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D8E4F0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#35516E] shadow-sm transition hover:border-[#AFC9E4] hover:bg-[#F7FAFE]"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import
            </button>
            {canApprovePayroll && (
              <button
                onClick={() => { reset({}); setGenModal(true) }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#286CB2] to-[#4389D2] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(48,116,186,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_22px_rgba(48,116,186,0.28)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate Payslips
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {!isEmp && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white px-5 py-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#4D8FD1]" />
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF5FD] text-[#3479BC] ring-1 ring-inset ring-[#DCEBFA]">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight tracking-tight text-[#17324F]">{payslips.length}</p>
              <p className="text-xs font-medium text-slate-500">Total payslips</p>
            </div>
          </div>
          <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white px-5 py-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#3E9B79]" />
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECF8F3] text-[#318367] ring-1 ring-inset ring-[#D8EFE5]">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight tracking-tight text-[#17324F]">{paidCount}</p>
              <p className="text-xs font-medium text-slate-500">Paid</p>
            </div>
          </div>
          <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white px-5 py-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#E7C65B]" />
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF8DF] text-[#98751D] ring-1 ring-inset ring-[#F4E7B8]">
              <CurrencyDollarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight tracking-tight text-[#17324F]">{confirmedCount}</p>
              <p className="text-xs font-medium text-slate-500">Confirmed</p>
            </div>
          </div>
          <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white px-5 py-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#D9A62A]" />
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF7E1] text-[#A47713] ring-1 ring-inset ring-[#F3E5B9]">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight tracking-tight text-[#17324F]">{pendingCount}</p>
              <p className="text-xs font-medium text-slate-500">Pending</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!isEmp && (
        <div className="rounded-2xl border border-[#DCE7F2] bg-white p-4 shadow-[0_7px_22px_rgba(30,65,96,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {selectedMonth && (
                <button
                  type="button"
                  onClick={backToMonths}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE7F2] bg-[#F7FAFD] px-3 py-2 text-sm font-semibold text-[#35516E] transition hover:bg-[#EDF4FB]"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Months
                </button>
              )}
              <select
                value={selectedYear}
                onChange={(e) => changeYear(Number(e.target.value))}
                className="rounded-xl border border-[#DCE7F2] bg-[#F8FAFC] px-3.5 py-2.5 text-sm font-semibold text-[#294766] outline-none transition focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA]"
              >
                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              {selectedMonth && (
                <span className="text-sm font-semibold text-gray-900">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              )}
            </div>

            {selectedMonth && (
              <div className="relative max-w-sm w-full sm:w-80">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search employee, status..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE7F2] bg-[#F8FAFC] py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA]"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {isEmp && (
        <div className="rounded-2xl border border-[#DCE7F2] bg-white p-4 shadow-[0_7px_22px_rgba(30,65,96,0.04)]">
          <div className="relative max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search status, period..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#DCE7F2] bg-[#F8FAFC] py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA]"
            />
          </div>
        </div>
      )}

      {!isEmp && !selectedMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {monthCards.map(card => (
            <button
              key={card.month}
              type="button"
              onClick={() => openMonth(card.month)}
              className="group relative overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white p-5 text-left shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition-all hover:-translate-y-0.5 hover:border-[#B7D0E9] hover:shadow-[0_14px_30px_rgba(30,65,96,0.09)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF5FD] text-[#3479BC] ring-1 ring-inset ring-[#DCEBFA] transition-colors group-hover:bg-[#E2EFFB]">
                    <FolderIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#17324F]">{card.name}</p>
                    <p className="text-xs text-slate-500">{card.rows.length} payslip{card.rows.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <span className="rounded-lg bg-[#FFF8E3] px-2.5 py-1.5 text-sm font-bold tabular-nums text-[#8E6A13]">{formatCurrency(card.netPay)}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-[#F1E5BF] bg-[#FFFAE9] px-2 py-2">
                  <p className="text-sm font-semibold text-amber-700">{card.pending}</p>
                  <p className="text-[11px] text-amber-700/80">Pending</p>
                </div>
                <div className="rounded-xl border border-[#DDEAF7] bg-[#F3F8FD] px-2 py-2">
                  <p className="text-sm font-semibold text-indigo-700">{card.approved}</p>
                  <p className="text-[11px] text-indigo-700/80">Approved</p>
                </div>
                <div className="rounded-xl border border-[#DDEFE7] bg-[#F1FAF6] px-2 py-2">
                  <p className="text-sm font-semibold text-emerald-700">{card.paid}</p>
                  <p className="text-[11px] text-emerald-700/80">Paid</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!isEmp && selectedMonth && selectedRows.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-[#17324F] to-[#285C8A] px-4 py-3 text-white shadow-[0_10px_24px_rgba(28,68,108,0.16)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">{selectedRows.length} selected</p>
            <p className="text-xs text-blue-100">
              {selectedStatus ? `${STATUS_LABEL[selectedStatus] || selectedStatus} payslips` : 'Select rows with the same status for bulk actions'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedStatus === 'DRAFT' && canSubmitPayslip && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setBulkConfirm({ action: 'submit', label: 'Submit for Review', ids: selectedRowIds })}
              >
                Submit Selected
              </Button>
            )}
            {selectedStatus === 'REVIEW_ONGOING' && canApprovePayroll && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setBulkConfirm({ action: 'confirm', label: 'Approve', ids: selectedRowIds })}
              >
                Approve Selected
              </Button>
            )}
            {selectedStatus === 'CONFIRMED' && canApprovePayroll && (
              <Button
                size="sm"
                variant="success"
                onClick={() => { setPayModal({ bulk: true, ids: selectedRowIds }); setPaymentReference('') }}
              >
                Mark Paid
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {(isEmp || selectedMonth) && (
        <div className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.055)]">
          <DataTable columns={columns} data={filtered} loading={loading} />
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Payslip Detail" size="md" panelClassName="payroll-form-modal">
        {detail && (() => {
          let payHead = null
          try { payHead = detail.payHeadData ? JSON.parse(detail.payHeadData) : null } catch { /* ignore */ }
          const wageType = payHead?.wage_type ?? 'MONTHLY'
          const workedUnits = payHead?.worked_units ?? 0
          const allowanceLines = payHead?.allowances ?? []
          const housingAllowance = payHead?.housing_allowance ?? 0
          const transportAllowance = payHead?.transport_allowance ?? 0
          const otherAllowance = payHead?.other_allowance ?? 0
          const basicPayDeductions = payHead?.basic_pay_deductions ?? []
          const grossPayDeductions = payHead?.gross_pay_deductions ?? []
          const pretaxDeductions = payHead?.pretax_deductions ?? []
          const taxDeductions = payHead?.tax_deductions ?? []
          const postTaxDeductions = payHead?.post_tax_deductions ?? []
          const netDeductions = payHead?.net_deductions ?? []
          const federalTax = payHead?.federal_tax ?? 0
          const taxableGrossPay = payHead?.taxable_gross_pay ?? 0
          const lossOfPay = payHead?.loss_of_pay ?? 0
          const loanRecovery = payHead?.loan_recovery ?? 0
          const salaryAdvanceDeduction = payHead?.salary_advance_deduction ?? 0
          const otherDeduction = payHead?.other_deduction ?? 0
          const overtime = payHead?.overtime_pay ?? payHead?.overtime ?? 0
          const salaryAdvance = payHead?.salary_advance ?? 0
          const bonus = payHead?.bonus ?? 0
          const totalAdditions = Number(overtime) + Number(salaryAdvance) + Number(bonus)
          const paidDays = payHead?.paid_days ?? 0
          const unpaidDays = payHead?.unpaid_days ?? 0
          const hasAnyDeductions = pretaxDeductions.length > 0 || taxDeductions.length > 0 ||
            postTaxDeductions.length > 0 || netDeductions.length > 0 || federalTax > 0
          const name = detail.employee
            ? `${detail.employee.firstName || ''} ${detail.employee.lastName || ''}`.trim()
            : '—'

          const DeductionGroup = ({ label, items, labelColor = 'text-gray-500' }) =>
            items.length > 0 ? (
              <div className="my-1">
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${labelColor}`}>{label}</p>
                {items.map((d, i) => (
                  <div key={i} className="py-0.5">
                    <div className="flex justify-between text-sm text-red-500">
                      <span className="text-gray-700">{d.title}</span>
                      <span>-{formatCurrency(d.amount)}</span>
                    </div>
                    {d.employer_contribution_amount > 0 && (
                      <div className="flex justify-between text-xs text-blue-500 pl-2">
                        <span className="text-gray-400">Employer contribution</span>
                        <span>+{formatCurrency(d.employer_contribution_amount)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null

          return (
            <div className="space-y-1">
              {/* Employee header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400">
                    {detail.startDate && detail.endDate ? `${detail.startDate} – ${detail.endDate}` : detail.startDate || '—'}
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge label={detail.status || 'Draft'} variant={STATUS_VARIANT[detail.status] || 'default'} />
                </div>
              </div>

              {detail.groupName && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">Group</span>
                  <span className="font-medium text-gray-800">{detail.groupName}</span>
                </div>
              )}

              <div className="my-3 border-t border-gray-100" />

              {/* ── Earnings ── */}
              {wageType === 'HOURLY' && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">Hours Worked</span>
                  <span className="font-medium text-gray-800">{Number(workedUnits).toFixed(2)} hrs</span>
                </div>
              )}
              {wageType === 'DAILY' && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">Days Worked</span>
                  <span className="font-medium text-gray-800">{Number(workedUnits).toFixed(2)} days</span>
                </div>
              )}
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">
                  {wageType === 'HOURLY' ? 'Basic Pay (Hourly)' : wageType === 'DAILY' ? 'Basic Pay (Daily)' : 'Basic Pay'}
                </span>
                <span className="font-medium text-gray-800">{formatCurrency(detail.basicPay)}</span>
              </div>

              {/* Basic pay deductions (reduce basic pay directly) */}
              {basicPayDeductions.length > 0 && (
                <div className="pl-2 border-l-2 border-red-200">
                  {basicPayDeductions.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 text-red-500">
                      <span className="text-gray-600">{d.title}</span>
                      <span>-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Allowances */}
              {(allowanceLines.length > 0 || housingAllowance > 0 || transportAllowance > 0 || otherAllowance > 0) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 my-2">
                  <p className="text-xs font-semibold text-emerald-800 mb-2 uppercase tracking-wide">Allowances</p>
                  {housingAllowance > 0 && (
                    <div className="flex justify-between text-sm py-0.5 text-emerald-700">
                      <span>Housing Allowance</span>
                      <span>+{formatCurrency(housingAllowance)}</span>
                    </div>
                  )}
                  {transportAllowance > 0 && (
                    <div className="flex justify-between text-sm py-0.5 text-emerald-700">
                      <span>Transport Allowance</span>
                      <span>+{formatCurrency(transportAllowance)}</span>
                    </div>
                  )}
                  {otherAllowance > 0 && (
                    <div className="flex justify-between text-sm py-0.5 text-emerald-700">
                      <span>Other Allowance</span>
                      <span>+{formatCurrency(otherAllowance)}</span>
                    </div>
                  )}
                  {allowanceLines.map((a, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 text-emerald-700">
                      <span>{a.title}{!a.is_taxable && <span className="ml-1 text-xs text-emerald-500">(non-taxable)</span>}</span>
                      <span>+{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {Number(lossOfPay) > 0 && (
                <div className="flex justify-between text-sm py-1 text-red-500">
                  <span>Loss of Pay (unpaid leave)</span>
                  <span>-{formatCurrency(lossOfPay)}</span>
                </div>
              )}
              {Number(loanRecovery) > 0 && (
                <div className="flex justify-between text-sm py-1 text-red-500">
                  <span>Loan Recovery</span>
                  <span>-{formatCurrency(loanRecovery)}</span>
                </div>
              )}
              {Number(salaryAdvanceDeduction) > 0 && (
                <div className="flex justify-between text-sm py-1 text-red-500">
                  <span>Salary Advance Recovery</span>
                  <span>-{formatCurrency(salaryAdvanceDeduction)}</span>
                </div>
              )}
              {Number(otherDeduction) > 0 && (
                <div className="flex justify-between text-sm py-1 text-red-500">
                  <span>Other Deduction</span>
                  <span>-{formatCurrency(otherDeduction)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm py-1 font-medium">
                <span className="text-gray-700">Gross Pay</span>
                <span className="text-gray-900">{formatCurrency(detail.grossPay)}</span>
              </div>

              {/* Gross pay deductions */}
              {grossPayDeductions.length > 0 && (
                <div className="pl-2 border-l-2 border-red-200">
                  {grossPayDeductions.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 text-red-500">
                      <span className="text-gray-600">{d.title}</span>
                      <span>-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Taxable gross pay (shown when different from gross) */}
              {taxableGrossPay > 0 && taxableGrossPay !== Number(detail.grossPay) && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">Taxable Gross Pay</span>
                  <span className="text-gray-500">{formatCurrency(taxableGrossPay)}</span>
                </div>
              )}

              {/* ── Deductions ── */}
              {hasAnyDeductions && (
                <>
                  <div className="my-3 border-t border-gray-100" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Deductions</p>
                  <DeductionGroup label="Pre-tax" items={pretaxDeductions} />
                  {federalTax > 0 && (
                    <div className="flex justify-between text-sm py-0.5 text-red-500">
                      <span className="text-gray-700">Federal Income Tax</span>
                      <span>-{formatCurrency(federalTax)}</span>
                    </div>
                  )}
                  <DeductionGroup label="Tax" items={taxDeductions} />
                  <DeductionGroup label="Post-tax" items={postTaxDeductions} />
                  <DeductionGroup label="Net Pay" items={netDeductions} />
                </>
              )}

              {!hasAnyDeductions && Number(detail.deduction) > 0 && (
                <div className="flex justify-between text-sm py-1 text-red-500">
                  <span>Total Deductions</span>
                  <span>-{formatCurrency(detail.deduction)}</span>
                </div>
              )}

              {/* ── Additions ── */}
              {totalAdditions > 0 && (
                <>
                  <div className="my-3 border-t border-gray-100" />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 my-2">
                    <p className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">Additions</p>
                    {Number(overtime) > 0 && (
                      <div className="flex justify-between text-sm py-0.5 text-blue-700">
                        <span>Overtime</span>
                        <span>+{formatCurrency(overtime)}</span>
                      </div>
                    )}
                    {Number(salaryAdvance) > 0 && (
                      <div className="flex justify-between text-sm py-0.5 text-blue-700">
                        <span>Salary Advance</span>
                        <span>+{formatCurrency(salaryAdvance)}</span>
                      </div>
                    )}
                    {Number(bonus) > 0 && (
                      <div className="flex justify-between text-sm py-0.5 text-blue-700">
                        <span>Bonus</span>
                        <span>+{formatCurrency(bonus)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Summary ── */}
              <div className="my-3 border-t border-gray-100" />

              {payHead && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">
                    Paid Days: <span className="text-gray-700 font-medium">{Number(paidDays).toFixed(1)}</span>
                    {unpaidDays > 0 && <span className="ml-3 text-red-400">Unpaid: <span className="font-medium">{Number(unpaidDays).toFixed(1)}</span></span>}
                  </span>
                  <span className="text-gray-400 text-xs">Total Deductions: <span className="text-red-500 font-medium">{formatCurrency(detail.deduction)}</span></span>
                </div>
              )}

              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-gray-900">Net Pay</span>
                <span className="text-lg font-bold text-emerald-700">{formatCurrency(detail.netPay)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setDetail(null)
                    setPdfPreview({
                      id: detail.id,
                      companyId: getPayslipCompanyId(detail),
                    })
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  View / Download PDF
                </button>
                {!isEmp && (
                  <button
                    onClick={() => handleSendEmail(detail.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    Send Email
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={!!pdfPreview}
        onClose={() => setPdfPreview(null)}
        payslipId={pdfPreview?.id}
        companyId={pdfPreview?.companyId}
      />

      {/* Bulk Generate Modal */}
      <Modal
        open={genModal}
        onClose={() => setGenModal(false)}
        title="Generate Payslips"
        panelClassName="payroll-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGenModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit(handleBulkGenerate)}>Generate</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Generates payslips for all active employees in your company for the selected period.</p>
          <Input label="Start Date" type="date" error={errors.startDate?.message}
            {...register('startDate', { required: 'Required' })} />
          <Input label="End Date" type="date" error={errors.endDate?.message}
            {...register('endDate', { required: 'Required' })} />
        </div>
      </Modal>

      <ConfirmModal
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        onConfirm={runBulkAction}
        title={bulkConfirm?.label || 'Confirm Bulk Action'}
        message={`${bulkConfirm?.label || 'Apply this action'} to ${bulkConfirm?.ids?.length || 0} selected payslip(s)?`}
        confirmLabel={bulkConfirm?.label || 'Confirm'}
      />

      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={payModal?.bulk ? 'Mark Selected Payslips Paid' : 'Mark Payslip Paid'}
        panelClassName="payroll-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button variant="success" onClick={submitPayment}>Mark Paid</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {payModal?.bulk && (
            <p className="text-sm text-gray-500">{payModal.ids.length} approved payslip(s) will be marked as paid.</p>
          )}
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Input
            label="Payment Reference"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Bank reference, cheque number, or note"
          />
        </div>
      </Modal>

      <Modal
        open={!!reopenModal}
        onClose={() => setReopenModal(null)}
        title="Reopen Payslip"
        panelClassName="payroll-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReopenModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={submitReopen} disabled={!reopenReason.trim()}>Reopen</Button>
          </div>
        }
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <textarea
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Why is this paid payslip being reopened?"
          />
        </div>
      </Modal>
    </div>
  )
}
