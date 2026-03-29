import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchOutlookAuthList, saveOutlookAuth, deleteOutlookAuth,
  selectOutlookAuthList, selectOutlookAuthLoading
} from './outlookAuthSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function OutlookAuthPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const list = useSelector(selectOutlookAuthList)
  const loading = useSelector(selectOutlookAuthLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchOutlookAuthList()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({
      outlookClientId: row.outlookClientId,
      outlookClientSecret: row.outlookClientSecret,
      outlookTenantId: row.outlookTenantId,
      outlookEmail: row.outlookEmail,
      outlookDisplayName: row.outlookDisplayName,
      outlookRedirectUri: row.outlookRedirectUri,
      outlookAuthorizationUrl: row.outlookAuthorizationUrl,
      outlookTokenUrl: row.outlookTokenUrl,
      outlookApiEndpoint: row.outlookApiEndpoint,
      isPrimary: row.isPrimary,
      oauthState: row.oauthState,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Outlook integration?')) return
    try { await dispatch(deleteOutlookAuth(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(saveOutlookAuth({
        ...data,
        isPrimary: data.isPrimary === true || data.isPrimary === 'true',
        company: { id: user?.companyId },
        ...(editing ? { id: editing.id } : {}),
      })).unwrap()
      toast.success(editing ? 'Updated' : 'Created')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'outlookEmail', header: 'Email' },
    { accessorKey: 'outlookDisplayName', header: 'Display Name' },
    { accessorKey: 'outlookTenantId', header: 'Tenant ID' },
    { accessorKey: 'isPrimary', header: 'Primary', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Outlook / Azure Integration" subtitle="Configure Microsoft Outlook OAuth for email"
        actions={<Button onClick={openCreate}>+ Add Integration</Button>} />
      <DataTable columns={columns} data={list} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Outlook Integration' : 'Add Outlook Integration'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <Input label="Client ID" error={errors.outlookClientId?.message}
            {...register('outlookClientId', { required: 'Required' })} />
          <Input label="Client Secret" type="password" {...register('outlookClientSecret')} />
          <Input label="Tenant ID" error={errors.outlookTenantId?.message}
            {...register('outlookTenantId', { required: 'Required' })} />
          <Input label="Email" type="email" {...register('outlookEmail')} />
          <Input label="Display Name" {...register('outlookDisplayName')} />
          <Input label="Redirect URI" {...register('outlookRedirectUri')} />
          <Input label="Authorization URL" {...register('outlookAuthorizationUrl')} />
          <Input label="Token URL" {...register('outlookTokenUrl')} />
          <Input label="API Endpoint" {...register('outlookApiEndpoint')} />
          <Input label="OAuth State" {...register('oauthState')} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isPrimary')} className="rounded" />
            Set as Primary
          </label>
        </div>
      </Modal>
    </div>
  )
}
