import { useEffect, useState } from 'react'
import api from '../../../services/api'
import Spinner from '../../../components/common/Spinner'
import Badge from '../../../components/common/Badge'
import PdfPreviewModal from '../../../components/common/PdfPreviewModal'
import { formatDate } from '../../../utils/formatters'
import useCurrency from '../../../hooks/useCurrency'

const STATUS_VARIANT = {
  DRAFT:          'secondary',
  REVIEW_ONGOING: 'warning',
  CONFIRMED:      'primary',
  PAID:           'success',
}

export default function PayrollTab({ employeeId, companyId }) {
  const formatCurrency = useCurrency().format
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading]   = useState(true)
  const [pdfPreviewId, setPdfPreviewId] = useState(null)

  useEffect(() => {
    if (!employeeId) return
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    api.get(`/payroll/employee/${employeeId}/payslips`, cfg)
      .then(res => setPayslips(Array.isArray(res.data) ? res.data : res.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId, companyId])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (!payslips.length) return <p className="text-sm text-gray-400 py-6">No payslips available.</p>

  // Get all unique allowance types across all payslips
  const allowanceTypes = new Map()
  payslips.forEach(p => {
    try {
      const payHead = p.payHeadData ? JSON.parse(p.payHeadData) : null
      const allowances = payHead?.allowances ?? []
      allowances.forEach(a => {
        if (a.name && !allowanceTypes.has(a.name)) {
          allowanceTypes.set(a.name, a.name)
        }
      })
    } catch { /* ignore */ }
  })
  const allowanceTypesList = Array.from(allowanceTypes.values())

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (!payslips.length) return <p className="text-sm text-gray-400 py-6">No payslips available.</p>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[200px]">Period</th>
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic</th>
            {allowanceTypesList.map((allowanceType) => (
              <th key={allowanceType} className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{allowanceType}</th>
            ))}
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross</th>
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deductions</th>
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Pay</th>
            <th className="text-center py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payslips.map(p => {
            let payHead = null
            try { payHead = p.payHeadData ? JSON.parse(p.payHeadData) : null } catch { /* ignore */ }
            const allowances = payHead?.allowances ?? []
            const allowanceMap = Object.fromEntries(allowances.map(a => [a.name, a.amount || 0]))
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4 text-gray-700 min-w-[200px]">
                  {formatDate(p.startDate)} – {formatDate(p.endDate)}
                </td>
                <td className="py-3 pr-4 text-right text-gray-700">{formatCurrency(p.basicPay)}</td>
                {allowanceTypesList.map((allowanceType) => (
                  <td key={allowanceType} className="py-3 pr-4 text-right text-emerald-600">
                    {formatCurrency(allowanceMap[allowanceType] || 0)}
                  </td>
                ))}
                <td className="py-3 pr-4 text-right text-gray-700">{formatCurrency(p.grossPay)}</td>
                <td className="py-3 pr-4 text-right text-red-500">{formatCurrency(p.deduction)}</td>
                <td className="py-3 pr-4 text-right font-semibold text-emerald-600">{formatCurrency(p.netPay)}</td>
                <td className="py-3 pr-4 text-center">
                  <Badge
                    label={p.status?.replace(/_/g, ' ')}
                    variant={STATUS_VARIANT[p.status] || 'secondary'}
                  />
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => setPdfPreviewId(p.id)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View PDF
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    <PdfPreviewModal
        open={!!pdfPreviewId}
        onClose={() => setPdfPreviewId(null)}
        payslipId={pdfPreviewId}
      />
    </div>
  )
}
