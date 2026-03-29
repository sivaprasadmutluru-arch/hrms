import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchFilingStatuses, createFilingStatus, updateFilingStatus, deleteFilingStatus,
  fetchTaxBrackets, createTaxBracket, updateTaxBracket, deleteTaxBracket,
  selectFilingStatuses, selectTaxBrackets, selectLoading
} from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'

const BASED_ON_OPTIONS = [
  { value: 'BASIC_PAY', label: 'Basic Pay' },
  { value: 'GROSS_PAY', label: 'Gross Pay' },
  { value: 'TAXABLE_GROSS_PAY', label: 'Taxable Gross Pay' },
]

export default function TaxSettingsPage() {
  const dispatch = useDispatch()
  const filingStatuses = useSelector(selectFilingStatuses)
  const taxBrackets = useSelector(selectTaxBrackets)
  const loading = useSelector(selectLoading)

  const [fsModalOpen, setFsModalOpen] = useState(false)
  const [editingFs, setEditingFs] = useState(null)
  const [selectedFs, setSelectedFs] = useState(null)
  const [bracketModalOpen, setBracketModalOpen] = useState(false)
  const [editingBracket, setEditingBracket] = useState(null)

  const fsForm = useForm()
  const bracketForm = useForm()

  const usePy = fsForm.watch('usePy')

  useEffect(() => { dispatch(fetchFilingStatuses()) }, [dispatch])

  useEffect(() => {
    if (selectedFs) dispatch(fetchTaxBrackets(selectedFs.id))
  }, [dispatch, selectedFs])

  const openCreateFs = () => { setEditingFs(null); fsForm.reset({}); setFsModalOpen(true) }
  const openEditFs = (fs) => {
    setEditingFs(fs)
    fsForm.reset({
      filingStatus: fs.filingStatus,
      basedOn: fs.basedOn,
      description: fs.description,
      usePy: fs.usePy,
      pythonCode: fs.pythonCode,
    })
    setFsModalOpen(true)
  }

  const onSubmitFs = async (data) => {
    try {
      if (editingFs) {
        await dispatch(updateFilingStatus({ id: editingFs.id, data })).unwrap()
        toast.success('Filing status updated')
      } else {
        await dispatch(createFilingStatus(data)).unwrap()
        toast.success('Filing status created')
      }
      setFsModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteFs = async (id) => {
    if (!window.confirm('Delete this filing status?')) return
    try { await dispatch(deleteFilingStatus(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const openCreateBracket = () => { setEditingBracket(null); bracketForm.reset({}); setBracketModalOpen(true) }
  const openEditBracket = (b) => {
    setEditingBracket(b)
    bracketForm.reset({ minIncome: b.minIncome, maxIncome: b.maxIncome, taxRate: b.taxRate })
    setBracketModalOpen(true)
  }

  const onSubmitBracket = async (data) => {
    try {
      const payload = { ...data, filingStatus: { id: selectedFs.id } }
      if (editingBracket) {
        await dispatch(updateTaxBracket({ id: editingBracket.id, data: { ...data, filingStatus: { id: selectedFs.id } } })).unwrap()
        toast.success('Tax bracket updated')
      } else {
        await dispatch(createTaxBracket(payload)).unwrap()
        toast.success('Tax bracket created')
      }
      setBracketModalOpen(false)
      dispatch(fetchTaxBrackets(selectedFs.id))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteBracket = async (id) => {
    if (!window.confirm('Delete this tax bracket?')) return
    try {
      await dispatch(deleteTaxBracket(id)).unwrap()
      toast.success('Deleted')
      dispatch(fetchTaxBrackets(selectedFs.id))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const fsColumns = [
    { accessorKey: 'filingStatus', header: 'Name' },
    { accessorKey: 'basedOn', header: 'Based On' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'usePy', header: 'Python', cell: ({ getValue }) => getValue() ? <span className="text-xs bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 font-medium">Enabled</span> : '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => { setSelectedFs(row.original); openEditFs(row.original) }}>Edit</Button>
        <Button size="sm" variant="secondary" onClick={() => setSelectedFs(row.original)}>View Brackets</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteFs(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const bracketColumns = [
    { accessorKey: 'minIncome', header: 'Min Income' },
    { accessorKey: 'maxIncome', header: 'Max Income', cell: ({ getValue }) => getValue() ?? '∞' },
    { accessorKey: 'taxRate', header: 'Tax Rate (%)', cell: ({ getValue }) => `${getValue()}%` },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditBracket(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteBracket(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Tax Settings" subtitle="Filing statuses and tax brackets"
        actions={<Button onClick={openCreateFs}>+ Add Filing Status</Button>} />
      <DataTable columns={fsColumns} data={filingStatuses} loading={loading} />

      {selectedFs && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Tax Brackets — {selectedFs.filingStatus}
            </h3>
            <Button onClick={openCreateBracket}>+ Add Bracket</Button>
          </div>
          <DataTable columns={bracketColumns} data={taxBrackets} loading={loading} />
        </div>
      )}

      <Modal open={fsModalOpen} onClose={() => setFsModalOpen(false)} title={editingFs ? 'Edit Filing Status' : 'Add Filing Status'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFsModalOpen(false)}>Cancel</Button>
            <Button onClick={fsForm.handleSubmit(onSubmitFs)}>{editingFs ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Name" error={fsForm.formState.errors.filingStatus?.message}
            {...fsForm.register('filingStatus', { required: 'Required' })} />
          <Select label="Based On" options={BASED_ON_OPTIONS}
            {...fsForm.register('basedOn')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2} {...fsForm.register('description')} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="usePy" {...fsForm.register('usePy')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="usePy" className="text-sm text-gray-700">Enable Python Code for custom tax calculation</label>
          </div>
          {usePy && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Python Code</label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                rows={8}
                placeholder="# Write your custom tax calculation here&#10;# Available variables: basic_pay, gross_pay, taxable_gross_pay&#10;# Must assign result to: tax_amount"
                {...fsForm.register('pythonCode')}
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal open={bracketModalOpen} onClose={() => setBracketModalOpen(false)} title={editingBracket ? 'Edit Tax Bracket' : 'Add Tax Bracket'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBracketModalOpen(false)}>Cancel</Button>
            <Button onClick={bracketForm.handleSubmit(onSubmitBracket)}>{editingBracket ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Min Income" type="number" step="0.01"
            error={bracketForm.formState.errors.minIncome?.message}
            {...bracketForm.register('minIncome', { required: 'Required' })} />
          <Input label="Max Income (leave blank for unlimited)" type="number" step="0.01"
            {...bracketForm.register('maxIncome')} />
          <Input label="Tax Rate (%)" type="number" step="0.01"
            error={bracketForm.formState.errors.taxRate?.message}
            {...bracketForm.register('taxRate', { required: 'Required' })} />
        </div>
      </Modal>
    </div>
  )
}
