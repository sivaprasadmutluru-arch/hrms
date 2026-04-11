import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { fetchGroupMembers, addGroupMember, removeGroupMember, bulkAssignGroupMembers } from './userGroupsSlice'
import { fetchAll as fetchEmployees } from '../employees/employeesSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import Spinner from '../../components/common/Spinner'

export default function UserGroupMembersModal({ group, onClose }) {
  const dispatch = useDispatch()
  const members = useSelector(s => s.userGroups.members[group.id] || [])
  const employees = useSelector(s => s.employees.data)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    dispatch(fetchGroupMembers(group.id))
    dispatch(fetchEmployees())
  }, [dispatch, group.id])

  const memberIds = new Set(members.map(m => m.id))
  const nonMembers = employees.filter(e => !memberIds.has(e.id))

  const handleRemove = async (userId) => {
    const res = await dispatch(removeGroupMember({ groupId: group.id, userId }))
    if (res.error) toast.error(res.payload)
    else toast.success('Member removed')
  }

  const handleBulkAssign = async () => {
    if (!selectedIds.length) return
    setLoading(true)
    const res = await dispatch(bulkAssignGroupMembers({ groupId: group.id, userIds: selectedIds }))
    setLoading(false)
    if (res.error) { toast.error(res.payload); return }
    toast.success(`${selectedIds.length} members added`)
    setSelectedIds([])
    dispatch(fetchGroupMembers(group.id))
  }

  return (
    <Modal title={`Members — ${group.name}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Members ({members.length})</h4>
          {members.length === 0 ? (
            <p className="text-sm text-gray-400">No members yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-800">{m.name || m.username}</span>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Add Members</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {nonMembers.map(e => (
              <label key={e.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(e.id)}
                  onChange={(ev) => {
                    setSelectedIds(ev.target.checked
                      ? [...selectedIds, e.id]
                      : selectedIds.filter(id => id !== e.id))
                  }}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">{e.name || e.username}</span>
              </label>
            ))}
            {nonMembers.length === 0 && <p className="text-sm text-gray-400">All employees are already members.</p>}
          </div>
          {selectedIds.length > 0 && (
            <Button size="sm" className="mt-2" onClick={handleBulkAssign} disabled={loading}>
              {loading ? <Spinner size="sm" /> : `Add ${selectedIds.length} Member(s)`}
            </Button>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
