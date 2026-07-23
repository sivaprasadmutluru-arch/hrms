import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchAll, markRead, markAllRead, deleteNotification, deleteAllNotifications, selectAll, selectLoading } from './notificationsSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import EmptyState from '../../components/common/EmptyState'
import { formatDateTime } from '../../utils/formatters'
import { BellIcon, CheckIcon, TrashIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/common/ConfirmModal'

const ROUTE_FIELDS = ['redirectUrl', 'redirectPath', 'targetUrl', 'targetPath', 'actionUrl', 'actionPath', 'link', 'url', 'path']
const RELATED_ID_FIELDS = ['relatedEntityId', 'relatedId', 'entityId', 'referenceId', 'targetId']

const asLocalRoute = (value) => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed, window.location.origin)
    if (parsed.origin === window.location.origin) return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    // Fall through and handle plain relative paths.
  }

  if (trimmed.startsWith('/')) return trimmed
  if (!trimmed.includes('://')) return `/${trimmed.replace(/^\/+/, '')}`
  return null
}

const getRelatedId = (notification) => {
  for (const field of RELATED_ID_FIELDS) {
    if (notification[field] !== undefined && notification[field] !== null && notification[field] !== '') {
      return notification[field]
    }
  }
  return null
}

const entityKey = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase()

// Maps notification payloads to the most specific route the current app supports.
const RELATED_ENTITY_ROUTES = {
  REGULARISATIONREQUEST: () => '/attendance/regularisation',
  ATTENDANCEREGULARISATION: () => '/attendance/regularisation',
  ATTENDANCEREGULARISATIONREQUEST: () => '/attendance/regularisation',
  LEAVEREQUEST: () => '/leave',
  LEAVE: () => '/leave',
  DOCUMENTREQUEST: () => '/documents/requests',
  DOCUMENT: () => '/documents/my',
  DISCIPLINARYACTION: () => '/disciplinary-actions',
  HRPOLICY: () => '/policies',
  POLICY: () => '/policies',
  PAYSLIP: () => '/payroll/payslips',
  PAYROLL: () => '/payroll/payslips',
  ASSETREQUEST: () => '/assets/requests',
  ASSET: (id) => id ? `/assets/${id}` : '/assets',
  PROJECT: (id) => id ? `/projects/${id}` : '/projects',
  TICKET: (id) => id ? `/helpdesk/${id}` : '/helpdesk',
  HELPDESKTICKET: (id) => id ? `/helpdesk/${id}` : '/helpdesk',
  EMPLOYEE: (id, notification) => {
    const companyId = notification.companyId || notification.relatedCompanyId || notification.targetCompanyId
    const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
    return id ? `/employees/${id}${query}` : '/employees'
  },
  CANDIDATE: () => '/recruitment/applicants',
  APPLICANT: () => '/recruitment/applicants',
  ONBOARDING: () => '/onboarding',
  OFFBOARDING: () => '/offboarding',
  RESIGNATION: () => '/offboarding/resignations',
  OBJECTIVE: () => '/performance/objectives',
  PERFORMANCEOBJECTIVE: () => '/performance/objectives',
  MEETING: () => '/performance/meetings',
}

const resolveNotificationRoute = (notification) => {
  for (const field of ROUTE_FIELDS) {
    const route = asLocalRoute(notification[field])
    if (route) return route
  }

  const relatedId = getRelatedId(notification)
  const resolveRoute = RELATED_ENTITY_ROUTES[entityKey(notification.relatedEntity || notification.type || notification.category)]
  return resolveRoute ? resolveRoute(relatedId, notification) : null
}

export default function NotificationsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const notifications = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const [confirmModal, setConfirmModal] = useState({ open: false })
  const [editModal, setEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', body: '' })

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 50 })) }, [dispatch])

  const openEdit = (n) => {
    setEditTarget(n)
    setEditForm({ title: n.title || n.message || '', body: n.body || '' })
    setEditModal(true)
  }

  const handleEditSave = async () => {
    try {
      await api.put(`/notifications/${editTarget.id}`, editForm)
      toast.success('Notification updated')
      setEditModal(false)
      setEditTarget(null)
      dispatch(fetchAll({ page: 0, size: 50 }))
    } catch { toast.error('Failed to update notification') }
  }

  const handleMarkRead = async (id) => {
    try { await dispatch(markRead(id)).unwrap() } catch { toast.error('Failed') }
  }
  const handleMarkAll = async () => {
    try { await dispatch(markAllRead()).unwrap(); toast.success('All marked as read') } catch { toast.error('Failed') }
  }
  const handleDelete = async (id) => {
    // Optimistic: slice already removes it
    dispatch(deleteNotification(id))
  }
  const handleDeleteAll = () => setConfirmModal({ open: true })
  const onConfirmDeleteAll = async () => {
    try { await dispatch(deleteAllNotifications()).unwrap(); toast.success('All notifications cleared') } catch { toast.error('Failed') }
    finally { setConfirmModal({ open: false }) }
  }

  const handleOpen = (n) => {
    if (!n.isRead) handleMarkRead(n.id)
    const route = resolveNotificationRoute(n)
    if (route) navigate(route)
  }

  if (loading) return <Spinner className="py-16" />

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Your recent notifications"
        actions={
          <div className="flex gap-2">
            {notifications.some(n => !n.isRead) && (
              <Button variant="secondary" onClick={handleMarkAll}><CheckIcon className="h-4 w-4 mr-1" />Mark All Read</Button>
            )}
            {notifications.length > 0 && (
              <Button variant="danger" onClick={handleDeleteAll}><TrashIcon className="h-4 w-4 mr-1" />Clear All</Button>
            )}
          </div>
        } />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const targetRoute = resolveNotificationRoute(n)
            const clickable = !!targetRoute
            return (
              <Card
                key={n.id}
                onClick={clickable ? () => handleOpen(n) : undefined}
                className={`transition-colors ${!n.isRead ? 'border-l-4 border-l-indigo-500' : ''} ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                      <BellIcon className={`h-4 w-4 ${!n.isRead ? 'text-indigo-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                      {n.message && <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {!n.isRead && (
                      <button onClick={() => handleMarkRead(n.id)} className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => openEdit(n)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-500 transition-colors" title="Edit">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(n.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <Modal
        open={editModal}
        onClose={() => { setEditModal(false); setEditTarget(null) }}
        title="Edit Notification"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setEditModal(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              rows={3}
              value={editForm.body}
              onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={onConfirmDeleteAll}
        title="Clear All Notifications"
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmLabel="Clear All"
        loading={loading}
      />
    </div>
  )
}
