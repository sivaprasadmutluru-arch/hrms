import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchGratuities, calculateGratuity, updateGratuity, approveGratuity, deleteGratuity,
  selectGratuities, selectLoading,
} from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'
import useCurrency from '../../hooks/useCurrency'
import api from '../../services/api'

const CONTRACT_TYPE_OPTIONS = [
  { value: 'UNLIMITED', label: 'Unlimited Contract' },
  { value: 'LIMITED', label: 'Limited Contract' },
]

const STATUS_COLORS = { draft: 'yellow', approved: 'green' }

export default function GratuityPage() {
  const dispatch = useDispatch()
  const { user, isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager, isAccountant } = useAuth()
  const { format } = useCurrency()
  const gratuities = useSelector(selectGratuities)
  const loading = useSelector(selectLoading)

  const [calcModalOpen, setCalcModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null })
  const [employees, setEmployees] = useState([])
  const [preview, setPreview] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      contractType: 'UNLIMITED',
      leaveEncashmentDays: 0,
      pendingSalary: 0,
      airTicketAllowance: 0,
      loanDeduction: 0,
      noticePeriodDeduction: 0,
      otherDeductions: 0,
    }
  })

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm()

  const employeeId = watch('employeeId')

  // Fetch gratuities and employees on mount
  useEffect(() => {
    dispatch(fetchGratuities())
    api.get('/employees').then(r => setEmployees(r.data?.content || r.data || [])).catch(() => {})
  }, [dispatch])

  // Auto-fill joining date and basic salary when employee selected
  useEffect(() => {
    if (!employeeId) return
    api.get(`/payroll/contracts`, { params: { employeeId } })
      .then(r => {
        const contracts = r.data?.content || r.data || []
        const active = contracts.find(c => c.employee?.id === Number(employeeId) && c.contractStatus === 'ACTIVE')
                    || contracts.find(c => c.employee?.id === Number(employeeId))
        if (active) {
          if (active.startDate) setValue('joiningDate', active.startDate)
          if (active.wage)      setValue('basicSalary', active.wage)
        }
      })
      .catch(() => {})
  }, [employeeId, setValue])

  const employeeOptions = employees.map(e => ({
    value: String(e.id),
    label: `${e.firstName} ${e.lastName} (${e.badgeId || e.id})`,
  }))

  const onCalculate = async (data) => {
    try {
      const payload = {
        ...data,
        employeeId: Number(data.employeeId),
        companyId: user?.companyId,
        basicSalary: Number(data.basicSalary),
        leaveEncashmentDays: Number(data.leaveEncashmentDays || 0),
        pendingSalary: Number(data.pendingSalary || 0),
        airTicketAllowance: Number(data.airTicketAllowance || 0),
        loanDeduction: Number(data.loanDeduction || 0),
        noticePeriodDeduction: Number(data.noticePeriodDeduction || 0),
        otherDeductions: Number(data.otherDeductions || 0),
      }
      const result = await dispatch(calculateGratuity(payload)).unwrap()
      setPreview(result)
      toast.success('EOSB calculated successfully')
      setCalcModalOpen(false)
      reset()
    } catch (e) {
      toast.error(e || 'Calculation failed')
    }
  }

  const onEdit = async (data) => {
    try {
      await dispatch(updateGratuity({ id: selected.id, data: {
        ...data,
        gratuityAmount: Number(data.gratuityAmount),
        leaveEncashmentDays: Number(data.leaveEncashmentDays || 0),
        leaveEncashmentAmount: Number(data.leaveEncashmentAmount || 0),
        pendingSalary: Number(data.pendingSalary || 0),
        airTicketAllowance: Number(data.airTicketAllowance || 0),
        loanDeduction: Number(data.loanDeduction || 0),
        noticePeriodDeduction: Number(data.noticePeriodDeduction || 0),
        otherDeductions: Number(data.otherDeductions || 0),
      }})).unwrap()
      toast.success('Record updated')
      setEditOpen(false)
      setSelected(null)
    } catch (e) {
      toast.error(e || 'Update failed')
    }
  }

  const handleApprove = async (id) => {
    try {
      await dispatch(approveGratuity(id)).unwrap()
      toast.success('EOSB Approved')
    } catch (e) {
      toast.error(e || 'Approval failed')
    }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteGratuity(confirmDelete.id)).unwrap()
      toast.success('Record deleted')
      setConfirmDelete({ open: false, id: null })
      if (selected?.id === confirmDelete.id) { setDetailOpen(false); setSelected(null) }
    } catch (e) {
      toast.error(e || 'Delete failed')
    }
  }

  const openDetail = (row) => { setSelected(row); setPreview(row); setDetailOpen(true) }

  const openEdit = (row) => {
    setSelected(row)
    resetEdit({
      gratuityAmount: row.gratuityAmount,
      leaveEncashmentDays: row.leaveEncashmentDays,
      leaveEncashmentAmount: row.leaveEncashmentAmount,
      pendingSalary: row.pendingSalary,
      airTicketAllowance: row.airTicketAllowance,
      loanDeduction: row.loanDeduction,
      noticePeriodDeduction: row.noticePeriodDeduction,
      otherDeductions: row.otherDeductions,
      notes: row.notes,
    })
    setEditOpen(true)
  }

  const handleDownloadPdf = async (id) => {
    setDownloadingId(id)
    try {
      const res = await api.get(`/gratuity/${id}/report`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `EOSB_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download report')
    } finally {
      setDownloadingId(null)
    }
  }

  const isHR = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager() || isAccountant()

  const columns = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => `${row.original.employee?.firstName || ''} ${row.original.employee?.lastName || ''}`.trim() || '—',
    },
    {
      id: 'joiningDate',
      header: 'Joining Date',
      cell: ({ row }) => formatDate(row.original.joiningDate),
    },
    {
      id: 'lastWorkingDate',
      header: 'Last Working Date',
      cell: ({ row }) => formatDate(row.original.lastWorkingDate),
    },
    {
      id: 'servicePeriod',
      header: 'Service Period',
      cell: ({ row }) => `${row.original.completedYears}Y ${row.original.completedMonths}M ${row.original.completedDays}D`,
    },
    {
      id: 'gratuityAmount',
      header: 'Gratuity Amount',
      cell: ({ row }) => format(row.original.gratuityAmount),
    },
    {
      id: 'finalSettlementAmount',
      header: 'Final Settlement',
      cell: ({ row }) => <strong>{format(row.original.finalSettlementAmount)}</strong>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge label={row.original.status} variant={STATUS_COLORS[row.original.status?.toLowerCase()] || 'default'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => openDetail(r)}>View</Button>
            {isHR && (
              <>
                <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                {r.status === 'DRAFT' && (
                  <Button size="sm" variant="success" onClick={() => handleApprove(r.id)}>Approve</Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => handleDownloadPdf(r.id)} disabled={downloadingId === r.id}>
                  {downloadingId === r.id ? 'Downloading…' : 'PDF'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete({ open: true, id: r.id })}>Delete</Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="payroll-workspace">
      <PageHeader
        title="Gratuity / EOSB Calculator"
        subtitle="UAE Labour Law — End of Service Benefits"
        actions={
          isHR && (
            <Button onClick={() => { reset(); setCalcModalOpen(true) }}>
              + Calculate EOSB
            </Button>
          )
        }
      />

      <DataTable columns={columns} data={gratuities} loading={loading} />

      {/* ── Calculate Modal ── */}
      <Modal
        open={calcModalOpen}
        onClose={() => setCalcModalOpen(false)}
        title="Calculate End of Service Benefits (UAE)"
        size="lg"
        panelClassName="payroll-form-modal"
      >
        <form onSubmit={handleSubmit(onCalculate)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Employee *"
              options={employeeOptions}
              placeholder="Select employee"
              error={errors.employeeId?.message}
              {...register('employeeId', { required: 'Employee is required' })}
            />
            <Select
              label="Contract Type *"
              options={CONTRACT_TYPE_OPTIONS}
              error={errors.contractType?.message}
              {...register('contractType', { required: true })}
            />
            <Input
              label="Joining Date *"
              type="date"
              error={errors.joiningDate?.message}
              {...register('joiningDate', { required: 'Joining date is required' })}
            />
            <Input
              label="Last Working Date *"
              type="date"
              error={errors.lastWorkingDate?.message}
              {...register('lastWorkingDate', { required: 'Last working date is required' })}
            />
            <Input
              label="Basic Salary (Monthly) *"
              type="number"
              step="0.01"
              error={errors.basicSalary?.message}
              {...register('basicSalary', { required: 'Basic salary is required', min: 0 })}
            />
            <Input
              label="Leave Encashment (Days)"
              type="number"
              step="0.5"
              {...register('leaveEncashmentDays')}
            />
            <Input
              label="Pending Salary"
              type="number"
              step="0.01"
              {...register('pendingSalary')}
            />
            <Input
              label="Air Ticket Allowance"
              type="number"
              step="0.01"
              {...register('airTicketAllowance')}
            />
            <Input
              label="Loan Deduction"
              type="number"
              step="0.01"
              {...register('loanDeduction')}
            />
            <Input
              label="Notice Period Deduction"
              type="number"
              step="0.01"
              {...register('noticePeriodDeduction')}
            />
            <Input
              label="Other Deductions"
              type="number"
              step="0.01"
              {...register('otherDeductions')}
            />
          </div>
          <Input label="Notes" {...register('notes')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCalcModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Calculate & Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Detail / Preview Modal ── */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="EOSB Settlement Details"
        size="lg"
        panelClassName="payroll-form-modal"
      >
        {preview && <EosbBreakdown calc={preview} format={format} onDownload={() => handleDownloadPdf(preview.id)} />}
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit EOSB Record"
        size="lg"
        panelClassName="payroll-form-modal"
      >
        <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Gratuity Amount" type="number" step="0.01" {...regEdit('gratuityAmount')} />
            <Input label="Leave Encashment Days" type="number" step="0.5" {...regEdit('leaveEncashmentDays')} />
            <Input label="Leave Encashment Amount" type="number" step="0.01" {...regEdit('leaveEncashmentAmount')} />
            <Input label="Pending Salary" type="number" step="0.01" {...regEdit('pendingSalary')} />
            <Input label="Air Ticket Allowance" type="number" step="0.01" {...regEdit('airTicketAllowance')} />
            <Input label="Loan Deduction" type="number" step="0.01" {...regEdit('loanDeduction')} />
            <Input label="Notice Period Deduction" type="number" step="0.01" {...regEdit('noticePeriodDeduction')} />
            <Input label="Other Deductions" type="number" step="0.01" {...regEdit('otherDeductions')} />
          </div>
          <Input label="Notes" {...regEdit('notes')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete ── */}
      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete EOSB Record"
        message="Are you sure you want to delete this gratuity record? This cannot be undone."
      />
    </div>
  )
}

// ─── EOSB Breakdown Component ─────────────────────────────────────────────────

function EosbBreakdown({ calc, format, onDownload }) {
  const emp = calc.employee || {}
  const dept = emp.department?.departmentName || '—'
  const pos  = emp.jobPosition?.jobPosition || '—'

  const Row = ({ label, value, bold, deduction }) => (
    <div className={`flex justify-between py-2 border-b border-gray-100 ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={deduction ? 'text-red-600' : 'text-gray-900'}>{value}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Employee Info */}
      <div className="bg-purple-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="font-medium text-gray-500">Employee: </span><span className="text-gray-900">{emp.firstName} {emp.lastName}</span></div>
        <div><span className="font-medium text-gray-500">Department: </span><span className="text-gray-900">{dept}</span></div>
        <div><span className="font-medium text-gray-500">Designation: </span><span className="text-gray-900">{pos}</span></div>
        <div><span className="font-medium text-gray-500">Contract: </span><span className="text-gray-900">{calc.contractType}</span></div>
        <div><span className="font-medium text-gray-500">Joining Date: </span><span className="text-gray-900">{calc.joiningDate}</span></div>
        <div><span className="font-medium text-gray-500">Last Working Date: </span><span className="text-gray-900">{calc.lastWorkingDate}</span></div>
        <div className="col-span-2">
          <span className="font-medium text-gray-500">Total Service: </span>
          <span className="text-purple-700 font-semibold">
            {calc.completedYears} Years, {calc.completedMonths} Months, {calc.completedDays} Days
          </span>
        </div>
      </div>

      {/* Salary & Gratuity */}
      <div>
        <h4 className="text-sm font-semibold text-purple-700 mb-2">Gratuity Calculation</h4>
        <div className="text-sm space-y-0">
          <Row label="Basic Salary (Monthly)" value={format(calc.basicSalary)} />
          <Row label="Daily Basic Salary (÷30)" value={format(calc.dailyBasicSalary)} />
          <Row label="Gratuity Days" value={Number(calc.gratuityDays).toFixed(2)} />
          <Row label="Gratuity Amount" value={format(calc.gratuityAmount)} bold />
        </div>
      </div>

      {/* Settlement Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-purple-700 mb-2">Final Settlement Breakdown</h4>
        <div className="text-sm space-y-0">
          <Row label="Gratuity Amount" value={format(calc.gratuityAmount)} />
          <Row label={`Leave Encashment (${Number(calc.leaveEncashmentDays).toFixed(1)} days)`} value={format(calc.leaveEncashmentAmount)} />
          <Row label="Pending Salary" value={format(calc.pendingSalary)} />
          <Row label="Air Ticket Allowance" value={format(calc.airTicketAllowance)} />
          <Row label="Loan Deduction" value={`– ${format(calc.loanDeduction)}`} deduction />
          <Row label="Notice Period Deduction" value={`– ${format(calc.noticePeriodDeduction)}`} deduction />
          <Row label="Other Deductions" value={`– ${format(calc.otherDeductions)}`} deduction />
        </div>
        <div className="flex justify-between mt-3 py-3 px-4 bg-purple-700 text-white rounded-lg font-bold text-base">
          <span>Total Final Settlement</span>
          <span>{format(calc.finalSettlementAmount)}</span>
        </div>
      </div>

      {calc.notes && (
        <div className="text-sm text-gray-500 italic">Notes: {calc.notes}</div>
      )}

      <div className="flex justify-between items-center pt-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${calc.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {calc.status}
          {calc.approvedBy && ` — ${calc.approvedBy.firstName} ${calc.approvedBy.lastName}`}
        </span>
        <Button onClick={onDownload} variant="secondary" size="sm">
          Download PDF Report
        </Button>
      </div>
    </div>
  )
}
