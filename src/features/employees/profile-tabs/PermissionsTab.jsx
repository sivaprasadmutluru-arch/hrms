import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchUserPermissions, grantPermission, revokePermission, removePermissionOverride, selectUserPermissions, selectUserPermissionsLoading } from '../../roles/userPermissionsSlice'
import { PERMISSIONS } from '../../../config/constants'
import Button from '../../../components/common/Button'
import Spinner from '../../../components/common/Spinner'

export default function PermissionsTab({ employeeId, companyId }) {
  const dispatch = useDispatch()
  const permissions = useSelector(selectUserPermissions)
  const loading = useSelector(selectUserPermissionsLoading)
  const [action, setAction] = useState('grant')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (employeeId) dispatch(fetchUserPermissions({ userId: employeeId, companyId }))
  }, [dispatch, employeeId, companyId])

  const onSubmit = async (data) => {
    const payload = { userId: employeeId, permissionCode: data.permissionCode, reason: data.reason }
    const res = action === 'grant'
      ? await dispatch(grantPermission({ data: payload, companyId }))
      : await dispatch(revokePermission({ data: payload, companyId }))
    if (res.error) { toast.error(res.payload); return }
    toast.success(`Permission ${action}ed`)
    reset()
    dispatch(fetchUserPermissions({ userId: employeeId, companyId }))
  }

  const handleRemove = async (permissionCode) => {
    const res = await dispatch(removePermissionOverride({ userId: employeeId, permissionCode, companyId }))
    if (res.error) toast.error(res.payload)
    else toast.success('Override removed')
  }

  if (loading && !permissions.length) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Permission Overrides</h3>
        {permissions.length === 0 ? (
          <p className="text-sm text-gray-400">No permission overrides for this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Permission</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Type</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Reason</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id || p.permissionCode} className="border-b border-gray-50">
                    <td className="py-2 px-2 font-mono text-xs">{p.permissionCode}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'GRANTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.type || 'GRANTED'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-500">{p.reason || '—'}</td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => handleRemove(p.permissionCode)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Override</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Permission</label>
            <select
              {...register('permissionCode', { required: 'Required' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select permission...</option>
              {PERMISSIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.permissionCode && <p className="text-xs text-red-500 mt-1">{errors.permissionCode.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <input
              {...register('reason')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional reason"
            />
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-sm">
              <input type="radio" value="grant" checked={action === 'grant'} onChange={() => setAction('grant')} className="text-indigo-600" />
              Grant
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm">
              <input type="radio" value="revoke" checked={action === 'revoke'} onChange={() => setAction('revoke')} className="text-indigo-600" />
              Revoke
            </label>
          </div>
          <Button type="submit" size="sm">Apply Override</Button>
        </form>
      </div>
    </div>
  )
}
