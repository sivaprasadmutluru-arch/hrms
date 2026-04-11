import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { fetchUserGroups, deleteUserGroup, selectUserGroups, selectUserGroupsLoading } from './userGroupsSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Spinner from '../../components/common/Spinner'
import ConfirmModal from '../../components/common/ConfirmModal'
import UserGroupFormModal from './UserGroupFormModal'
import UserGroupMembersModal from './UserGroupMembersModal'

export default function UserGroupsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const groups = useSelector(selectUserGroups)
  const loading = useSelector(selectUserGroupsLoading)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [membersGroup, setMembersGroup] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchUserGroups(user?.companyId))
  }, [dispatch, user?.companyId])

  const handleDelete = async () => {
    const res = await dispatch(deleteUserGroup(confirmDelete.id))
    if (res.error) toast.error(res.payload)
    else toast.success('Group deleted')
    setConfirmDelete(null)
  }

  if (loading && !groups.length) return <div className="flex justify-center p-12"><Spinner /></div>

  return (
    <div className="p-6">
      <PageHeader
        title="User Groups"
        subtitle="Manage permission groups and their members"
        action={<Button onClick={() => { setEditing(null); setShowForm(true) }}>+ New Group</Button>}
      />

      <div className="mt-6 space-y-3">
        {groups.length === 0 && (
          <div className="text-center py-12 text-gray-400">No user groups yet. Create one to get started.</div>
        )}
        {groups.map(group => (
          <div key={group.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900">{group.name}</h3>
              {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
              {group.permissions && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(typeof group.permissions === 'string' ? group.permissions.split(',') : group.permissions).map(p => (
                    <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">{p.trim()}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="secondary" onClick={() => setMembersGroup(group)}>Members</Button>
              <Button size="sm" variant="secondary" onClick={() => { setEditing(group); setShowForm(true) }}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(group)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <UserGroupFormModal
          group={editing}
          companyId={user?.companyId}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {membersGroup && (
        <UserGroupMembersModal
          group={membersGroup}
          onClose={() => setMembersGroup(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete User Group"
          message={`Are you sure you want to delete "${confirmDelete.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
