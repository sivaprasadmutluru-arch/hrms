import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDepartmentManagers, assignDepartmentManager, removeDepartmentManager,
  selectDepartmentManagers, selectLoading,
} from './helpdeskSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

export default function DepartmentManagersPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const managers = useSelector(selectDepartmentManagers)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchDepartmentManagers()) }, [dispatch])

  const handleRemove = (id) => setConfirmModal({ open: true, id })
  const onConfirmRemove = async () => {
    try { await dispatch(removeDepartmentManager(confirmModal.id)).unwrap(); toast.success('Removed') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(assignDepartmentManager({
        department: { id: Number(formData.departmentId) },
        manager: { id: Number(formData.managerId) },
      })).unwrap()
      toast.success('Manager assigned')
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const departmentCount = new Set(managers.map(item => item.department?.id ?? item.department?.name).filter(Boolean)).size

  return (
    <div className="support-workspace support-managers-workspace">
      <PageHeader title="Helpdesk Department Managers" subtitle="Assign managers to handle department tickets"
        actions={<Button onClick={() => { reset({}); setModalOpen(true) }}>+ Assign Manager</Button>} />
      <div className="support-metrics">
        <div className="support-metric support-metric-open"><span>Manager assignments</span><strong>{managers.length}</strong></div>
        <div className="support-metric support-metric-done"><span>Departments covered</span><strong>{departmentCount}</strong></div>
      </div>
      {loading ? <div className="support-table-loading">Loading department managers…</div> : managers.length === 0 ? (
        <div className="announcement-empty"><span className="announcement-empty-icon">↗</span><h2>No department managers assigned</h2><p>Assign a manager so incoming tickets can be routed to the right team.</p><Button onClick={() => { reset({}); setModalOpen(true) }}>Assign manager</Button></div>
      ) : (
        <div className="department-manager-list">
          {managers.map(item => {
            const name = [item.manager?.firstName, item.manager?.lastName].filter(Boolean).join(' ') || `Employee #${item.manager?.id || '—'}`
            return <article className="department-manager-card" key={item.id}>
              <div className="manager-avatar">{name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div>
              <div className="manager-identity"><span>DEPARTMENT MANAGER</span><h2>{name}</h2><p>{item.manager?.email || 'Support point of contact'}</p></div>
              <div className="manager-department"><span>ASSIGNED DEPARTMENT</span><strong>{item.department?.name || `Department #${item.department?.id || '—'}`}</strong></div>
              <Button size="sm" variant="danger" onClick={() => handleRemove(item.id)}>Remove assignment</Button>
            </article>
          })}
        </div>
      )}
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmRemove}
        title="Remove Manager Assignment"
        message="Are you sure you want to remove this manager assignment?"
        confirmLabel="Remove"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Assign Department Manager" panelClassName="support-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Assign</Button>
          </div>
        }>
        <div className="support-form">
          <Input label="Department ID" type="number" error={errors.departmentId?.message} {...register('departmentId', { required: 'Required' })} />
          <Input label="Manager Employee ID" type="number" error={errors.managerId?.message} {...register('managerId', { required: 'Required' })} />
        </div>
      </Modal>
    </div>
  )
}
