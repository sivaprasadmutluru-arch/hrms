import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { fetchPayslips, confirmPayslip, markPaid, generatePayslip, generateBulkPayslips, selectLoading } from './payrollSlice'
import { useForm } from 'react-hook-form'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatCurrency } from '../../utils/formatters'
import { API_BASE_URL } from '../../config/constants'

export default function PayslipsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const payslips = useSelector(s => s.payroll.payslips)
  const loading = useSelector(selectLoading)
  const [detail, setDetail] = useState(null)
  const [genModal, setGenModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchPayslips({ page: 0, size: 20 })) }, [dispatch])

  const handleConfirm = async (id) => {
    try { await dispatch(confirmPayslip(id)).unwrap(); toast.success('Payslip confirmed') } catch { toast.error('Failed') }
  }
  const handleMarkPaid = async (id) => {
    try { await dispatch(markPaid(id)).unwrap(); toast.success('Marked as paid') } catch { toast.error('Failed') }
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

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { id: 'period', header: 'Period', cell: ({ row }) => {
      const { startDate, endDate } = row.original
      return startDate && endDate ? `${startDate} – ${endDate}` : startDate || '—'
    }},
    { accessorKey: 'grossPay', header: 'Gross', cell: ({ getValue }) => formatCurrency(getValue()) },
    { accessorKey: 'totalDeduction', header: 'Deductions', cell: ({ getValue }) => formatCurrency(getValue()) },
    { accessorKey: 'netPay', header: 'Net Pay', cell: ({ getValue }) => <span className="font-semibold text-emerald-700">{formatCurrency(getValue())}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Draft'} variant={getValue() === 'PAID' ? 'success' : getValue() === 'CONFIRMED' ? 'primary' : 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDetail(row.original)}>View</Button>
        <Button size="sm" variant="secondary" onClick={() => handleDownloadPdf(row.original.id)}>PDF</Button>
        {row.original.status === 'DRAFT' && <Button size="sm" variant="primary" onClick={() => handleConfirm(row.original.id)}>Confirm</Button>}
        {row.original.status === 'CONFIRMED' && <Button size="sm" variant="success" onClick={() => handleMarkPaid(row.original.id)}>Mark Paid</Button>}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Payslips" subtitle="Employee payslip management"
        actions={<Button onClick={() => { reset({}); setGenModal(true) }}>Generate Payslips</Button>} />
      <DataTable columns={columns} data={payslips} loading={loading} />
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Payslip Detail" size="md">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Employee</span><span className="font-medium">{detail.employee ? `${detail.employee.firstName || ''} ${detail.employee.lastName || ''}`.trim() : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Period</span><span>{detail.startDate && detail.endDate ? `${detail.startDate} – ${detail.endDate}` : detail.startDate || '—'}</span></div>
            <hr />
            <div className="flex justify-between"><span className="text-gray-500">Basic Pay</span><span>{formatCurrency(detail.basicPay)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Allowances</span><span>{formatCurrency(detail.totalAllowance)}</span></div>
            <div className="flex justify-between text-red-600"><span>Deductions</span><span>-{formatCurrency(detail.totalDeduction)}</span></div>
            <hr />
            <div className="flex justify-between font-semibold text-base"><span>Net Pay</span><span className="text-emerald-700">{formatCurrency(detail.netPay)}</span></div>
          </div>
        )}
      </Modal>

      {/* Bulk Generate Modal */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title="Generate Payslips"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGenModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit(handleBulkGenerate)}>Generate</Button>
          </div>
        }>
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
