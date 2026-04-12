import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchQuestionTemplates, createQuestionTemplate, updateQuestionTemplate, deleteQuestionTemplate,
  fetchQuestions, addQuestion, deleteQuestion,
  selectQuestionTemplates, selectQuestions, selectLoading,
} from './performanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import ConfirmModal from '../../components/common/ConfirmModal'

const QUESTION_TYPES = ['TEXT', 'MULTIPLE_CHOICE', 'RATING', 'YES_NO']

export default function QuestionTemplatesPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const templates = useSelector(selectQuestionTemplates)
  const questions = useSelector(selectQuestions)

  const [activeTab, setActiveTab] = useState('templates')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })
  const [modalType, setModalType] = useState('')
  const [editing, setEditing] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchQuestionTemplates()) }, [dispatch])

  useEffect(() => {
    if (selectedTemplateId) dispatch(fetchQuestions(selectedTemplateId))
  }, [dispatch, selectedTemplateId])

  const openTemplateCreate = () => { setModalType('template'); setEditing(null); reset({}); setModalOpen(true) }
  const openTemplateEdit = (row) => { setModalType('template'); setEditing(row); reset({ title: row.title, description: row.description }); setModalOpen(true) }

  const handleTemplateDelete = (id) => setConfirmModal({ open: true, id, action: 'template' })
  const handleQuestionDelete = (id) => setConfirmModal({ open: true, id, action: 'question' })
  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'template') { await dispatch(deleteQuestionTemplate(id)).unwrap(); toast.success('Template deleted') }
      else if (action === 'question') { await dispatch(deleteQuestion(id)).unwrap(); toast.success('Question deleted') }
    } catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null, action: null }) }
  }

  const openQuestionAdd = () => {
    if (!selectedTemplateId) { toast.error('Select a template first'); return }
    setModalType('question'); setEditing(null); reset({}); setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      if (modalType === 'template') {
        if (editing) {
          await dispatch(updateQuestionTemplate({ id: editing.id, data: formData })).unwrap()
          toast.success('Template updated')
        } else {
          await dispatch(createQuestionTemplate(formData)).unwrap()
          toast.success('Template created')
        }
      } else if (modalType === 'question') {
        await dispatch(addQuestion({ templateId: selectedTemplateId, data: formData })).unwrap()
        toast.success('Question added')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const templateColumns = [
    { accessorKey: 'title', header: 'Template Title' },
    { accessorKey: 'description', header: 'Description' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openTemplateEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleTemplateDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const questionColumns = [
    { accessorKey: 'sequence', header: 'Seq' },
    { accessorKey: 'questionText', header: 'Question' },
    { accessorKey: 'questionType', header: 'Type', cell: ({ getValue }) => <Badge label={getValue()} variant="info" /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleQuestionDelete(row.original.id)}>Delete</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Question Templates" subtitle="Manage feedback question templates and questions" />

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {['templates', 'questions'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openTemplateCreate}>+ New Template</Button>
          </div>
          <DataTable columns={templateColumns} data={templates} loading={loading} />
        </div>
      )}

      {activeTab === 'questions' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Select Template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <Button onClick={openQuestionAdd}>+ Add Question</Button>
          </div>
          {selectedTemplateId ? (
            <DataTable columns={questionColumns} data={questions} loading={loading} />
          ) : (
            <p className="text-gray-400 text-sm">Select a template to view its questions.</p>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmDelete}
        title={confirmModal.action === 'template' ? 'Delete Template' : 'Delete Question'}
        message={confirmModal.action === 'template' ? 'Are you sure you want to delete this template? This action cannot be undone.' : 'Are you sure you want to delete this question?'}
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={modalType === 'template' ? (editing ? 'Edit Template' : 'New Question Template') : 'Add Question'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Save'}</Button>
          </div>
        }>
        <div className="space-y-4">
          {modalType === 'template' && (
            <>
              <Input label="Template Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} {...register('description')} />
              </div>
            </>
          )}
          {modalType === 'question' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} {...register('questionText', { required: true })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('questionType')}>
                  {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Input label="Sequence" type="number" {...register('sequence', { valueAsNumber: true })} />
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
