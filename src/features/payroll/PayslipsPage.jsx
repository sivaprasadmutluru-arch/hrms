import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchPayslips, fetchEmployeePayslips, confirmPayslip, markPaid, generatePayslip, generateBulkPayslips, selectLoading, sendPayslipEmail, exportPayslipsExcel, downloadExportImportFormat } from './payrollSlice'
import { useForm } from 'react-hook-form'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import PdfPreviewModal from '../../components/common/PdfPreviewModal'
import useCurrency from '../../hooks/useCurrency'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

const STATUS_VARIANT = {
  PAID: 'success',
  CONFIRMED: 'primary',
  DRAFT: 'default',
  REVIEW_ONGOING: 'warning',
}

export default function PayslipsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isEmployee, isAccountant, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin } = useAuth()
  const isEmp = isEmployee()
  // Can approve payslips (confirm / mark-paid / send email) — roles with payroll:approve authority
  const canApprovePayroll = isAccountant() || isBranchAdmin() || isEnterpriseAdmin() || isPlatformAdmin()
  const formatCurrency = useCurrency().format
  const payslips = useSelector(s => s.payroll.payslips)
  const loading = useSelector(selectLoading)
  const [detail, setDetail] = useState(null)
  const [genModal, setGenModal] = useState(false)
  const [pdfPreviewId, setPdfPreviewId] = useState(null)
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (isEmp && user?.employeeId) {
      dispatch(fetchEmployeePayslips(user.employeeId))
    } else if (!isEmp) {
      dispatch(fetchPayslips({ page: 0, size: 20 }))
    }
  }, [dispatch, isEmp, user?.employeeId])

  const handleConfirm = async (id) => {
    try { await dispatch(confirmPayslip(id)).unwrap(); toast.success('Payslip confirmed') } catch { toast.error('Failed') }
  }
  const handleMarkPaid = async (id) => {
    try { await dispatch(markPaid(id)).unwrap(); toast.success('Marked as paid') } catch { toast.error('Failed') }
  }
  const handleSendEmail = async (id) => {
    try { await dispatch(sendPayslipEmail(id)).unwrap(); toast.success('Email sent') } catch (e) { toast.error(e || 'Failed to send email') }
  }

  const handleDownloadPdf = (id) => setPdfPreviewId(id)

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
      dispatch(fetchPayslips({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Generation failed') }
  }

  const filtered = search
    ? payslips.filter(p => {
        const emp = p.employee
        const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : ''
        return `${name} ${p.status || ''} ${p.startDate || ''}`.toLowerCase().includes(search.toLowerCase())
      })
    : payslips

  const paidCount = payslips.filter(p => p.status === 'PAID').length
  const pendingCount = payslips.filter(p => p.status === 'DRAFT' || p.status === 'REVIEW_ONGOING').length
  const confirmedCount = payslips.filter(p => p.status === 'CONFIRMED').length

  const columns = [
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
      cell: ({ getValue }) => <Badge label={getValue() || 'Draft'} variant={STATUS_VARIANT[getValue()] || 'default'} />,
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
            onClick={() => handleDownloadPdf(row.original.id)}
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
          {canApprovePayroll && row.original.status === 'DRAFT' && (
            <button
              onClick={() => handleConfirm(row.original.id)}
              className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Confirm
            </button>
          )}
          {canApprovePayroll && row.original.status === 'CONFIRMED' && (
            <button
              onClick={() => handleMarkPaid(row.original.id)}
              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              Mark Paid
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payslips</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEmp ? 'Your payslips and earnings history' : 'Employee payslip management'}
          </p>
        </div>
        {!isEmp && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => dispatch(exportPayslipsExcel({})).unwrap().catch(() => toast.error('Export failed'))}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              title="Export to Excel"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={() => navigate('/payroll/import')}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import
            </button>
            {canApprovePayroll && (
              <button
                onClick={() => { reset({}); setGenModal(true) }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{payslips.length}</p>
              <p className="text-xs text-gray-500 font-medium">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{paidCount}</p>
              <p className="text-xs text-gray-500 font-medium">Paid</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600">
              <CurrencyDollarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{confirmedCount}</p>
              <p className="text-xs text-gray-500 font-medium">Confirmed</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{pendingCount}</p>
              <p className="text-xs text-gray-500 font-medium">Pending</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search employee, status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={filtered} loading={loading} />
      </div>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Payslip Detail" size="md">
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
                  onClick={() => { setDetail(null); setPdfPreviewId(detail.id) }}
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
        open={!!pdfPreviewId}
        onClose={() => setPdfPreviewId(null)}
        payslipId={pdfPreviewId}
      />

      {/* Bulk Generate Modal */}
      <Modal
        open={genModal}
        onClose={() => setGenModal(false)}
        title="Generate Payslips"
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
    </div>
  )
}
