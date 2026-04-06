import { useEffect, useState } from 'react'
import api from '../../../services/api'
import Spinner from '../../../components/common/Spinner'
import Badge from '../../../components/common/Badge'
import { formatDate, formatCurrency } from '../../../utils/formatters'
import { API_BASE_URL } from '../../../config/constants'

const STATUS_VARIANT = {
  DRAFT:          'secondary',
  REVIEW_ONGOING: 'warning',
  CONFIRMED:      'primary',
  PAID:           'success',
}

async function downloadPdf(id) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE_URL}/payroll/payslips/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `payslip-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PayrollTab({ employeeId }) {
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!employeeId) return
    api.get(`/payroll/employee/${employeeId}/payslips`)
      .then(res => setPayslips(Array.isArray(res.data) ? res.data : res.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (!payslips.length) return <p className="text-sm text-gray-400 py-6">No payslips available.</p>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Period</th>
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic</th>
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross</th>
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deductions</th>
            <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Pay</th>
            <th className="text-center py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payslips.map(p => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="py-3 pr-4 text-gray-700">
                {formatDate(p.startDate)} – {formatDate(p.endDate)}
              </td>
              <td className="py-3 pr-4 text-right text-gray-700">{formatCurrency(p.basicPay)}</td>
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
                  onClick={() => downloadPdf(p.id)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
