import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  fetchPayslips, exportPayslipsExcel, generatePayslip, generateBulkPayslips,
  selectLoading, selectExportingExcel,
} from './payrollSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from '../employees/employeesSlice'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { formatCurrency } from '../../utils/formatters'
import { API_BASE_URL } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

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
  const { user } = useAuth()
  const companyId = user?.companyId
  const payslips = useSelector(s => s.payroll.payslips)
  const employees = useSelector(selectEmployees)
  const loading = useSelector(selectLoading)
  const exportingExcel = useSelector(selectExportingExcel)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [exportingGroupKey, setExportingGroupKey] = useState(null)
  const [exportModal, setExportModal] = useState(false)
  const [generateModal, setGenerateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { register: regExport, handleSubmit: handleExportSubmit, reset: resetExport } = useForm()
  const { register: regGen, handleSubmit: handleGenSubmit, reset: resetGen, watch: watchGen } = useForm({
    defaultValues: { mode: 'bulk' },
  })
  const genMode = watchGen('mode')

  useEffect(() => {
    dispatch(fetchPayslips({ page: 0, size: 500 }))
    dispatch(fetchEmployees({ page: 0, size: 500 }))
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

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleDownloadPdf = (id) => {
    const token = localStorage.getItem('token')
    fetch(`${API_BASE_URL}/payroll/payslips/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payslip-${id}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => toast.error('PDF download failed'))
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

            return (
              <div key={group.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">

                {/* ── Group header row ─────────────────────────────────── */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
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
                    <div
                      onClick={(e) => handleExportGroup(e, group)}
                      role="button"
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                        exportingGroupKey === group.key
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer'
                      }`}
                    >
                      {exportingGroupKey === group.key ? 'Exporting…' : 'Excel ↓'}
                    </div>
                  </div>
                </button>

                {/* ── Expanded individual payslips ─────────────────────── */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="px-5 py-2 text-left font-medium">Employee</th>
                          <th className="px-4 py-2 text-right font-medium">Basic Pay</th>
                          <th className="px-4 py-2 text-right font-medium">Housing</th>
                          <th className="px-4 py-2 text-right font-medium">Transport</th>
                          <th className="px-4 py-2 text-right font-medium">Other Allow.</th>
                          <th className="px-4 py-2 text-right font-medium">Gross Pay</th>
                          <th className="px-4 py-2 text-right font-medium">Deductions</th>
                          <th className="px-4 py-2 text-right font-medium">Net Pay</th>
                          <th className="px-4 py-2 text-center font-medium">Status</th>
                          <th className="px-4 py-2 text-center font-medium">PDF</th>
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
                          return (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
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
                                <Button size="sm" variant="ghost" onClick={() => handleDownloadPdf(p.id)}>PDF</Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 text-sm font-semibold border-t border-gray-200">
                        <tr>
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
