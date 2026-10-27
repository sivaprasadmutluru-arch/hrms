import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchApprovalConditions, createApprovalCondition, updateApprovalCondition, deleteApprovalCondition,
  selectApprovalConditions, selectLoading
} from './companiesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

const FIELD_OPTIONS = [{ value: 'REQUESTED_DAYS', label: 'Requested Days' }]
const OPERATOR_OPTIONS = [
  { value: 'EQUAL', label: 'Equal (=)' },
  { value: 'GT', label: 'Greater than (>)' },
  { value: 'LT', label: 'Less than (<)' },
  { value: 'GTE', label: 'Greater than or equal (>=)' },
  { value: 'LTE', label: 'Less than or equal (<=)' },
  { value: 'RANGE', label: 'Range (between)' },
]

export default function ApprovalConditionsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const conditions = useSelector(selectApprovalConditions)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const operator = watch('conditionOperator')

  useEffect(() => { dispatch(fetchApprovalConditions()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({
      conditionField: row.conditionField,
      conditionOperator: row.conditionOperator,
      conditionValue: row.conditionValue,
      conditionStartValue: row.conditionStartValue,
      conditionEndValue: row.conditionEndValue,
    })
    setModalOpen(true)
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteApprovalCondition(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateApprovalCondition({ id: editing.id, data })).unwrap()
        toast.success('Condition updated')
      } else {
        await dispatch(createApprovalCondition({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Condition created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'conditionField', header: 'Field' },
    { accessorKey: 'conditionOperator', header: 'Operator' },
    { id: 'value', header: 'Value', cell: ({ row }) => {
      const r = row.original
      if (r.conditionOperator === 'RANGE') return `${r.conditionStartValue} – ${r.conditionEndValue}`
      return r.conditionValue || '—'
    }},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="admin-settings-workspace">
      <PageHeader title="Approval Conditions" subtitle="Multi-level approval condition rules"
        actions={<Button onClick={openCreate}>+ Add Condition</Button>} />
      <div className="admin-settings-table"><DataTable columns={columns} data={conditions} loading={loading} /></div>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Condition"
        message="Are you sure you want to delete this approval condition? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Condition' : 'Add Condition'} panelClassName="admin-settings-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="admin-settings-form">
          <Select label="Field" options={FIELD_OPTIONS} {...register('conditionField')} />
          <Select label="Operator" options={OPERATOR_OPTIONS} {...register('conditionOperator')} />
          {operator === 'RANGE' ? (
            <div className="flex gap-2">
              <Input label="From" {...register('conditionStartValue')} />
              <Input label="To" {...register('conditionEndValue')} />
            </div>
          ) : (
            <Input label="Value" {...register('conditionValue')} />
          )}
        </div>
      </Modal>
    </div>
  )
}
