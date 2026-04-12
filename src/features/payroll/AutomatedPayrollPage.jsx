import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  fetchPayslipAutoGenerate, upsertPayslipAutoGenerate,
  fetchAutoPayslips, triggerAutoGenerate,
  deletePayslip, deletePayslipGroup,
  selectPayslipAutoGenerate, selectAutoPayslips, selectLoading,
} from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Input from '../../components/common/Input'
import PdfPreviewModal from '../../components/common/PdfPreviewModal'
import ConfirmModal from '../../components/common/ConfirmModal'
import { formatCurrency } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

const GENERATE_DAY_OPTIONS = [
  { value: 'last day', label: 'Last Day of Month' },
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
]

const STATUS_VARIANT = {
  PAID: 'success',
  CONFIRMED: 'primary',
  DRAFT: 'default',
  REVIEW_ONGOING: 'warning',
  MIXED: 'secondary',
}

function groupStatus(payslips) {
  const statuses = [...new Set(payslips.map(p => p.status).filter(Boolean))]
  return statuses.length === 1 ? statuses[0] : 'MIXED'
}

export default function AutomatedPayrollPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const loading = useSelector(selectLoading)
  const autoGenerate = useSelector(selectPayslipAutoGenerate)
  const autoPayslips = useSelector(selectAutoPayslips)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [triggering, setTriggering] = useState(false)
  const [activeTab, setActiveTab] = useState('payrolls')
  const [pdfPreviewId, setPdfPreviewId] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null, group: null })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (!companyId) return
    dispatch(fetchPayslipAutoGenerate(companyId))
    dispatch(fetchAutoPayslips())
  }, [dispatch, companyId])

  useEffect(() => {
    if (autoGenerate) reset({
      autoGenerate: autoGenerate.autoGenerate,
      generateDay: autoGenerate.generateDay != null ? String(autoGenerate.generateDay) : '',
      generateTime: autoGenerate.generateTime || '00:00',
      notifyEmail: autoGenerate.notifyEmail,
    })
  }, [autoGenerate, reset])

  const onTrigger = async () => {
    setTriggering(true)
    try {
      await dispatch(triggerAutoGenerate()).unwrap()
      toast.success('Payslips generated successfully')
      dispatch(fetchAutoPayslips())
    } catch (e) {
      toast.error(e || 'Generation failed')
    } finally {
      setTriggering(false)
    }
  }

  const onSave = async (data) => {
    console.log('[AutoPayroll] Saving config:', { companyId, data })
    try {
      const result = await dispatch(upsertPayslipAutoGenerate({ companyId, data })).unwrap()
      console.log('[AutoPayroll] Save response:', result)
      toast.success('Auto-generate settings saved')
    } catch (e) {
      console.error('[AutoPayroll] Save failed:', e)
      toast.error(e || 'Failed to save')
    }
  }

  // Group payslips by period
  const groups = useMemo(() => {
    const map = {}
    autoPayslips.forEach(p => {
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
  }, [autoPayslips])

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleDeletePayslip = (id) => setConfirmModal({ open: true, id, action: 'payslip', group: null })
  const handleDeleteGroup = (group) => setConfirmModal({ open: true, id: null, action: 'group', group })

  const onConfirmDelete = async () => {
    const { id, action, group } = confirmModal
    try {
      if (action === 'payslip') { await dispatch(deletePayslip(id)).unwrap(); toast.success('Payslip deleted') }
      else if (action === 'group') { await dispatch(deletePayslipGroup(group.payslips.map(p => p.id))).unwrap(); toast.success('Payroll group deleted') }
    } catch (e) { toast.error(e || 'Failed to delete') }
    finally { setConfirmModal({ open: false, id: null, action: null, group: null }) }
  }

  const handleDownloadPdf = (id) => setPdfPreviewId(id)

  const TABS = [
    { id: 'payrolls', label: 'Generated Payrolls' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Payroll"
        subtitle="Configure automatic monthly payslip generation"
      />

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Generated Payrolls tab ──────────────────────────────────────────── */}
      {activeTab === 'payrolls' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button variant="secondary" size="sm" onClick={() => dispatch(fetchAutoPayslips())} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : groups.length === 0 ? (
            <div className="flex justify-center py-12 text-gray-400 text-sm">
              No automated payroll runs yet. Runs will appear here after the scheduler generates them.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(group => {
                const isOpen = expandedGroups.has(group.key)
                const status = groupStatus(group.payslips)
                const label = group.groupName || (group.startDate ? `${group.startDate} – ${group.endDate}` : 'Ungrouped')

                return (
                  <div key={group.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-gray-400 flex-shrink-0">
                        {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
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
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group) }}
                        >
                          Delete
                        </Button>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 overflow-x-auto">
                        <table className="min-w-full text-sm">
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
                              <th className="px-4 py-2 text-center font-medium">Delete</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.payslips.map(p => {
                              const emp = p.employee
                              const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
                              let payHead = null
                              try { payHead = p.payHeadData ? JSON.parse(p.payHeadData) : null } catch { /* ignore */ }
                              const allowances = payHead?.allowances ?? []
                              const housingAllow = allowances.find(a => a.name?.toLowerCase().includes('housing'))?.amount || 0
                              const transportAllow = allowances.find(a => a.name?.toLowerCase().includes('transport'))?.amount || 0
                              const otherAllow = allowances.find(a => a.name?.toLowerCase().includes('other'))?.amount || 0
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
                                  <td className="px-4 py-2.5 text-center">
                                    <Button size="sm" variant="danger" onClick={() => handleDeletePayslip(p.id)}>Delete</Button>
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
                              <td colSpan={3} />
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
        </div>
      )}

      {/* ── Settings tab ────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-5">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Auto-Generation Schedule</h3>
            <p className="text-sm text-gray-500">
              When enabled, payslips for the previous month are automatically generated on the configured day.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoGenerate"
              {...register('autoGenerate')}
              className="h-4 w-4 text-indigo-600 rounded"
            />
            <label htmlFor="autoGenerate" className="text-sm text-gray-700">
              Enable automatic payslip generation
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generate on Day of Month
            </label>
            <select
              {...register('generateDay')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select day —</option>
              {GENERATE_DAY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Payslips will cover the full previous calendar month on this day.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generate at Time
            </label>
            <input
              type="time"
              {...register('generateTime')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              24-hour time. The scheduler checks every minute and triggers when day + time match.
            </p>
          </div>

          <Input
            label="Notification Email"
            type="email"
            placeholder="hr@company.com"
            error={errors.notifyEmail?.message}
            {...register('notifyEmail')}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onTrigger} disabled={triggering || loading}>
              {triggering ? 'Generating…' : 'Generate Now'}
            </Button>
            <Button onClick={handleSubmit(onSave)} disabled={loading}>
              {loading ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}

      <PdfPreviewModal
        open={!!pdfPreviewId}
        onClose={() => setPdfPreviewId(null)}
        payslipId={pdfPreviewId}
      />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null, group: null })}
        onConfirm={onConfirmDelete}
        title={confirmModal.action === 'group' ? 'Delete Payroll Group' : 'Delete Payslip'}
        message={confirmModal.action === 'group'
          ? `Delete all ${confirmModal.group?.payslips?.length || 0} payslip(s) in this group? This cannot be undone.`
          : 'Are you sure you want to delete this payslip? This cannot be undone.'}
        confirmLabel="Delete"
        loading={loading}
      />
    </div>
  )
}
