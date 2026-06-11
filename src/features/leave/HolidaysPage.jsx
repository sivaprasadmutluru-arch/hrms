import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchHolidays, createHoliday, updateHoliday, deleteHoliday, exportHolidays, importHolidays,
  fetchHolidayAllocations, createHolidayAllocation, deleteHolidayAllocation,
} from './leaveSlice'
import { fetchAll as fetchEmployees } from '../employees/employeesSlice'
import { fetchAll as fetchDepartments } from '../departments/departmentsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

const TABS = ['Holidays', 'Allocations']

export default function HolidaysPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId

  const holidays = useSelector(s => s.leave.holidays)
  const allocations = useSelector(s => s.leave.holidayAllocations)
  const employees = useSelector(s => s.employees.data || s.employees.content || [])
  const departments = useSelector(s => s.departments.data || s.departments.content || [])

  const [tab, setTab] = useState('Holidays')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, type: '' })
  const [allocModal, setAllocModal] = useState(false)
  const [allocType, setAllocType] = useState('employee')
  const importRef = useRef()

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regAlloc, handleSubmit: handleAllocSubmit, reset: resetAlloc, formState: { errors: allocErrors } } = useForm()

  useEffect(() => {
    if (!companyId) return
    dispatch(fetchHolidays({ companyId }))
    dispatch(fetchHolidayAllocations({ companyId }))
    dispatch(fetchEmployees({ companyId, size: 500 }))
    dispatch(fetchDepartments({ companyId }))
  }, [dispatch, companyId])

  // ─── Holidays tab ──────────────────────────────────────────────────────────

  const handleExport = () => dispatch(exportHolidays(companyId))
  const handleImport = async (file) => {
    const res = await dispatch(importHolidays({ companyId, file }))
    if (res.error) { toast.error(res.payload); return }
    const { imported = 0, errors: errs = [] } = res.payload || {}
    toast.success(`Imported ${imported} holidays${errs.length ? `, ${errs.length} errors` : ''}`)
    dispatch(fetchHolidays({ companyId }))
  }

  const openCreate = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = (h) => { setEditing(h); reset({ name: h.name, startDate: h.startDate, endDate: h.endDate, recurring: h.recurring }); setModal(true) }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateHoliday({ id: editing.id, data })).unwrap()
        toast.success('Holiday updated')
      } else {
        await dispatch(createHoliday({ data, companyId })).unwrap()
        toast.success('Holiday created')
      }
      setModal(false)
      dispatch(fetchHolidays({ companyId }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDeleteHoliday = (id) => setConfirmModal({ open: true, id, type: 'holiday' })

  const holidayColumns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'startDate', header: 'Start Date' },
    { accessorKey: 'endDate', header: 'End Date' },
    { id: 'recurring', header: 'Recurring', cell: ({ row }) => row.original.recurring ? 'Yes' : 'No' },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteHoliday(row.original.id)}>Delete</Button>
        </div>
      )
    },
  ]

  // ─── Allocations tab ───────────────────────────────────────────────────────

  const [selectAll, setSelectAll] = useState(false)

  const openAllocModal = () => { resetAlloc({}); setAllocType('employee'); setSelectAll(false); setAllocModal(true) }

  const onAllocSubmit = async (data) => {
    const payload = { holidayId: data.holidayId }
    if (allocType === 'all') {
      payload.allEmployees = true
    } else if (allocType === 'department') {
      payload.departmentId = data.departmentId
    } else {
      const ids = Array.isArray(data.employeeIds) ? data.employeeIds : [data.employeeIds]
      payload.employeeIds = ids.filter(Boolean).map(Number)
      if (!payload.employeeIds.length) { toast.error('Select at least one employee'); return }
    }
    try {
      const res = await dispatch(createHolidayAllocation({ data: payload, companyId })).unwrap()
      toast.success(`Allocated: ${res.created} new${res.skipped ? `, ${res.skipped} already existed` : ''}`)
      setAllocModal(false)
      dispatch(fetchHolidayAllocations({ companyId }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDeleteAlloc = (id) => setConfirmModal({ open: true, id, type: 'allocation' })

  const allocColumns = [
    { accessorKey: 'holidayName', header: 'Holiday' },
    { accessorKey: 'startDate', header: 'Start Date' },
    { accessorKey: 'endDate', header: 'End Date' },
    {
      id: 'allocatedTo', header: 'Allocated To',
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === 'department' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {r.type === 'department' ? 'Dept' : 'Employee'}
            </span>
            {r.targetName}
          </span>
        )
      },
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => (
        <Button size="sm" variant="danger" onClick={() => handleDeleteAlloc(row.original.id)}>Remove</Button>
      ),
    },
  ]

  // ─── Confirm delete handler ────────────────────────────────────────────────

  const onConfirmDelete = async () => {
    try {
      if (confirmModal.type === 'holiday') {
        await dispatch(deleteHoliday(confirmModal.id)).unwrap()
        toast.success('Holiday deleted')
      } else {
        await dispatch(deleteHolidayAllocation(confirmModal.id)).unwrap()
        toast.success('Allocation removed')
      }
    } catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null, type: '' }) }
  }

  // ─── Header actions per tab ────────────────────────────────────────────────

  const headerActions = tab === 'Holidays' ? (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handleExport}>Export</Button>
      <Button variant="secondary" onClick={() => importRef.current?.click()}>Import</Button>
      <input ref={importRef} type="file" accept=".xlsx" className="hidden"
        onChange={e => { const f = e.target.files[0]; if (f) handleImport(f); e.target.value = '' }} />
      <Button onClick={openCreate}>Add Holiday</Button>
    </div>
  ) : (
    <Button onClick={openAllocModal}>Add Allocation</Button>
  )

  return (
    <div>
      <PageHeader title="Holidays" subtitle="Manage company holidays and allocations" actions={headerActions} />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'Allocations' && allocations.length > 0 && (
              <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">{allocations.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Holidays tab */}
      {tab === 'Holidays' && <DataTable columns={holidayColumns} data={holidays} />}

      {/* Allocations tab */}
      {tab === 'Allocations' && <DataTable columns={allocColumns} data={allocations} />}

      {/* Holiday create/edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Holiday' : 'New Holiday'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
          <Input label="Start Date" type="date" {...register('startDate')} />
          <Input label="End Date" type="date" {...register('endDate')} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('recurring')} /> Recurring
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Allocation modal */}
      <Modal open={allocModal} onClose={() => setAllocModal(false)} title="New Holiday Allocation">
        <form onSubmit={handleAllocSubmit(onAllocSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holiday</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              {...regAlloc('holidayId', { required: 'Required' })}>
              <option value="">Select holiday</option>
              {holidays.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.startDate})</option>
              ))}
            </select>
            {allocErrors.holidayId && <p className="text-red-500 text-xs mt-1">{allocErrors.holidayId.message}</p>}
          </div>

          <div className="flex gap-2">
            {[
              { key: 'employee',   label: 'By Employee' },
              { key: 'department', label: 'By Department' },
              { key: 'all',        label: 'All Employees' },
            ].map(({ key, label }) => (
              <button key={key} type="button" onClick={() => { setAllocType(key); setSelectAll(false) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${allocType === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {allocType === 'all' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              This will allocate the selected holiday to <strong>all {employees.length} active employees</strong> in the company.
            </div>
          )}

          {allocType === 'employee' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Employees <span className="text-gray-400 font-normal">(hold Ctrl/Cmd for multiple)</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm text-indigo-600 cursor-pointer select-none">
                  <input type="checkbox" checked={selectAll} onChange={e => {
                    setSelectAll(e.target.checked)
                    // programmatically select all options via the hidden select ref
                  }} />
                  Select All
                </label>
              </div>
              <select multiple size={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                {...regAlloc('employeeIds')}
                ref={el => {
                  regAlloc('employeeIds').ref(el)
                  if (el) {
                    for (const opt of el.options) opt.selected = selectAll
                  }
                }}>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName || ''}{e.badgeId ? ` (${e.badgeId})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {allocType === 'department' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                {...regAlloc('departmentId', { required: 'Required' })}>
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {allocErrors.departmentId && <p className="text-red-500 text-xs mt-1">{allocErrors.departmentId.message}</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAllocModal(false)}>Cancel</Button>
            <Button type="submit">Allocate</Button>
          </div>
        </form>
      </Modal>

      {/* Shared confirm delete */}
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, type: '' })}
        onConfirm={onConfirmDelete}
        title={confirmModal.type === 'holiday' ? 'Delete Holiday' : 'Remove Allocation'}
        message={confirmModal.type === 'holiday'
          ? 'Are you sure you want to delete this holiday? This cannot be undone.'
          : 'Remove this allocation? The employee/department will no longer have this holiday excluded.'}
        confirmLabel={confirmModal.type === 'holiday' ? 'Delete' : 'Remove'}
      />
    </div>
  )
}
