import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAll, markRead, markAllRead, selectAll, selectLoading } from './notificationsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Spinner from '../../components/common/Spinner'
import EmptyState from '../../components/common/EmptyState'
import { formatDateTime } from '../../utils/formatters'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const dispatch = useDispatch()
  const notifications = useSelector(selectAll)
  const loading = useSelector(selectLoading)

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 50 })) }, [dispatch])

  const handleMarkRead = async (id) => {
    try { await dispatch(markRead(id)).unwrap() } catch { toast.error('Failed') }
  }
  const handleMarkAll = async () => {
    try { await dispatch(markAllRead()).unwrap(); toast.success('All marked as read') } catch { toast.error('Failed') }
  }

  if (loading) return <Spinner className="py-16" />

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Your recent notifications"
        actions={notifications.some(n => !n.isRead) && <Button variant="secondary" onClick={handleMarkAll}><CheckIcon className="h-4 w-4 mr-1" />Mark All Read</Button>} />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card key={n.id} className={`transition-colors ${!n.isRead ? 'border-l-4 border-l-indigo-500' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <BellIcon className={`h-4 w-4 ${!n.isRead ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title || n.message}</p>
                    {n.body && <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
                {!n.isRead && (
                  <button onClick={() => handleMarkRead(n.id)} className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
                    Mark read
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
