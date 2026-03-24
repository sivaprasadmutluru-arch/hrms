import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchLeaveBalance, selectLeaveBalance, selectLoading } from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'

export default function LeaveBalancePage() {
  const dispatch = useDispatch()
  const leaveBalance = useSelector(selectLeaveBalance)
  const loading = useSelector(selectLoading)

  useEffect(() => {
    dispatch(fetchLeaveBalance())
  }, [dispatch])

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { id: 'leaveType', header: 'Leave Type', cell: ({ row }) => row.original.leaveType?.name || '—' },
    { accessorKey: 'totalLeaveDays', header: 'Total', cell: ({ getValue }) => getValue() ?? 0 },
    { accessorKey: 'availableDays', header: 'Available', cell: ({ getValue }) => getValue() ?? 0 },
    { id: 'used', header: 'Used', cell: ({ row }) => {
      const total = row.original.totalLeaveDays ?? 0
      const available = row.original.availableDays ?? 0
      return (total - available).toFixed(1)
    }},
    { accessorKey: 'carryforwardDays', header: 'Carry Forward', cell: ({ getValue }) => getValue() ?? 0 },
    { accessorKey: 'assignedDate', header: 'Assigned', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'expiredDate', header: 'Expires', cell: ({ getValue }) => getValue() || '—' },
  ]

  return (
    <div>
      <PageHeader title="Leave Balance" subtitle="Available leave days per employee and type" />
      <DataTable columns={columns} data={leaveBalance} loading={loading} />
    </div>
  )
}
