import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchPortals, createPortal, updatePortal, deletePortal,
  fetchStages, createStage, updateStage, deleteStage,
  fetchOnboardingCandidates, addOnboardingCandidate, completeOnboarding,
  fetchCandidateStages, addCandidateStage, completeCandidateStage,
  fetchCandidateTasks, assignCandidateTask, completeCandidateTask,
  selectPortals, selectStages, selectOnboardingCandidates,
  selectCandidateStages, selectCandidateTasks, selectLoading,
} from './onboardingSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { formatDate } from '../../utils/formatters'

const TABS = ['Portals', 'Stages', 'Candidates', 'Tasks']

export default function OnboardingPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const portals = useSelector(selectPortals)
  const stages = useSelector(selectStages)
  const onboardingCandidates = useSelector(selectOnboardingCandidates)
  const candidateStages = useSelector(selectCandidateStages)
  const candidateTasks = useSelector(selectCandidateTasks)

  const [activeTab, setActiveTab] = useState('Portals')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [modalType, setModalType] = useState('')

  // filters for child entities
  const [selectedPortalId, setSelectedPortalId] = useState('')
  const [selectedCandidateId, setSelectedCandidateId] = useState('')

  // detail modal for candidate stages/tasks
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailCandidate, setDetailCandidate] = useState(null)
  const [detailTab, setDetailTab] = useState('stages')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchPortals()) }, [dispatch])

  useEffect(() => {
    if (selectedPortalId) {
      dispatch(fetchStages(selectedPortalId))
      dispatch(fetchOnboardingCandidates(selectedPortalId))
    }
  }, [dispatch, selectedPortalId])

  useEffect(() => {
    if (detailCandidate) {
      dispatch(fetchCandidateStages(detailCandidate.id))
      dispatch(fetchCandidateTasks(detailCandidate.id))
    }
  }, [dispatch, detailCandidate])

  // ── Portal helpers ────────────────────────────────────────────────────────

  const openPortalCreate = () => { setModalType('portal'); setEditing(null); reset({}); setModalOpen(true) }
  const openPortalEdit = (row) => { setModalType('portal'); setEditing(row); reset({ title: row.title, isActive: row.isActive, expiresAt: row.expiresAt?.split('T')[0] }); setModalOpen(true) }

  const handlePortalDelete = async (id) => {
    if (!window.confirm('Delete this portal?')) return
    try { await dispatch(deletePortal(id)).unwrap(); toast.success('Portal deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  // ── Stage helpers ─────────────────────────────────────────────────────────

  const openStageCreate = () => {
    if (!selectedPortalId) { toast.error('Select a portal first'); return }
    setModalType('stage'); setEditing(null); reset({}); setModalOpen(true)
  }
  const openStageEdit = (row) => { setModalType('stage'); setEditing(row); reset({ title: row.title, sequence: row.sequence }); setModalOpen(true) }

  const handleStageDelete = async (id) => {
    if (!window.confirm('Delete this stage?')) return
    try { await dispatch(deleteStage(id)).unwrap(); toast.success('Stage deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  // ── Candidate helpers ─────────────────────────────────────────────────────

  const openCandidateAdd = () => {
    if (!selectedPortalId) { toast.error('Select a portal first'); return }
    setModalType('candidate'); setEditing(null); reset({}); setModalOpen(true)
  }

  const handleCompleteOnboarding = async (id) => {
    try { await dispatch(completeOnboarding(id)).unwrap(); toast.success('Onboarding completed') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const openCandidateDetail = (row) => {
    setDetailCandidate(row)
    setDetailTab('stages')
    setDetailOpen(true)
  }

  // ── Task helpers (inside detail modal) ───────────────────────────────────

  const handleCompleteCandidateStage = async (id) => {
    try { await dispatch(completeCandidateStage(id)).unwrap(); toast.success('Stage completed') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleCompleteCandidateTask = async (id) => {
    try { await dispatch(completeCandidateTask(id)).unwrap(); toast.success('Task completed') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const openAssignTask = () => {
    if (!detailCandidate) return
    setModalType('task'); setEditing(null); reset({}); setModalOpen(true)
  }

  const openAddCandidateStage = () => {
    if (!detailCandidate) return
    setModalType('candidateStage'); setEditing(null); reset({}); setModalOpen(true)
  }

  // ── Unified submit ────────────────────────────────────────────────────────

  const onSubmit = async (formData) => {
    try {
      if (modalType === 'portal') {
        if (editing) {
          await dispatch(updatePortal({ id: editing.id, data: formData })).unwrap()
          toast.success('Portal updated')
        } else {
          await dispatch(createPortal(formData)).unwrap()
          toast.success('Portal created')
        }
      } else if (modalType === 'stage') {
        if (editing) {
          await dispatch(updateStage({ id: editing.id, data: formData })).unwrap()
          toast.success('Stage updated')
        } else {
          await dispatch(createStage({ portalId: selectedPortalId, data: formData })).unwrap()
          toast.success('Stage created')
        }
      } else if (modalType === 'candidate') {
        await dispatch(addOnboardingCandidate({ portalId: selectedPortalId, data: formData })).unwrap()
        toast.success('Candidate added')
      } else if (modalType === 'task') {
        await dispatch(assignCandidateTask({ candidateId: detailCandidate.id, data: formData })).unwrap()
        toast.success('Task assigned')
      } else if (modalType === 'candidateStage') {
        await dispatch(addCandidateStage({ candidateId: detailCandidate.id, data: formData })).unwrap()
        toast.success('Stage added')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  // ── Column definitions ────────────────────────────────────────────────────

  const portalColumns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => <Badge label={getValue() ? 'Active' : 'Inactive'} variant={getValue() ? 'success' : 'secondary'} /> },
    { accessorKey: 'expiresAt', header: 'Expires', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openPortalEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handlePortalDelete(row.original.id)}>Delete</Button>
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

  const candidateColumns = [
    { accessorKey: 'candidate.firstName', header: 'First Name' },
    { accessorKey: 'candidate.lastName', header: 'Last Name' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'IN_PROGRESS'} variant={getValue() === 'COMPLETED' ? 'success' : getValue() === 'CANCELLED' ? 'danger' : 'warning'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openCandidateDetail(row.original)}>Details</Button>
        {row.original.status !== 'COMPLETED' && (
          <Button size="sm" variant="success" onClick={() => handleCompleteOnboarding(row.original.id)}>Complete</Button>
        )}
      </div>
    )},
  ]

  const candidateStageColumns = [
    { accessorKey: 'stage.title', header: 'Stage' },
    { accessorKey: 'isCompleted', header: 'Completed', cell: ({ getValue }) => <Badge label={getValue() ? 'Done' : 'Pending'} variant={getValue() ? 'success' : 'warning'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      !row.original.isCompleted && <Button size="sm" variant="success" onClick={() => handleCompleteCandidateStage(row.original.id)}>Mark Done</Button>
    )},
  ]

  const candidateTaskColumns = [
    { accessorKey: 'title', header: 'Task' },
    { accessorKey: 'stage.title', header: 'Stage' },
    { accessorKey: 'dueDate', header: 'Due', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'isCompleted', header: 'Completed', cell: ({ getValue }) => <Badge label={getValue() ? 'Done' : 'Pending'} variant={getValue() ? 'success' : 'warning'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      !row.original.isCompleted && <Button size="sm" variant="success" onClick={() => handleCompleteCandidateTask(row.original.id)}>Mark Done</Button>
    )},
  ]

  // ── Modal title/form per type ─────────────────────────────────────────────

  const modalTitle = {
    portal: editing ? 'Edit Portal' : 'New Onboarding Portal',
    stage: editing ? 'Edit Stage' : 'New Stage',
    candidate: 'Add Candidate to Portal',
    task: 'Assign Task to Candidate',
    candidateStage: 'Add Stage Progress',
  }[modalType] || ''

  return (
    <div>
      <PageHeader title="Onboarding" subtitle="Manage onboarding portals, stages, and candidate progress" />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Portals Tab */}
      {activeTab === 'Portals' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openPortalCreate}>+ New Portal</Button>
          </div>
          <DataTable columns={portalColumns} data={portals} loading={loading} />
        </div>
      )}

      {/* Stages Tab */}
      {activeTab === 'Stages' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedPortalId}
              onChange={e => setSelectedPortalId(e.target.value)}
            >
              <option value="">Select Portal</option>
              {portals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <Button onClick={openStageCreate}>+ New Stage</Button>
          </div>
          {selectedPortalId ? (
            <DataTable columns={stageColumns} data={stages} loading={loading} />
          ) : (
            <p className="text-gray-400 text-sm">Select a portal to view its stages.</p>
          )}
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'Candidates' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedPortalId}
              onChange={e => setSelectedPortalId(e.target.value)}
            >
              <option value="">Select Portal</option>
              {portals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <Button onClick={openCandidateAdd}>+ Add Candidate</Button>
          </div>
          {selectedPortalId ? (
            <DataTable columns={candidateColumns} data={onboardingCandidates} loading={loading} />
          ) : (
            <p className="text-gray-400 text-sm">Select a portal to view its candidates.</p>
          )}
        </div>
      )}

      {/* Tasks Tab — per-candidate view */}
      {activeTab === 'Tasks' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedPortalId}
              onChange={e => { setSelectedPortalId(e.target.value); setSelectedCandidateId('') }}
            >
              <option value="">Select Portal</option>
              {portals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            {selectedPortalId && (
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedCandidateId}
                onChange={e => {
                  setSelectedCandidateId(e.target.value)
                  if (e.target.value) dispatch(fetchCandidateTasks(e.target.value))
                }}
              >
                <option value="">Select Candidate</option>
                {onboardingCandidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.candidate?.firstName} {c.candidate?.lastName}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedCandidateId ? (
            <DataTable columns={candidateTaskColumns} data={candidateTasks} loading={loading} />
          ) : (
            <p className="text-gray-400 text-sm">Select a portal and candidate to view tasks.</p>
          )}
        </div>
      )}

      {/* Candidate detail modal (stages + tasks) */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
        title={`Candidate: ${detailCandidate?.candidate?.firstName || ''} ${detailCandidate?.candidate?.lastName || ''}`}
        footer={<Button variant="secondary" onClick={() => setDetailOpen(false)}>Close</Button>}>
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-4 border-b border-gray-200 mb-2">
            {['stages', 'tasks'].map(t => (
              <button key={t} onClick={() => setDetailTab(t)}
                className={`pb-2 px-1 text-sm font-medium border-b-2 capitalize transition-colors ${detailTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                {t}
              </button>
            ))}
          </div>

          {detailTab === 'stages' && (
            <div>
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={openAddCandidateStage}>+ Add Stage</Button>
              </div>
              <DataTable columns={candidateStageColumns} data={candidateStages} loading={loading} />
            </div>
          )}

          {detailTab === 'tasks' && (
            <div>
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={openAssignTask}>+ Assign Task</Button>
              </div>
              <DataTable columns={candidateTaskColumns} data={candidateTasks} loading={loading} />
            </div>
          )}
        </div>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Save'}</Button>
          </div>
        }>
        <div className="space-y-4">
          {/* Portal form */}
          {modalType === 'portal' && (
            <>
              <Input label="Portal Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
              <Input label="Expires At" type="date" {...register('expiresAt')} />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" {...register('isActive')} className="rounded" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
            </>
          )}

          {/* Stage form */}
          {modalType === 'stage' && (
            <>
              <Input label="Stage Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
              <Input label="Sequence" type="number" error={errors.sequence?.message} {...register('sequence', { required: 'Required', valueAsNumber: true })} />
            </>
          )}

          {/* Add candidate form */}
          {modalType === 'candidate' && (
            <Input label="Candidate ID" error={errors.candidate?.message}
              {...register('candidate.id', { required: 'Required', valueAsNumber: true })} />
          )}

          {/* Assign task form */}
          {modalType === 'task' && (
            <>
              <Input label="Task Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} {...register('description')} />
              </div>
              <Input label="Due Date" type="date" {...register('dueDate')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage (optional)</label>
                <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('stage.id', { valueAsNumber: true })}>
                  <option value="">No stage</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Add candidate stage form */}
          {modalType === 'candidateStage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('stage.id', { required: true, valueAsNumber: true })}>
                <option value="">Select Stage</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
