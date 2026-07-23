import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchImportInfo,
  downloadImportTemplate,
  processPayslipImport,
  fetchMonthPayslips,
  inlineEditPayslip,
  downloadPayslipPdf,
  downloadBulkPayslipsPdf,
  generateBulkPayslips,
} from './payrollSlice'
import useAuth from '../../hooks/useAuth'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_OPTIONS = [
  { value: 'DRAFT',          label: 'Draft',    color: 'bg-gray-100 text-gray-700' },
  { value: 'REVIEW_ONGOING', label: 'Pending',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'CONFIRMED',      label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'PAID',           label: 'Paid',     color: 'bg-blue-100 text-blue-700' },
]

function statusLabel(status) {
  return STATUS_OPTIONS.find(s => s.value === status)?.label ?? status
}
function statusColor(status) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color ?? 'bg-gray-100 text-gray-600'
}

function fmt(val) {
  const n = parseFloat(val)
  return isNaN(n) ? '0.00' : n.toFixed(2)
}

// Editable number cell — shows value, becomes input on click
function NumCell({ value, onChange, readOnly = false, highlight = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const startEdit = () => {
    if (readOnly) return
    setDraft(fmt(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    setEditing(false)
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(n)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-24 border border-blue-400 rounded px-1 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className={[
        'block text-right text-sm px-1 py-0.5 rounded min-w-[5rem]',
        readOnly
          ? highlight ? 'font-semibold text-blue-700' : 'text-gray-500 cursor-default'
          : 'cursor-pointer hover:bg-blue-50 hover:text-blue-700',
      ].join(' ')}
    >
      {fmt(value)}
    </span>
  )
}

export default function ManualPayrollPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()

  const importInfo    = useSelector(s => s.payroll.importInfo)
  const importLoading = useSelector(s => s.payroll.importLoading)
  const importResult  = useSelector(s => s.payroll.importResult)
  const allPayslips   = useSelector(s => s.payroll.monthPayslips)

  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const companyId    = selectedCompanyId || localStorage.getItem('selectedCompanyId') || user?.companyId || user?.company?.id
  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selectedYear,  setSelectedYear]  = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(null) // null = none selected yet
  const [file,          setFile]          = useState(null)
  const [view,          setView]          = useState('months') // 'months' | 'import' | 'table'

  // Local editable row state
  const [rowEdits,      setRowEdits]      = useState({})
  // Bumped after import/generate so the row-edits populate effect below re-runs even when
  // monthPayslips.length is unchanged (import/generate updates EXISTING rows, not new ones).
  const [editsResetKey, setEditsResetKey] = useState(0)
  const [savingIds,     setSavingIds]     = useState(new Set())
  const [dlIds,         setDlIds]         = useState(new Set())
  const [bulkDlLoading, setBulkDlLoading] = useState(false)
  const [generating,    setGenerating]    = useState(false)
  const fileRef = useRef(null)

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (companyId) {
      dispatch(fetchImportInfo({ companyId, year: selectedYear }))
    }
  }, [dispatch, companyId, selectedYear])

  // Load all payslips for the selected year once — month filtering is client-side.
  // This avoids per-month fetch mismatches caused by AccessScopeContext vs explicit companyId.
  useEffect(() => {
    if (companyId) {
      dispatch(fetchMonthPayslips({ year: selectedYear, companyId }))
      setRowEdits({})
    }
  }, [dispatch, companyId, selectedYear])

  // Client-side filter for the selected month
  const monthPayslips = selectedMonth
    ? allPayslips.filter(p => {
        if (!p.startDate) return false
        const [y, m] = p.startDate.split('-').map(Number)
        return y === selectedYear && m === selectedMonth
      })
    : []

  // Initialise local edits when payslips load for the selected month
  useEffect(() => {
    if (!monthPayslips.length) return
    setRowEdits(prev => {
      const next = { ...prev }
      monthPayslips.forEach(p => {
        if (!next[p.id]) {
          // Parse extra fields from payHeadData JSON
          let phd = {}
          try { phd = p.payHeadData ? JSON.parse(p.payHeadData) : {} } catch (_) {}
          // p.deduction stores TOTAL deductions (including loss_of_pay).
          // We subtract loss_of_pay here so the "Deduction" column shows only the
          // "other deductions" component, and calcTotalDeductions() doesn't double-count it.
          const leaveAmt = parseFloat(phd.loss_of_pay ?? 0)
          next[p.id] = {
            basicPay:           parseFloat(p.basicPay ?? 0),
            housingAllowance:   parseFloat(p.housingAllowance ?? 0),
            transportAllowance: parseFloat(p.transportAllowance ?? 0),
            otherAllowance:     parseFloat(p.otherAllowance ?? 0),
            overtime:           parseFloat(phd.overtime ?? phd.overtime_pay ?? 0),
            leaveDeduction:     leaveAmt,
            bonus:              parseFloat(phd.bonus ?? 0),
            deduction:          Math.max(0, parseFloat(p.deduction ?? 0) - leaveAmt),
          }
        }
      })
      return next
    })
  }, [monthPayslips.length, selectedMonth, editsResetKey])

  // ── Derived calc ────────────────────────────────────────────────────────────

  function calcGross(edit) {
    return (edit.basicPay || 0) + (edit.housingAllowance || 0)
      + (edit.transportAllowance || 0) + (edit.otherAllowance || 0)
  }
  function calcTotalAllowances(edit) {
    return (edit.housingAllowance || 0) + (edit.transportAllowance || 0) + (edit.otherAllowance || 0)
  }
  function calcTotalDeductions(edit) {
    return (edit.deduction || 0) + (edit.leaveDeduction || 0)
  }
  function calcNet(edit) {
    return calcGross(edit) + (edit.overtime || 0) + (edit.bonus || 0) - calcTotalDeductions(edit)
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMonthClick = (monthNum) => {
    setSelectedMonth(monthNum)
    setView('import')
  }

  const handleDownloadTemplate = () => {
    if (!companyId) return toast.error('Company not found')
    dispatch(downloadImportTemplate({ companyId, month: selectedMonth, year: selectedYear }))
      .unwrap()
      .then(() => toast.success('Template downloaded'))
      .catch(e => toast.error(e || 'Download failed'))
  }

  const handleImport = () => {
    if (!companyId) return toast.error('Company not found')
    if (!file)      return toast.error('Please select an Excel file to upload')
    dispatch(processPayslipImport({ companyId, month: selectedMonth, year: selectedYear, file }))
      .unwrap()
      .then(async result => {
        if (result.status === 'success') toast.success(result.message)
        else if (result.status === 'partial') toast(`Import completed with errors: ${result.message}`, { icon: '⚠️' })
        else toast.error(result.message)
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        // Await so Redux has the freshly-imported values BEFORE we clear rowEdits and force
        // the populate effect to re-run — otherwise it can re-populate from stale data.
        await Promise.all([
          dispatch(fetchImportInfo({ companyId, year: selectedYear })),
          dispatch(fetchMonthPayslips({ year: selectedYear })),
        ])
        setRowEdits({})
        setEditsResetKey(k => k + 1)
      })
      .catch(e => toast.error(e || 'Import failed'))
  }

  const handleGenerateFromContracts = async () => {
    if (!companyId || !selectedMonth) return
    setGenerating(true)
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`
      await dispatch(generateBulkPayslips({ companyId, startDate, endDate })).unwrap()
      toast.success(`Payslips generated for ${MONTH_NAMES[selectedMonth]} ${selectedYear}`)
      await Promise.all([
        dispatch(fetchImportInfo({ companyId, year: selectedYear })),
        dispatch(fetchMonthPayslips({ year: selectedYear })),
      ])
      setRowEdits({})
      setEditsResetKey(k => k + 1)
    } catch (e) {
      toast.error(e || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleFieldChange = (payslipId, field, newVal) => {
    setRowEdits(prev => ({
      ...prev,
      [payslipId]: { ...prev[payslipId], [field]: newVal },
    }))
  }

  const handleSaveRow = useCallback(async (payslipId) => {
    const edit = rowEdits[payslipId]
    if (!edit) return
    setSavingIds(prev => new Set([...prev, payslipId]))
    try {
      const gross        = calcGross(edit)
      const totalDed     = calcTotalDeductions(edit)
      const net          = calcNet(edit)
      await dispatch(inlineEditPayslip({
        id: payslipId,
        fields: {
          basicPay:           edit.basicPay,
          housingAllowance:   edit.housingAllowance,
          transportAllowance: edit.transportAllowance,
          otherAllowance:     edit.otherAllowance,
          overtime:           edit.overtime,
          leaveDeduction:     edit.leaveDeduction,
          bonus:              edit.bonus,
          deduction:          totalDed,
          grossPay:           gross,
          netPay:             net,
        },
      })).unwrap()
      toast.success('Saved')
    } catch (e) {
      toast.error(e || 'Save failed')
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(payslipId); return s })
    }
  }, [dispatch, rowEdits])

  const handleStatusChange = async (payslip, newStatus) => {
    try {
      await dispatch(inlineEditPayslip({ id: payslip.id, fields: { status: newStatus } })).unwrap()
      toast.success(`Status changed to ${statusLabel(newStatus)}`)
    } catch (e) {
      toast.error(e || 'Status change failed')
    }
  }

  const handleDownloadPdf = async (payslip) => {
    const emp = payslip.employee
    const name = emp ? `${emp.firstName}-${emp.lastName}` : payslip.id
    const period = selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : ''
    setDlIds(prev => new Set([...prev, payslip.id]))
    try {
      await dispatch(downloadPayslipPdf({ id: payslip.id, filename: `payslip-${name}-${period}.pdf` })).unwrap()
    } catch (e) {
      toast.error(e || 'Download failed')
    } finally {
      setDlIds(prev => { const s = new Set(prev); s.delete(payslip.id); return s })
    }
  }

  const handleBulkDownload = async () => {
    const approvedIds = monthPayslips
      .filter(p => p.status === 'CONFIRMED' || p.status === 'PAID')
      .map(p => p.id)
    if (!approvedIds.length) return toast.error('No approved payslips to download')
    setBulkDlLoading(true)
    try {
      await dispatch(downloadBulkPayslipsPdf(approvedIds)).unwrap()
    } catch (e) {
      toast.error(e || 'Bulk download failed')
    } finally {
      setBulkDlLoading(false)
    }
  }

  // ── Month grid data ─────────────────────────────────────────────────────────

  const months = importInfo?.months_data || []

  // ── Stats for selected month ────────────────────────────────────────────────

  const approvedCount = monthPayslips.filter(p => p.status === 'CONFIRMED' || p.status === 'PAID').length
  const totalNet = monthPayslips.reduce((sum, p) => {
    const edit = rowEdits[p.id]
    return sum + (edit ? calcNet(edit) : parseFloat(p.netPay ?? 0))
  }, 0)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select a month → download the template → fill in data → upload → edit & approve
          </p>
        </div>
        {view !== 'months' && (
          <button
            onClick={() => { setView('months'); setSelectedMonth(null) }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            All Months
          </button>
        )}
      </div>

      {/* ── Year Navigator ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <button
          onClick={() => { setSelectedYear(y => y - 1); setSelectedMonth(null); setView('months') }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg leading-none"
        >
          &#8592;
        </button>
        <span className="text-xl font-semibold text-gray-800 w-20 text-center">{selectedYear}</span>
        <button
          onClick={() => { setSelectedYear(y => y + 1); setSelectedMonth(null); setView('months') }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg leading-none"
        >
          &#8594;
        </button>
        {importInfo?.employee_count != null && (
          <span className="text-sm text-gray-400 ml-2">
            {importInfo.employee_count} active employee{importInfo.employee_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Month Grid ──────────────────────────────────────────────────────── */}
      {view === 'months' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {months.map(m => (
            <button
              key={m.month_num}
              onClick={() => handleMonthClick(m.month_num)}
              className={[
                'flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all text-left',
                m.month_num === currentMonth && selectedYear === currentYear
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50',
              ].join(' ')}
            >
              <span className="text-sm font-semibold text-gray-800">{m.month_name}</span>
              <span className="text-xs text-gray-400 mt-0.5">{m.date_range}</span>
              <span className="mt-2">
                {m.status === 'completed' ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircleIcon className="w-4 h-4" />
                    {m.payslips_count} payslip{m.payslips_count !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <ClockIcon className="w-4 h-4" />
                    No data
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Month Detail View ────────────────────────────────────────────────── */}
      {view !== 'months' && selectedMonth && (
        <>
          {/* Month heading */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Selected Month</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </h2>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xs text-gray-400">Employees</p>
                <p className="text-lg font-semibold text-gray-800">{monthPayslips.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Approved</p>
                <p className="text-lg font-semibold text-green-600">{approvedCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Net Pay</p>
                <p className="text-lg font-semibold text-blue-700">{totalNet.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* ── Import Panel ──────────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Create Payroll Data
              </h3>
              <span className="text-xs text-gray-400">
                Choose how to create payslips for {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
            </div>

            {/* Quick Generate option */}
            <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                <BoltIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Generate from Contracts</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically calculate salaries for all active employees using their contract data (basic wage, allowances, deductions). Fastest option.
                </p>
              </div>
              <button
                onClick={handleGenerateFromContracts}
                disabled={generating}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <BoltIcon className="w-4 h-4" />
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              <span>or use Excel import for custom values</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="flex flex-col gap-2 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-sm font-medium text-gray-800">Download Template</p>
                </div>
                <p className="text-xs text-gray-500">
                  Pre-filled with employee names, IDs, and contract salaries.
                  Fill the <span className="font-medium text-orange-600">orange columns</span>.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={importLoading}
                  className="mt-auto flex items-center gap-1.5 self-start px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-sm font-medium text-gray-800">Fill & Select File</p>
                </div>
                <p className="text-xs text-gray-500">Fill salary details in the Excel sheet, then select it here.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={e => setFile(e.target.files[0] || null)}
                  className="mt-auto text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                />
                {file && <span className="text-xs text-green-600 truncate">{file.name}</span>}
              </div>

              {/* Step 3 */}
              <div className="flex flex-col gap-2 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-sm font-medium text-gray-800">Upload & Process</p>
                </div>
                <p className="text-xs text-gray-500">Payslips will be created in Draft status and appear in the table below.</p>
                <button
                  onClick={handleImport}
                  disabled={importLoading || !file}
                  className="mt-auto flex items-center gap-1.5 self-start px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                  {importLoading ? 'Processing…' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Import result */}
            {importResult && (
              <div className={[
                'rounded-lg p-3 text-xs',
                importResult.status === 'success'  ? 'bg-green-50 border border-green-200 text-green-800'
                : importResult.status === 'partial' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-red-50 border border-red-200 text-red-800',
              ].join(' ')}>
                <p className="font-medium">{importResult.message}</p>
                {importResult.imported != null && (
                  <p className="mt-0.5">{importResult.imported} payslip(s) processed.</p>
                )}
                {importResult.errors?.length > 0 && (
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ── Payroll Table ─────────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">
                Payroll Records — {MONTH_NAMES[selectedMonth]} {selectedYear}
              </h3>
              <div className="flex items-center gap-2">
                {monthPayslips.length > 0 && (
                  <button
                    onClick={handleBulkDownload}
                    disabled={bulkDlLoading || approvedCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                    {bulkDlLoading ? 'Downloading…' : `Download Approved (${approvedCount})`}
                  </button>
                )}
              </div>
            </div>

            {monthPayslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClockIcon className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No payroll data for {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                <p className="text-xs mt-1">Use the import panel above to upload payroll data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Employee</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dept</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Housing</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Transport</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Other</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide whitespace-nowrap">Gross ▸</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Overtime</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide whitespace-nowrap">Leave Ded.</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Bonus</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deduction</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-red-600 uppercase tracking-wide whitespace-nowrap">Total Ded. ▸</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">Net Pay ▸</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthPayslips.map(p => {
                      const edit    = rowEdits[p.id] || {}
                      const gross   = calcGross(edit)
                      const net     = calcNet(edit)
                      const saving  = savingIds.has(p.id)
                      const dlding  = dlIds.has(p.id)
                      const emp     = p.employee

                      const totalDed = calcTotalDeductions(edit)

                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          {/* Employee */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-medium text-gray-900 text-sm">
                              {emp ? `${emp.firstName} ${emp.lastName}` : '—'}
                            </p>
                            <p className="text-xs text-gray-400">{emp?.badgeId ?? ''}</p>
                          </td>

                          {/* Dept */}
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {emp?.department?.name ?? '—'}
                          </td>

                          {/* Basic Pay */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.basicPay ?? 0}
                              onChange={v => handleFieldChange(p.id, 'basicPay', v)}
                            />
                          </td>

                          {/* Housing */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.housingAllowance ?? 0}
                              onChange={v => handleFieldChange(p.id, 'housingAllowance', v)}
                            />
                          </td>

                          {/* Transport */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.transportAllowance ?? 0}
                              onChange={v => handleFieldChange(p.id, 'transportAllowance', v)}
                            />
                          </td>

                          {/* Other */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.otherAllowance ?? 0}
                              onChange={v => handleFieldChange(p.id, 'otherAllowance', v)}
                            />
                          </td>

                          {/* Gross (read-only, auto-calc) */}
                          <td className="px-3 py-3 bg-blue-50/40">
                            <NumCell value={gross} readOnly highlight />
                          </td>

                          {/* Overtime */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.overtime ?? 0}
                              onChange={v => handleFieldChange(p.id, 'overtime', v)}
                            />
                          </td>

                          {/* Leave Deduction */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.leaveDeduction ?? 0}
                              onChange={v => handleFieldChange(p.id, 'leaveDeduction', v)}
                            />
                          </td>

                          {/* Bonus */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.bonus ?? 0}
                              onChange={v => handleFieldChange(p.id, 'bonus', v)}
                            />
                          </td>

                          {/* Other Deduction */}
                          <td className="px-3 py-3">
                            <NumCell
                              value={edit.deduction ?? 0}
                              onChange={v => handleFieldChange(p.id, 'deduction', v)}
                            />
                          </td>

                          {/* Total Deductions (read-only, auto-calc) */}
                          <td className="px-3 py-3 bg-red-50/40">
                            <NumCell value={totalDed} readOnly />
                          </td>

                          {/* Net Pay (read-only, auto-calc) */}
                          <td className="px-3 py-3 bg-blue-50/40">
                            <NumCell value={net} readOnly highlight />
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 text-center">
                            <select
                              value={p.status}
                              onChange={e => handleStatusChange(p, e.target.value)}
                              className={[
                                'text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400',
                                statusColor(p.status),
                              ].join(' ')}
                            >
                              {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSaveRow(p.id)}
                                disabled={saving}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
                              >
                                {saving ? '…' : 'Save'}
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(p)}
                                disabled={dlding}
                                title="Download Payslip PDF"
                                className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
                              >
                                {dlding
                                  ? <span className="text-xs">…</span>
                                  : <DocumentArrowDownIcon className="w-4 h-4" />
                                }
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Table footer summary */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  <span>{monthPayslips.length} employee{monthPayslips.length !== 1 ? 's' : ''}</span>
                  <span className="font-semibold text-blue-700">
                    Total Net: {totalNet.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
