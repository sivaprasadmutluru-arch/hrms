import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAuditLogs, selectAuditLogs, selectAuditPagination, selectAuditLoading } from './auditSlice'
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import Input from '../../components/common/Input'

export default function AuditLogPage() {
  const dispatch = useDispatch()
  const logs = useSelector(selectAuditLogs)
  const pagination = useSelector(selectAuditPagination)
  const loading = useSelector(selectAuditLoading)
  const [entityType, setEntityType] = useState('')

  useEffect(() => {
    dispatch(fetchAuditLogs({ entityType: entityType || undefined }))
  }, [dispatch, entityType])

  const columns = [
    { accessorKey: 'changedAt', header: 'Time', cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleString() : '—' },
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'entityId', header: 'ID' },
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'changedBy', header: 'Changed By', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'oldValues', header: 'Old Values', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block text-xs text-gray-500">{getValue() || '—'}</span>
    )},
    { accessorKey: 'newValues', header: 'New Values', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block text-xs text-gray-500">{getValue() || '—'}</span>
    )},
  ]

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="System-wide change history" />
      <div className="mb-4 max-w-xs">
        <Input
          label="Filter by Entity Type"
          placeholder="e.g. Employee, Leave..."
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
      </div>
      <DataTable columns={columns} data={logs} loading={loading} />
      {pagination.total > pagination.size && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {logs.length} of {pagination.total} records
        </div>
      )}
    </div>
  )
}
