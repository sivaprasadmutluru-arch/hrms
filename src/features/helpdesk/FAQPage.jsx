import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchFAQCategories, createFAQCategory, fetchFAQs, createFAQ, deleteFAQ,
  selectFAQCategories, selectFAQs, selectLoading
} from './helpdeskSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import useAuth from '../../hooks/useAuth'

export default function FAQPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const faqCategories = useSelector(selectFAQCategories)
  const faqs = useSelector(selectFAQs)
  const loading = useSelector(selectLoading)
  const [tab, setTab] = useState('FAQs')
  const [faqModalOpen, setFaqModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const faqForm = useForm()
  const catForm = useForm()

  useEffect(() => {
    dispatch(fetchFAQCategories())
    dispatch(fetchFAQs())
  }, [dispatch])

  const onSubmitFaq = async (data) => {
    try {
      await dispatch(createFAQ({
        ...data,
        category: data.categoryId ? { id: Number(data.categoryId) } : null,
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('FAQ created')
      setFaqModalOpen(false)
      faqForm.reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const onSubmitCat = async (data) => {
    try {
      await dispatch(createFAQCategory({ ...data, company: { id: user?.companyId } })).unwrap()
      toast.success('Category created')
      setCatModalOpen(false)
      catForm.reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteFaq = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return
    try { await dispatch(deleteFAQ(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const faqColumns = [
    { accessorKey: 'question', header: 'Question' },
    { accessorKey: 'answer', header: 'Answer', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'category', header: 'Category', cell: ({ row }) => row.original.category?.title || '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDeleteFaq(row.original.id)}>Delete</Button>
    )},
  ]

  const catColumns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => getValue() || '—' },
  ]

  return (
    <div>
      <PageHeader title="FAQ" subtitle="Frequently asked questions"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { catForm.reset(); setCatModalOpen(true) }}>+ Category</Button>
            <Button onClick={() => { faqForm.reset(); setFaqModalOpen(true) }}>+ FAQ</Button>
          </div>
        } />
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {['FAQs', 'Categories'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'FAQs' && <DataTable columns={faqColumns} data={faqs} loading={loading} />}
      {tab === 'Categories' && <DataTable columns={catColumns} data={faqCategories} loading={loading} />}

      <Modal open={faqModalOpen} onClose={() => setFaqModalOpen(false)} title="Add FAQ"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFaqModalOpen(false)}>Cancel</Button>
            <Button onClick={faqForm.handleSubmit(onSubmitFaq)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Question" error={faqForm.formState.errors.question?.message}
            {...faqForm.register('question', { required: 'Required' })} />
          <Select label="Category" options={faqCategories.map(c => ({ value: c.id, label: c.title }))}
            {...faqForm.register('categoryId')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4} {...faqForm.register('answer')} />
          </div>
        </div>
      </Modal>

      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Add FAQ Category"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button onClick={catForm.handleSubmit(onSubmitCat)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={catForm.formState.errors.title?.message}
            {...catForm.register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2} {...catForm.register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
