import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Mail, MailPlus, FileText, Layers3, Pencil, Trash2, Sparkles, Type, ShieldCheck, Send } from 'lucide-react'
import {
  fetchMailTemplates, createMailTemplate, updateMailTemplate, deleteMailTemplate,
  selectMailTemplates, selectBaseExtrasLoading,
} from '../base/baseExtrasSlice'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

const TEMPLATE_TYPES = ['LEAVE_APPROVAL', 'LEAVE_REJECTION', 'ATTENDANCE_REMINDER', 'PAYSLIP', 'ONBOARDING', 'OFFBOARDING', 'GENERAL']

export default function EmailTemplatesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const templates = useSelector(selectMailTemplates)
  const loading = useSelector(selectBaseExtrasLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const typeCount = new Set(templates.map(template => template.templateType).filter(Boolean)).size

  useEffect(() => { dispatch(fetchMailTemplates()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({ title: row.title, subject: row.subject, body: row.body, templateType: row.templateType })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateMailTemplate({ id: editing.id, data })).unwrap()
        toast.success('Template updated')
      } else {
        await dispatch(createMailTemplate({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Template created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteMailTemplate(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Error') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const columns = [
    { accessorKey: 'title', header: 'Template', cell: ({ row }) => (
      <span className="flex items-center gap-3 py-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#3479BC]"><Mail className="h-4 w-4" /></span>
        <span className="font-semibold text-[#294762]">{row.original.title || 'Untitled template'}</span>
      </span>
    )},
    { accessorKey: 'subject', header: 'Email subject', cell: ({ getValue }) => <span className="block max-w-[420px] truncate text-[#5E748B]">{getValue() || '—'}</span> },
    { accessorKey: 'templateType', header: 'Category', cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDEAF6] bg-[#F3F8FE] px-2.5 py-1 text-[11px] font-semibold text-[#456783]">
        <Layers3 className="h-3.5 w-3.5 text-[#4386C5]" />{(getValue() || 'GENERAL').replace(/_/g, ' ')}
      </span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" className="!rounded-xl !border-[#DCE8F4] !text-[#37658E] hover:!bg-[#F3F8FE]" onClick={() => openEdit(row.original)}><span className="inline-flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" />Edit</span></Button>
        <Button size="sm" variant="danger" className="!rounded-xl" onClick={() => handleDelete(row.original.id)}><span className="inline-flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />Delete</span></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6 pb-8">
      <section className="relative isolate overflow-hidden rounded-[26px] border border-[#D8E8F7] bg-gradient-to-br from-white via-[#F2F8FF] to-[#FFF8E1] p-6 shadow-[0_14px_34px_rgba(43,91,139,0.08)] sm:p-8">
        <div aria-hidden="true" className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-[#D9EBFF]/70 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 right-1/3 -z-10 h-48 w-48 rounded-full bg-[#FFE9A8]/55 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2F73B7] to-[#5AA3E6] text-white shadow-lg shadow-blue-900/15 ring-4 ring-white/70"><Mail className="h-6 w-6" /></span>
            <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#B18A2B]">Company workspace</p><h1 className="text-2xl font-bold tracking-tight text-[#173858] sm:text-[28px]">Email templates</h1><p className="mt-1 max-w-2xl text-sm text-[#647B95]">Keep company notifications clear, consistent and on brand.</p></div>
          </div>
          <Button onClick={openCreate} className="!rounded-xl !bg-[#2F73B7] !px-5 !py-2.5 !shadow-md !shadow-blue-900/15 hover:!bg-[#245F9B]"><span className="inline-flex items-center gap-2"><MailPlus className="h-4 w-4" />New template</span></Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-[#DCE8F4] bg-white p-5 shadow-[0_8px_22px_rgba(39,87,138,0.055)]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#3479BC]"><Mail className="h-5 w-5" /></span><div><p className="text-xs font-medium text-[#7A8EA3]">Saved templates</p><p className="mt-1 text-2xl font-bold leading-none text-[#173858]">{loading ? '—' : templates.length}</p></div></div>
        <div className="flex items-center gap-4 rounded-2xl border border-[#E9E5D5] bg-gradient-to-r from-white to-[#FFF9E5] p-5 shadow-[0_8px_22px_rgba(39,87,138,0.045)]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3D1] text-[#A87B17]"><Layers3 className="h-5 w-5" /></span><div><p className="text-xs font-medium text-[#7A8EA3]">Notification categories in use</p><p className="mt-1 text-2xl font-bold leading-none text-[#173858]">{loading ? '—' : typeCount}</p></div></div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DCE8F4] bg-white p-4 shadow-[0_10px_26px_rgba(39,87,138,0.06)] sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F7FD] text-[#4386C5]"><FileText className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-[#294762]">Template library</h2><p className="mt-0.5 text-xs text-[#8294A7]">Edit the subject and message used by each notification.</p></div></div>
        <DataTable columns={columns} data={templates} loading={loading} />
      </section>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Email Template"
        message="Are you sure you want to delete this email template? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit email template' : 'Create an email template'} size="xl"
        footer={<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#8294A7]">You can edit this template at any time.</p><div className="flex justify-end gap-2"><Button variant="secondary" className="!rounded-xl !border-[#D7E3EF]" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="!rounded-xl !bg-[#2F73B7] hover:!bg-[#245F9B]" onClick={handleSubmit(onSubmit)}><span className="inline-flex items-center gap-2">{editing ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}{editing ? 'Save changes' : 'Create template'}</span></Button></div></div>}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Template name" placeholder="e.g. Leave request approved" error={errors.title?.message} {...register('title', { required: 'Enter a template name' })} />
              <Input label="Email subject" placeholder="e.g. Your leave request is approved" error={errors.subject?.message} {...register('subject', { required: 'Enter an email subject' })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#38536E]">Notification category</label>
              <select className="block w-full rounded-xl border border-[#D7E3EF] bg-[#FBFDFF] px-3.5 py-2.5 text-sm text-[#304D69] shadow-sm focus:border-[#438DD1] focus:outline-none focus:ring-2 focus:ring-[#438DD1]/15" {...register('templateType')}>
                {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[#38536E]"><Type className="h-4 w-4 text-[#4386C5]" />Email body</label>
              <textarea placeholder="Write the message your employees will receive…" className="block min-h-52 w-full resize-y rounded-xl border border-[#D7E3EF] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#304D69] shadow-sm placeholder:text-[#9AAABC] focus:border-[#438DD1] focus:outline-none focus:ring-2 focus:ring-[#438DD1]/15" {...register('body')} />
              <p className="mt-1.5 text-xs text-[#8798AA]">Write a clear message with the important details near the top.</p>
            </div>
          </div>
          <aside className="rounded-2xl border border-[#DDE9F5] bg-gradient-to-br from-[#F2F8FF] via-white to-[#FFF8E3] p-4">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#3479BC] shadow-sm ring-1 ring-[#DCE8F4]"><Sparkles className="h-4 w-4" /></span>
            <h3 className="text-sm font-bold text-[#294762]">A clear template</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#758BA0]">Make notifications easy to scan and understand.</p>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-[#637B93]">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D6AB38]" />Use a subject that explains the update.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4386C5]" />Keep the message concise and specific.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D6AB38]" />Choose the category that matches its purpose.</li>
            </ul>
            <div className="mt-5 flex items-center gap-2 border-t border-[#DDE9F5] pt-3 text-[11px] font-medium text-[#71869C]"><ShieldCheck className="h-4 w-4 text-[#4386C5]" />Only authorized admins can edit templates.</div>
          </aside>
        </div>
      </Modal>
    </div>
  )
}
