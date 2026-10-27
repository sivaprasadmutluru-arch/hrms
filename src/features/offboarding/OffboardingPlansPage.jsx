import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchPlans, createPlan, updatePlan, deletePlan,
  fetchOffboardingStages, createOffboardingStage, updateOffboardingStage, deleteOffboardingStage,
  selectPlans, selectOffboardingStages, selectLoading,
} from './offboardingSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

export default function OffboardingPlansPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const plans = useSelector(selectPlans)
  const stages = useSelector(selectOffboardingStages)

  const [activeTab, setActiveTab] = useState('plans')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })
  const [modalType, setModalType] = useState('')
  const [editing, setEditing] = useState(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchPlans()) }, [dispatch])

  useEffect(() => {
    if (selectedPlanId) dispatch(fetchOffboardingStages(selectedPlanId))
  }, [dispatch, selectedPlanId])

  const openPlanCreate = () => { setModalType('plan'); setEditing(null); reset({}); setModalOpen(true) }
  const openPlanEdit = (row) => { setModalType('plan'); setEditing(row); reset({ title: row.title, description: row.description, isActive: row.isActive }); setModalOpen(true) }

  const handlePlanDelete = (id) => setConfirmModal({ open: true, id, action: 'plan' })

  const openStageCreate = () => {
    if (!selectedPlanId) { toast.error('Select a plan first'); return }
    setModalType('stage'); setEditing(null); reset({}); setModalOpen(true)
  }
  const openStageEdit = (row) => { setModalType('stage'); setEditing(row); reset({ title: row.title, sequence: row.sequence }); setModalOpen(true) }

  const handleStageDelete = (id) => setConfirmModal({ open: true, id, action: 'stage' })
  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'plan') { await dispatch(deletePlan(id)).unwrap(); toast.success('Plan deleted') }
      else if (action === 'stage') { await dispatch(deleteOffboardingStage(id)).unwrap(); toast.success('Stage deleted') }
    } catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null, action: null }) }
  }

  const onSubmit = async (formData) => {
    try {
      if (modalType === 'plan') {
        if (editing) {
          await dispatch(updatePlan({ id: editing.id, data: formData })).unwrap()
          toast.success('Plan updated')
        } else {
          await dispatch(createPlan(formData)).unwrap()
          toast.success('Plan created')
        }
      } else if (modalType === 'stage') {
        if (editing) {
          await dispatch(updateOffboardingStage({ id: editing.id, data: formData })).unwrap()
          toast.success('Stage updated')
        } else {
          await dispatch(createOffboardingStage({ planId: selectedPlanId, data: formData })).unwrap()
          toast.success('Stage created')
        }
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const planColumns = [
    { accessorKey: 'title', header: 'Plan Title' },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => <Badge label={getValue() ? 'Active' : 'Inactive'} variant={getValue() ? 'success' : 'secondary'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openPlanEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handlePlanDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const stageColumns = [
    { accessorKey: 'sequence', header: 'Seq' },
    { accessorKey: 'title', header: 'Stage Title' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openStageEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleStageDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const modalTitle = modalType === 'plan' ? (editing ? 'Edit Plan' : 'New Offboarding Plan') : (editing ? 'Edit Stage' : 'New Stage')

  return (
    <div className="offboarding-workspace">
      <PageHeader title="Offboarding Plans" subtitle="Manage offboarding plan templates and stages" />

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {['plans', 'stages'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'plans' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openPlanCreate}>+ New Plan</Button>
          </div>
          <DataTable columns={planColumns} data={plans} loading={loading} />
        </div>
      )}

      {activeTab === 'stages' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedPlanId}
              onChange={e => setSelectedPlanId(e.target.value)}
            >
              <option value="">Select Plan</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <Button onClick={openStageCreate}>+ New Stage</Button>
          </div>
          {selectedPlanId ? (
            <DataTable columns={stageColumns} data={stages} loading={loading} />
          ) : (
            <p className="text-gray-400 text-sm">Select a plan to view its stages.</p>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmDelete}
        title={confirmModal.action === 'plan' ? 'Delete Plan' : 'Delete Stage'}
        message={confirmModal.action === 'plan' ? 'Are you sure you want to delete this offboarding plan?' : 'Are you sure you want to delete this stage?'}
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} panelClassName="offboarding-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Save'}</Button>
          </div>
        }>
        <div className="space-y-4">
          {modalType === 'plan' && (
            <>
              <Input label="Plan Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} {...register('description')} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" {...register('isActive')} className="rounded" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
            </>
          )}
          {modalType === 'stage' && (
            <>
              <Input label="Stage Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
              <Input label="Sequence" type="number" error={errors.sequence?.message} {...register('sequence', { required: 'Required', valueAsNumber: true })} />
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
