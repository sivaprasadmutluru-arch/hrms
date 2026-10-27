import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchRotatingShiftAssigns, deleteRotatingShiftAssign,
  fetchRotatingWorkTypeAssigns, deleteRotatingWorkTypeAssign,
  rotateShiftAssign,
  selectShiftAssigns, selectWorkTypeAssigns, selectRotatingAssignsLoading,
} from './rotatingAssignsSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Spinner from '../../components/common/Spinner'
import ConfirmModal from '../../components/common/ConfirmModal'
import RotatingAssignFormModal from './RotatingAssignFormModal'
import BulkRotatingAssignModal from './BulkRotatingAssignModal'

function empName(e) {
  if (!e) return '—'
  return e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email || `#${e.id}`
}

function ShiftAssignTable({ assigns, onEdit, onDelete, onRotate }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Current Shift</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Next Shift</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Rotates Every</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Next Change</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assigns.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No assignments found</td></tr>
            )}
            {assigns.map(a => {
              const interval = a.rotateAfterEvery
                ? `${a.rotateAfterEveryCount ?? 1} ${a.rotateAfterEvery.toLowerCase()}`
                : a.rotateAfterDay ? `${a.rotateAfterDay} days` : '—'
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{empName(a.employee)}</td>
                  <td className="py-3 px-4 text-gray-600">{a.rotatingShift?.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{a.currentShift?.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{a.nextShift?.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{interval}</td>
                  <td className="py-3 px-4 text-gray-500">{a.nextChangeDate || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => onRotate(a)} className="text-xs text-purple-600 hover:underline">Rotate Now</button>
                      <button onClick={() => onEdit(a)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => onDelete(a)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WorkTypeAssignTable({ assigns, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Start Date</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assigns.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No assignments found</td></tr>
            )}
            {assigns.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{empName(a.employee)}</td>
                <td className="py-3 px-4 text-gray-600">{a.rotatingWorkType?.name || '—'}</td>
                <td className="py-3 px-4 text-gray-500">{a.startDate || '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => onEdit(a)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => onDelete(a)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function RotatingShiftAssignsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const shiftAssigns = useSelector(selectShiftAssigns)
  const workTypeAssigns = useSelector(selectWorkTypeAssigns)
  const loading = useSelector(selectRotatingAssignsLoading)

  const [activeTab, setActiveTab] = useState('shift')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showBulk, setShowBulk] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchRotatingShiftAssigns(user?.companyId))
    dispatch(fetchRotatingWorkTypeAssigns(user?.companyId))
  }, [dispatch, user?.companyId])

  const handleDelete = async () => {
    const res = activeTab === 'shift'
      ? await dispatch(deleteRotatingShiftAssign(confirmDelete.id))
      : await dispatch(deleteRotatingWorkTypeAssign(confirmDelete.id))
    if (res.error) toast.error(res.payload)
    else toast.success('Assignment deleted')
    setConfirmDelete(null)
  }

  const handleRotate = async (assign) => {
    const res = await dispatch(rotateShiftAssign(assign.id))
    if (res.error) toast.error(res.payload)
    else toast.success(`Rotated: now on "${res.payload?.currentShift?.name || 'next shift'}"`)
  }

  if (loading && !shiftAssigns.length && !workTypeAssigns.length) {
    return <div className="flex justify-center p-12"><Spinner /></div>
  }

  return (
    <div className="attendance-workspace attendance-rotating-shifts-page p-6">
      <PageHeader
        title="Rotating Assignments"
        subtitle="Manage rotating shift and work type assignments"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBulk(true)}>Bulk Assign</Button>
            <Button onClick={() => { setEditing(null); setShowForm(true) }}>+ New Assignment</Button>
          </div>
        }
      />

      <div className="mt-4 flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('shift')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'shift' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
        >
          Shift Assigns
        </button>
        <button
          onClick={() => setActiveTab('workType')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'workType' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
        >
          Work Type Assigns
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'shift' ? (
          <ShiftAssignTable
            assigns={shiftAssigns}
            onEdit={(a) => { setEditing(a); setShowForm(true) }}
            onDelete={setConfirmDelete}
            onRotate={handleRotate}
          />
        ) : (
          <WorkTypeAssignTable
            assigns={workTypeAssigns}
            onEdit={(a) => { setEditing(a); setShowForm(true) }}
            onDelete={setConfirmDelete}
          />
        )}
      </div>

      {showForm && (
        <RotatingAssignFormModal
          assign={editing}
          type={activeTab}
          companyId={user?.companyId}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {showBulk && (
        <BulkRotatingAssignModal
          type={activeTab}
          companyId={user?.companyId}
          onClose={() => setShowBulk(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Assignment"
          message="Delete this rotating assignment?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
