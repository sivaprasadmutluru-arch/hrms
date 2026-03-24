import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchEmailLogs, selectEmailLogs, selectBaseExtrasLoading } from '../base/baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import useAuth from '../../hooks/useAuth'
import { formatDate } from '../../utils/formatters'

export default function EmailLogsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const logs = useSelector(selectEmailLogs)
  const loading = useSelector(selectBaseExtrasLoading)

  useEffect(() => {
    if (user?.companyId) dispatch(fetchEmailLogs(user.companyId))
  }, [dispatch, user?.companyId])

  const columns = [
    { accessorKey: 'recipientEmail', header: 'Recipient' },
    { accessorKey: 'subject', header: 'Subject' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => {
      const v = getValue()
      return <Badge label={v} variant={v === 'SENT' ? 'success' : v === 'FAILED' ? 'danger' : 'warning'} />
    }},
    { accessorKey: 'sentAt', header: 'Sent At', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'errorMessage', header: 'Error', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block text-red-500 text-xs">{getValue() || '—'}</span>
    )},
  ]

  return (
    <div>
      <PageHeader title="Email Logs" subtitle="Log of all sent and failed emails" />
      <DataTable columns={columns} data={logs} loading={loading} />
    </div>
  )
}
