import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import {
  generateBulkPayslips,
  patchPayslip,
  checkAttendanceStatus,
  uploadBiometricAttendance,
  selectAttendanceStatus,
} from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import PdfPreviewModal from '../../components/common/PdfPreviewModal'
import useAuth from '../../hooks/useAuth'
import useCurrency from '../../hooks/useCurrency'
import api from '../../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Payroll Settings' },
  { id: 2, label: 'Attendance Source' },
  { id: 3, label: 'Payroll Preview' },
  { id: 4, label: 'Approve & Finalize' },
]

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const STATUS_OPTIONS = [
  { value: 'DRAFT',          label: 'Draft',    color: 'bg-gray-100 text-gray-700' },
  { value: 'REVIEW_ONGOING', label: 'Pending',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'CONFIRMED',      label: 'Approved', color: 'bg-green-100 text-green-700' },
]

const STATUS_VARIANT = {
  PAID: 'success', CONFIRMED: 'primary', DRAFT: 'default', REVIEW_ONGOING: 'warning',
}

function phd(payslip) {
  if (!payslip?.payHeadData) return {}
  try { return JSON.parse(payslip.payHeadData) } catch { return {} }
}

function fmtNum(v) { return v != null ? Number(v).toFixed(1) : '0' }

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const done    = current > step.id
        const active  = current === step.id
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                done   ? 'bg-indigo-600 border-indigo-600 text-white'
                : active ? 'bg-white border-indigo-600 text-indigo-600'
                : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {done ? <CheckCircleIcon className="w-5 h-5" /> : step.id}
              </div>
              <span className={`mt-1 text-xs font-medium whitespace-nowrap ${active ? 'text-indigo-600' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-14px] ${done ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AutomatedPayrollPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const { format: formatCurrency } = useCurrency()
  const companyId = effectiveCompanyId
  const attendanceStatus = useSelector(selectAttendanceStatus)

  const today = new Date()
  const [step, setStep] = useState(1)

  // Step 1 — settings
  const [settings, setSettings] = useState({
    year: today.getFullYear(),
    month: today.getMonth(), // 0-indexed
    startDate: '',
    endDate: '',
    weekendSat: true,
    weekendSun: true,
    maxOvertimeHours: 40,
    lateDeductionRate: 0.5,
    leaveDeductionEnabled: true,
  })

  // Step 2 — attendance
  const [attSource, setAttSource] = useState(null) // 'hrms' | 'biometric' | 'manual'
  const [biometricFile, setBiometricFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadingBio, setUploadingBio] = useState(false)
  const fileInputRef = useRef()

  // Step 3 — preview
  const [payslips, setPayslips] = useState([])
  const [edits, setEdits] = useState({}) // id -> { housingAllowance, transportAllowance, otherAllowance, overtime, loanDeduction, otherDeductions, remarks, status }
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState({}) // id -> bool
  const [pdfId, setPdfId] = useState(null)

  // Step 2 — fetch attendance
  const [fetchingAttendance, setFetchingAttendance] = useState(false)

  // Step 4
  const [approving, setApproving] = useState(false)

  // ── Derive date range from year/month when not manually set ─────────────────
  useEffect(() => {
    const y = settings.year
    const m = settings.month + 1 // 1-indexed
    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0) // last day of month
    const lastDayStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    setSettings(s => ({
      ...s,
      startDate: s.startDate || firstDay,
      endDate:   s.endDate   || lastDayStr,
    }))
  }, [settings.year, settings.month])

  // ── Fetch / re-fetch HRMS attendance count ──────────────────────────────────
  const handleFetchAttendance = async () => {
    setFetchingAttendance(true)
    try {
      await dispatch(checkAttendanceStatus({
        companyId,
        startDate: settings.startDate,
        endDate: settings.endDate,
      }))
      toast.success('Attendance data refreshed')
    } catch {
      toast.error('Failed to fetch attendance')
    } finally {
      setFetchingAttendance(false)
    }
  }

  // ── Auto Calculate Salary: re-run generation then refresh table ─────────────
  const handleAutoCalculate = async () => {
    setGenerating(true)
    try {
      await dispatch(generateBulkPayslips({
        companyId,
        startDate: settings.startDate,
        endDate: settings.endDate,
        weekendSat: settings.weekendSat,
        weekendSun: settings.weekendSun,
        lateDeductionRate: settings.lateDeductionRate,
      })).unwrap()
      const res = await api.get('/payroll/payslips', {
        params: { startDate: settings.startDate, endDate: settings.endDate },
      })
      setPayslips(Array.isArray(res.data) ? res.data : res.data?.content ?? [])
      setEdits({})
      toast.success('Salary recalculated')
    } catch (e) {
      toast.error(e || 'Recalculation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ── Step 1 → 2: check HRMS attendance ──────────────────────────────────────
  const handleProceedToAttendance = async () => {
    if (!settings.startDate || !settings.endDate) {
      toast.error('Please set Salary Start Date and End Date')
      return
    }
    await dispatch(checkAttendanceStatus({
      companyId,
      startDate: settings.startDate,
      endDate: settings.endDate,
    }))
    setStep(2)
  }

  // ── Step 2: biometric upload ────────────────────────────────────────────────
  const handleBiometricUpload = async () => {
    if (!biometricFile) { toast.error('Please select an Excel file'); return }
    setUploadingBio(true)
    try {
      const formData = new FormData()
      formData.append('file', biometricFile)
      const result = await dispatch(uploadBiometricAttendance({
        formData,
        params: { companyId, startDate: settings.startDate, endDate: settings.endDate },
      })).unwrap()
      setUploadResult(result)
      toast.success(`Imported ${result.imported} attendance records`)
      if (result.errors?.length) toast.error(`${result.errors.length} row(s) had errors`)
    } catch (e) {
      toast.error(e || 'Upload failed')
    } finally {
      setUploadingBio(false)
    }
  }

  // ── Step 2 → 3: generate payroll preview ───────────────────────────────────
  const handleGeneratePreview = async () => {
    setGenerating(true)
    try {
      await dispatch(generateBulkPayslips({
        companyId,
        startDate: settings.startDate,
        endDate: settings.endDate,
        weekendSat: settings.weekendSat,
        weekendSun: settings.weekendSun,
        lateDeductionRate: settings.lateDeductionRate,
      })).unwrap()
      // Fetch fresh payslips for the period
      const res = await api.get('/payroll/payslips', {
        params: { startDate: settings.startDate, endDate: settings.endDate },
      })
      setPayslips(Array.isArray(res.data) ? res.data : res.data?.content ?? [])
      setEdits({})
      setStep(3)
      toast.success('Payroll preview generated')
    } catch (e) {
      toast.error(e || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ── Step 3: inline edit helpers ─────────────────────────────────────────────
  const getEdit = (id, field, defaultVal) => {
    if (edits[id] && edits[id][field] !== undefined) return edits[id][field]
    return defaultVal
  }

  const setEdit = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }))
  }

  // Live recalculate net pay for a payslip row using current edits
  const calcNet = (p) => {
    const d = phd(p)
    const basic = Number(p.basicPay) || 0
    const housing   = Number(getEdit(p.id, 'housingAllowance', p.housingAllowance ?? d.housing_allowance ?? 0))
    const transport = Number(getEdit(p.id, 'transportAllowance', p.transportAllowance ?? d.transport_allowance ?? 0))
    const other     = Number(getEdit(p.id, 'otherAllowance', p.otherAllowance ?? d.other_allowance ?? 0))
    const overtime  = Number(getEdit(p.id, 'overtime', d.overtime_pay ?? 0))
    const loanDed   = Number(getEdit(p.id, 'loanDeduction', d.loan_recovery ?? 0))
    const otherDed  = Number(getEdit(p.id, 'otherDeductions', d.other_deductions ?? 0))

    const dynamicAllowances = (d.allowances ?? []).reduce((s, a) => s + (Number(a.amount) || 0), 0)
    const gross = basic + housing + transport + other + dynamicAllowances + overtime +
                  (Number(d.bonus) || 0) + (Number(d.salary_advance) || 0)

    const lop = Number(d.loss_of_pay) || 0
    const fedTax = Number(d.federal_tax) || 0
    const pretax = (d.pretax_deductions ?? []).reduce((s, x) => s + (Number(x.amount) || 0), 0)
    const postTax = (d.post_tax_deductions ?? []).reduce((s, x) => s + (Number(x.amount) || 0), 0)
    const netDed = (d.net_deductions ?? []).reduce((s, x) => s + (Number(x.amount) || 0), 0)
    const totalDed = lop + loanDed + (Number(d.salary_advance_deduction) || 0) + otherDed + fedTax + pretax + postTax + netDed + (Number(d.late_deduction) || 0)

    return {
      gross: Math.max(0, gross).toFixed(2),
      totalDed: Math.max(0, totalDed).toFixed(2),
      net: Math.max(0, gross - totalDed).toFixed(2),
    }
  }

  // Save edits for one row
  const handleSaveRow = async (p) => {
    const rowEdits = edits[p.id] || {}
    if (Object.keys(rowEdits).length === 0) return
    setSaving(s => ({ ...s, [p.id]: true }))
    try {
      const updated = await dispatch(patchPayslip({ id: p.id, updates: rowEdits })).unwrap()
      setPayslips(prev => prev.map(x => x.id === updated.id ? updated : x))
      setEdits(prev => { const next = { ...prev }; delete next[p.id]; return next })
      toast.success('Saved')
    } catch (e) {
      toast.error(e || 'Save failed')
    } finally {
      setSaving(s => ({ ...s, [p.id]: false }))
    }
  }

  // ── Step 4: approve all ─────────────────────────────────────────────────────
  const handleApproveAll = async () => {
    setApproving(true)
    let success = 0
    try {
      for (const p of payslips) {
        if (p.status !== 'CONFIRMED' && p.status !== 'PAID') {
          try {
            const updated = await dispatch(patchPayslip({ id: p.id, updates: { status: 'CONFIRMED' } })).unwrap()
            setPayslips(prev => prev.map(x => x.id === updated.id ? updated : x))
            success++
          } catch { /* skip failed ones */ }
        }
      }
      if (success > 0) toast.success(`${success} payslip(s) approved`)
    } finally {
      setApproving(false)
    }
  }

  const handleDownloadReport = () => {
    const url = `/api/payroll/payslips/export/excel?startDate=${settings.startDate}&endDate=${settings.endDate}`
    window.open(url, '_blank')
  }

  const approvedPayslips  = payslips.filter(p => p.status === 'CONFIRMED' || p.status === 'PAID')
  const pendingPayslips   = payslips.filter(p => p.status !== 'CONFIRMED' && p.status !== 'PAID')
  const totalNet          = payslips.reduce((s, p) => s + (Number(p.netPay) || 0), 0)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Payroll"
        subtitle="Attendance-based payroll processing — step by step"
      />

      <StepBar current={step} />

      {/* ── STEP 1: Payroll Settings ────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl space-y-6">
          <h2 className="text-base font-semibold text-gray-800">Payroll Cycle Settings</h2>
          <p className="text-sm text-gray-500 -mt-4">
            Configure the payroll period before processing. Payroll will be calculated only for the selected date range.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payroll Year</label>
              <select
                value={settings.year}
                onChange={e => setSettings(s => ({ ...s, year: Number(e.target.value), startDate: '', endDate: '' }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payroll Month</label>
              <select
                value={settings.month}
                onChange={e => setSettings(s => ({ ...s, month: Number(e.target.value), startDate: '', endDate: '' }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Start Date</label>
              <input
                type="date"
                value={settings.startDate}
                onChange={e => setSettings(s => ({ ...s, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary End Date</label>
              <input
                type="date"
                value={settings.endDate}
                onChange={e => setSettings(s => ({ ...s, endDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Working Days & Weekend Rules */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Working Days & Weekend Rules</h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.weekendSat}
                  onChange={e => setSettings(s => ({ ...s, weekendSat: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                Saturday is off
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.weekendSun}
                  onChange={e => setSettings(s => ({ ...s, weekendSun: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                Sunday is off
              </label>
            </div>
            <p className="text-xs text-gray-400">Holidays defined in the Leave module are also excluded automatically.</p>
          </div>

          {/* Overtime & Leave Deduction Rules */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Overtime Calculation</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Overtime Hours / Month</label>
                <input
                  type="number"
                  min="0"
                  value={settings.maxOvertimeHours}
                  onChange={e => setSettings(s => ({ ...s, maxOvertimeHours: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-400">Overtime beyond this cap will not be paid. Set in Payroll → General Settings for permanent config.</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Leave & Late Deduction Rules</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.leaveDeductionEnabled}
                  onChange={e => setSettings(s => ({ ...s, leaveDeductionEnabled: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                Deduct unpaid leave from basic pay
              </label>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Late Deduction Rate (fraction of day's pay per late instance)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.lateDeductionRate}
                  onChange={e => setSettings(s => ({ ...s, lateDeductionRate: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-400">e.g., 0.5 = half-day deducted per late instance. Daily rate = basic pay ÷ working days.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleProceedToAttendance}>
              Next: Attendance Source →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Attendance Source ───────────────────────────────────────── */}
      {step === 2 && (
        <div className="max-w-3xl space-y-5">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-3">
            <InformationCircleIcon className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-800">
              <p className="font-medium">Payroll period: {settings.startDate} → {settings.endDate}</p>
              <p className="text-xs mt-0.5">Payroll will only include attendance data from this range.</p>
            </div>
          </div>

          {/* Priority 1: HRMS Attendance */}
          <div className={`bg-white rounded-xl border-2 p-5 transition-all cursor-pointer ${attSource === 'hrms' ? 'border-indigo-600' : 'border-gray-200 hover:border-indigo-300'}`}
            onClick={() => setAttSource('hrms')}
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${attSource === 'hrms' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                  {attSource === 'hrms' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Priority 1 — HRMS Clock-In / Clock-Out</p>
                  <p className="text-xs text-gray-500 mt-0.5">Use attendance records already in the system (clock-in/out, manual entry, imports).</p>
                </div>
              </div>
              {attendanceStatus && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${attendanceStatus.hasAttendance ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {attendanceStatus.hasAttendance ? `${attendanceStatus.count} records found` : 'No records'}
                </span>
              )}
            </div>

            {attSource === 'hrms' && attendanceStatus && !attendanceStatus.hasAttendance && (
              <div className="mt-3 ml-8 flex gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                No HRMS attendance found for this period. Consider uploading biometric data or entering manually.
              </div>
            )}
          </div>

          {/* Priority 2: Biometric Upload */}
          <div className={`bg-white rounded-xl border-2 p-5 transition-all cursor-pointer ${attSource === 'biometric' ? 'border-indigo-600' : 'border-gray-200 hover:border-indigo-300'}`}
            onClick={() => setAttSource('biometric')}
          >
            <div className="flex gap-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${attSource === 'biometric' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {attSource === 'biometric' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">Priority 2 — Upload Biometric Machine Excel</p>
                <p className="text-xs text-gray-500 mt-0.5">Download data from the biometric machine and upload it here.</p>

                {attSource === 'biometric' && (
                  <div className="mt-4 space-y-4">
                    {/* Template info */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                      <p className="font-medium mb-1">Expected Excel columns (in order):</p>
                      <p className="font-mono text-gray-500">
                        Employee ID | Employee Name | Date (YYYY-MM-DD) | Clock-In (HH:MM) | Clock-Out (HH:MM) |
                        Total Working Hours | Late Coming | Early Leaving | Overtime Hours | Attendance Status
                      </p>
                      <p className="mt-2 text-gray-400">Attendance Status column values: <strong>Present</strong> or <strong>Absent</strong></p>
                    </div>

                    {/* File upload */}
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                      onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                    >
                      <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      {biometricFile ? (
                        <p className="text-sm font-medium text-indigo-600">{biometricFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
                          <p className="text-xs text-gray-400 mt-1">.xlsx, .xls files only</p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={e => setBiometricFile(e.target.files?.[0] || null)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>

                    <Button
                      onClick={e => { e.stopPropagation(); handleBiometricUpload() }}
                      disabled={!biometricFile || uploadingBio}
                      size="sm"
                    >
                      {uploadingBio ? 'Uploading…' : 'Upload & Import Attendance'}
                    </Button>

                    {uploadResult && (
                      <div className="text-xs space-y-1">
                        <p className="text-green-700 font-medium">{uploadResult.imported} record(s) imported successfully</p>
                        {uploadResult.errors?.map((e, i) => (
                          <p key={i} className="text-red-600">{e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority 3: Manual */}
          <div className={`bg-white rounded-xl border-2 p-5 transition-all cursor-pointer ${attSource === 'manual' ? 'border-indigo-600' : 'border-gray-200 hover:border-indigo-300'}`}
            onClick={() => setAttSource('manual')}
          >
            <div className="flex gap-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${attSource === 'manual' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {attSource === 'manual' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Priority 3 — Manual Attendance Entry</p>
                <p className="text-xs text-gray-500 mt-0.5">Proceed with manually entered attendance. Use the Attendance module to enter records, then come back.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
              <Button variant="secondary" onClick={handleFetchAttendance} disabled={fetchingAttendance} size="sm">
                {fetchingAttendance ? 'Fetching…' : 'Fetch Attendance'}
              </Button>
            </div>
            <Button
              onClick={handleGeneratePreview}
              disabled={!attSource || generating}
              loading={generating}
            >
              {generating ? 'Generating…' : 'Generate Payroll Preview →'}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Payroll Preview (editable table) ────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: payslips.length },
              { label: 'Approved', value: approvedPayslips.length, color: 'text-green-600' },
              { label: 'Pending', value: pendingPayslips.length, color: 'text-yellow-600' },
              { label: 'Total Net Pay', value: formatCurrency(totalNet), color: 'text-indigo-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-xl font-bold mt-1 ${card.color || 'text-gray-800'}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Period: <span className="font-medium text-gray-700">{settings.startDate} → {settings.endDate}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="secondary" size="sm" onClick={handleAutoCalculate} disabled={generating}>
                {generating ? 'Calculating…' : 'Auto Calculate Salary'}
              </Button>
              <Button size="sm" onClick={() => setStep(4)}>Next: Approve & Finalize →</Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium sticky left-0 bg-gray-50 z-10 min-w-[160px]">Employee</th>
                    <th className="px-3 py-3 text-left font-medium min-w-[80px]">Emp ID</th>
                    <th className="px-3 py-3 text-left font-medium">Dept</th>
                    {/* Attendance columns */}
                    <th className="px-3 py-3 text-center font-medium bg-blue-50 text-blue-700">Cal Days</th>
                    <th className="px-3 py-3 text-center font-medium bg-blue-50 text-blue-700">Work Days</th>
                    <th className="px-3 py-3 text-center font-medium bg-green-50 text-green-700">Present</th>
                    <th className="px-3 py-3 text-center font-medium bg-red-50 text-red-700">Absent</th>
                    <th className="px-3 py-3 text-center font-medium bg-yellow-50 text-yellow-700">Paid Leave</th>
                    <th className="px-3 py-3 text-center font-medium bg-orange-50 text-orange-700">Unpaid Leave</th>
                    <th className="px-3 py-3 text-center font-medium bg-orange-50 text-orange-700">Late</th>
                    <th className="px-3 py-3 text-center font-medium bg-pink-50 text-pink-700">Early Leaving</th>
                    <th className="px-3 py-3 text-center font-medium bg-purple-50 text-purple-700">OT Hrs</th>
                    <th className="px-3 py-3 text-center font-medium bg-teal-50 text-teal-700">Leave Bal.</th>
                    <th className="px-3 py-3 text-right font-medium text-red-600">Late Ded.</th>
                    {/* Salary columns */}
                    <th className="px-3 py-3 text-right font-medium">Basic</th>
                    <th className="px-3 py-3 text-right font-medium">Housing</th>
                    <th className="px-3 py-3 text-right font-medium">Transport</th>
                    <th className="px-3 py-3 text-right font-medium">Other Allow.</th>
                    <th className="px-3 py-3 text-right font-medium">Overtime Amt</th>
                    <th className="px-3 py-3 text-right font-medium">Loan Ded.</th>
                    <th className="px-3 py-3 text-right font-medium">Other Ded.</th>
                    <th className="px-3 py-3 text-right font-medium font-semibold">Gross</th>
                    <th className="px-3 py-3 text-right font-medium font-semibold text-red-700">Total Ded.</th>
                    <th className="px-3 py-3 text-right font-medium font-semibold text-green-700">Net Pay</th>
                    <th className="px-3 py-3 text-left font-medium">Remarks</th>
                    <th className="px-3 py-3 text-center font-medium">Status</th>
                    <th className="px-3 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payslips.map(p => {
                    const d = phd(p)
                    const emp = p.employee
                    const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '—'
                    const dept = emp?.department?.name || '—'
                    const { gross, totalDed, net } = calcNet(p)
                    const hasEdits = edits[p.id] && Object.keys(edits[p.id]).length > 0

                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 ${hasEdits ? 'bg-indigo-50' : ''}`}>
                        {/* Employee */}
                        <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">{name}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{emp?.badgeId || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{dept}</td>

                        {/* Attendance summary — read only */}
                        <td className="px-3 py-2 text-center bg-blue-50 text-blue-800 font-medium">{d.total_calendar_days ?? '—'}</td>
                        <td className="px-3 py-2 text-center bg-blue-50 text-blue-800 font-medium">{d.working_days ?? '—'}</td>
                        <td className="px-3 py-2 text-center bg-green-50 text-green-800 font-medium">{d.present_days ?? '—'}</td>
                        <td className="px-3 py-2 text-center bg-red-50 text-red-800 font-medium">{d.absent_days ?? '—'}</td>
                        <td className="px-3 py-2 text-center bg-yellow-50 text-yellow-800">{fmtNum(d.paid_leave_days)}</td>
                        <td className="px-3 py-2 text-center bg-orange-50 text-orange-800">{fmtNum(d.unpaid_days)}</td>
                        <td className="px-3 py-2 text-center bg-orange-50 text-orange-800">{d.late_coming_days ?? 0}</td>
                        <td className="px-3 py-2 text-center bg-pink-50 text-pink-800">{d.early_leaving_days ?? 0}</td>
                        <td className="px-3 py-2 text-center bg-purple-50 text-purple-800 font-medium">{fmtNum(d.overtime_hours)}</td>
                        <td className="px-3 py-2 text-center bg-teal-50 text-teal-800">{fmtNum(d.leave_balance)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatCurrency(d.late_deduction ?? 0)}</td>

                        {/* Basic — read only */}
                        <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(p.basicPay)}</td>

                        {/* Editable allowances */}
                        {['housingAllowance', 'transportAllowance', 'otherAllowance'].map(field => (
                          <td key={field} className="px-1 py-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={getEdit(p.id, field, Number(p[field] || 0))}
                              onChange={e => setEdit(p.id, field, e.target.value)}
                              className="w-24 text-right rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                        ))}

                        {/* Editable overtime amount */}
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={getEdit(p.id, 'overtime', Number(d.overtime_pay || 0))}
                            onChange={e => setEdit(p.id, 'overtime', e.target.value)}
                            className="w-24 text-right rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>

                        {/* Editable loan deduction */}
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={getEdit(p.id, 'loanDeduction', Number(d.loan_recovery || 0))}
                            onChange={e => setEdit(p.id, 'loanDeduction', e.target.value)}
                            className="w-24 text-right rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 text-red-700"
                          />
                        </td>

                        {/* Editable other deductions */}
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={getEdit(p.id, 'otherDeductions', Number(d.other_deductions || 0))}
                            onChange={e => setEdit(p.id, 'otherDeductions', e.target.value)}
                            className="w-24 text-right rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 text-red-700"
                          />
                        </td>

                        {/* Live-calculated totals */}
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(gross)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{formatCurrency(totalDed)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(net)}</td>

                        {/* Remarks */}
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            placeholder="Remarks…"
                            value={getEdit(p.id, 'remarks', d.remarks || '')}
                            onChange={e => setEdit(p.id, 'remarks', e.target.value)}
                            className="w-32 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>

                        {/* Status dropdown */}
                        <td className="px-1 py-1 text-center">
                          <select
                            value={getEdit(p.id, 'status', p.status || 'DRAFT')}
                            onChange={e => setEdit(p.id, 'status', e.target.value)}
                            className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-1 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            {hasEdits && (
                              <button
                                onClick={() => handleSaveRow(p)}
                                disabled={saving[p.id]}
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {saving[p.id] ? '…' : 'Save'}
                              </button>
                            )}
                            <button
                              onClick={() => setPdfId(p.id)}
                              className="text-xs text-indigo-600 hover:underline px-1"
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note about gate */}
          <p className="text-xs text-gray-400">
            Only <strong>Approved</strong> payrolls are eligible for payslip distribution and final download.
          </p>
        </div>
      )}

      {/* ── STEP 4: Approve & Finalize ──────────────────────────────────────── */}
      {step === 4 && (
        <div className="max-w-2xl space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Payroll Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Period:</span> <span className="font-medium">{settings.startDate} → {settings.endDate}</span></div>
              <div><span className="text-gray-500">Total Employees:</span> <span className="font-medium">{payslips.length}</span></div>
              <div><span className="text-gray-500">Approved:</span> <span className="font-medium text-green-600">{approvedPayslips.length}</span></div>
              <div><span className="text-gray-500">Pending / Draft:</span> <span className="font-medium text-yellow-600">{pendingPayslips.length}</span></div>
              <div><span className="text-gray-500">Total Net Pay:</span> <span className="font-semibold text-indigo-600 text-base">{formatCurrency(totalNet)}</span></div>
            </div>
          </div>

          {/* Payslip status list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-800">Employee Payroll Status</h3>
              <Badge label={`${approvedPayslips.length}/${payslips.length} Approved`} variant="primary" />
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {payslips.map(p => {
                const emp = p.employee
                const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '—'
                return (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">{name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{formatCurrency(p.netPay)}</span>
                      <Badge
                        label={p.status === 'CONFIRMED' ? 'Approved' : p.status === 'PAID' ? 'Paid' : p.status === 'REVIEW_ONGOING' ? 'Pending' : 'Draft'}
                        variant={STATUS_VARIANT[p.status] || 'default'}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Warning if unapproved remain */}
          {pendingPayslips.length > 0 && (
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{pendingPayslips.length} payslip(s) not yet approved</p>
                <p className="text-xs mt-0.5">Only approved payslips will be included in the final payslip download. Go back to the preview to approve individual rows, or use "Approve All" below.</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setStep(3)}>← Back to Preview</Button>

            <Button
              onClick={handleApproveAll}
              disabled={pendingPayslips.length === 0 || approving}
            >
              {approving ? 'Approving…' : `Approve All (${pendingPayslips.length})`}
            </Button>

            <Button
              variant="secondary"
              onClick={handleDownloadReport}
              disabled={approvedPayslips.length === 0}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1 inline" />
              Download Payroll Report
            </Button>

            <Button
              onClick={() => {
                if (approvedPayslips.length === 0) {
                  toast.error('No approved payslips to download. Approve payslips first.')
                  return
                }
                const ids = approvedPayslips.map(p => p.id).join(',')
                window.open(`/api/payroll/payslips/bulk-pdf?ids=${ids}`, '_blank')
              }}
              disabled={approvedPayslips.length === 0}
            >
              Generate Payslips ({approvedPayslips.length})
            </Button>
          </div>

          {approvedPayslips.length === 0 && (
            <p className="text-xs text-gray-400">
              Payslip generation is only available for <strong>Approved</strong> payroll records.
            </p>
          )}
        </div>
      )}

      <PdfPreviewModal
        open={!!pdfId}
        onClose={() => setPdfId(null)}
        payslipId={pdfId}
      />
    </div>
  )
}
