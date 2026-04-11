import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchLeaveBalance, selectLeaveBalance, selectLoading,
  fetchAccrualLog, selectAccrualLog,
} from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import { formatDate } from '../../utils/formatters'

export default function LeaveBalancePage() {
  const dispatch = useDispatch()
  const leaveBalance = useSelector(selectLeaveBalance)
  const loading = useSelector(selectLoading)
  const accrualLog = useSelector(selectAccrualLog)
  const [logModal, setLogModal] = useState(null) // { employeeId, leaveTypeId, name }

  useEffect(() => {
    dispatch(fetchLeaveBalance())
  }, [dispatch])

  const openLog = (row) => {
    setLogModal({ employeeId: row.employeeId, leaveTypeId: row.leaveTypeId, name: `${row.employeeName} – ${row.leaveTypeName}` })
    dispatch(fetchAccrualLog({ employeeId: row.employeeId, leaveTypeId: row.leaveTypeId }))
  }

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'leaveType', header: 'Leave Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'availableDays', header: 'Available', cell: ({ getValue }) => <span className="font-semibold">{(getValue() ?? 0).toFixed(1)}</span> },
    { accessorKey: 'carryforwardDays', header: 'Carry Forward', cell: ({ getValue }) => (getValue() ?? 0).toFixed(1) },
    { accessorKey: 'totalLeaveDays', header: 'Total (avail+cf)', cell: ({ getValue }) => (getValue() ?? 0).toFixed(1) },
    { id: 'used', header: 'Used', cell: ({ row }) => {
      const total = row.original.totalLeaveDays ?? 0
      const available = row.original.availableDays ?? 0
      const cf = row.original.carryforwardDays ?? 0
      return Math.max(0, total - available - cf).toFixed(1)
    }},
    { accessorKey: 'assignedDate', header: 'Assigned', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'expiredDate', header: 'Expires', cell: ({ getValue }) => getValue() || '—' },
    { id: 'accrualLog', header: '', cell: ({ row }) => (
      <Button size="sm" variant="ghost" onClick={() => openLog(row.original)}>Accrual Log</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Leave Balance" subtitle="Available leave days per employee and type" />
      <DataTable columns={columns} data={leaveBalance} loading={loading} />

      <Modal open={!!logModal} onClose={() => setLogModal(null)}
        title={`Accrual History — ${logModal?.name || ''}`}>
        {accrualLog.length === 0
          ? <p className="text-sm text-gray-400 italic">No accrual records found. This leave type may not have accrual enabled.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Days Credited</th>
                  <th className="pb-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {accrualLog.map(entry => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2">{formatDate(entry.accrualDate)}</td>
                    <td className="py-2 font-medium text-green-600">+{entry.days}</td>
                    <td className="py-2 text-gray-500">{entry.note === 'PRORATA_JOINING' ? 'Pro-rata (joining month)' : 'Monthly'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Modal>
    </div>
  )
}
