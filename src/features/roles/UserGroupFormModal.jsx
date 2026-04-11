import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { createUserGroup, updateUserGroup } from './userGroupsSlice'
import { PERMISSIONS } from '../../config/constants'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

export default function UserGroupFormModal({ group, companyId, onClose }) {
  const dispatch = useDispatch()
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  })

  useEffect(() => {
    if (group) {
      const perms = group.permissions
        ? (typeof group.permissions === 'string' ? group.permissions.split(',').map(p => p.trim()) : group.permissions)
        : []
      reset({ name: group.name, description: group.description || '', permissions: perms })
    }
  }, [group, reset])

  const selectedPerms = watch('permissions') || []

  const togglePerm = (perm) => {
    const current = selectedPerms.includes(perm)
      ? selectedPerms.filter(p => p !== perm)
      : [...selectedPerms, perm]
    setValue('permissions', current)
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      permissions: data.permissions.join(','),
      company: companyId ? { id: companyId } : undefined,
    }
    const res = group
      ? await dispatch(updateUserGroup({ id: group.id, data: payload }))
      : await dispatch(createUserGroup(payload))

    if (res.error) { toast.error(res.payload); return }
    toast.success(group ? 'Group updated' : 'Group created')
    onClose()
  }

  return (
    <Modal title={group ? 'Edit User Group' : 'New User Group'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            {...register('name', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1">
            {PERMISSIONS.map(perm => (
              <label key={perm} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedPerms.includes(perm)}
                  onChange={() => togglePerm(perm)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-gray-700">{perm}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{group ? 'Save Changes' : 'Create Group'}</Button>
        </div>
      </form>
    </Modal>
  )
}
