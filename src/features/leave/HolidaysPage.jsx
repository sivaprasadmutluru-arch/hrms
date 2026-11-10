import api from '../../services/api'
import { COUNTRIES } from '../../config/countries'
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
  const { user, effectiveCompanyId, isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager } = useAuth()
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const companyId = isPlatformAdmin() ? selectedCompanyId : effectiveCompanyId
  const canManage = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()
  const currentYear = new Date().getFullYear()
  const [holidayYear, setHolidayYear] = useState(currentYear)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarCountry, setCalendarCountry] = useState('')
  const [calendarYear, setCalendarYear] = useState(currentYear)
  const [calendar, setCalendar] = useState(null)
  const [calendarKeys, setCalendarKeys] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const [datesConfirmed, setDatesConfirmed] = useState(false)
  const [calendarSaving, setCalendarSaving] = useState(false)
  const calendarSubmitting = useRef(false)
  useEffect(() => {
    setCalendarCountry(''); setCalendar(null); setCalendarKeys([]); setCalendarOpen(false)
  }, [companyId])
  useEffect(() => {
    if (!calendarOpen || !companyId) return
    const controller = new AbortController()
    setCalendar(null); setCalendarKeys([]); setDatesConfirmed(false); setCalendarError(''); setCalendarLoading(true)
    api.get('/leave/holidays/catalog', { params: { year: calendarYear, ...(calendarCountry ? { country: calendarCountry } : {}) }, headers: { 'X-Company-Id': companyId }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        setCalendar(data)
        setCalendarKeys(data.entries.filter(entry => !entry.reviewDates).map(entry => entry.key))
        if (!calendarCountry && data.country) setCalendarCountry(data.country)
      }).catch(error => { if (!controller.signal.aborted) setCalendarError(error.response?.data?.message || 'Unable to load holiday calendar') })
      .finally(() => { if (!controller.signal.aborted) setCalendarLoading(false) })
    return () => controller.abort()
  }, [calendarOpen, companyId, calendarCountry, calendarYear])
  const previewMatches = calendar && calendar.year === calendarYear && (!calendarCountry || calendar.country === calendarCountry)
  const needsDateConfirmation = calendar?.entries.some(entry => calendarKeys.includes(entry.key) && entry.reviewDates)
  const importCalendar = async () => {
    if (calendarSubmitting.current || !previewMatches || !companyId || !calendarKeys.length || (needsDateConfirmation && !datesConfirmed)) return
    calendarSubmitting.current = true; setCalendarSaving(true)
    try {
      const { data } = await api.post('/leave/holidays/catalog', { country: calendar.country, year: calendarYear, keys: calendarKeys, confirmVariableDates: datesConfirmed }, { headers: { 'X-Company-Id': companyId } })
      toast.success(`Added ${data.added} holidays${data.skipped ? `; ${data.skipped} existing holidays preserved` : ''}`)
      setCalendarOpen(false); setHolidayYear(calendarYear); dispatch(fetchHolidays({ companyId }))
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to add holiday calendar') }
    finally { calendarSubmitting.current = false; setCalendarSaving(false) }
  }

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
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState('')
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

  const openAllocModal = () => { resetAlloc({}); setAllocType('employee'); setSelectAll(false); setSelectedEmployeeIds([]); setEmployeeSearch(''); setAllocModal(true) }

  const onAllocSubmit = async (data) => {
    const payload = { holidayId: data.holidayId }
    if (allocType === 'all') {
      payload.allEmployees = true
    } else if (allocType === 'department') {
      payload.departmentId = data.departmentId
    } else {
      payload.employeeIds = selectedEmployeeIds.map(Number)
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
      {canManage && <Button variant="secondary" disabled={!companyId} onClick={() => { setCalendarYear(holidayYear); setCalendarOpen(true) }}>Country calendar</Button>}
      <Button onClick={openCreate} disabled={!companyId}>Add Holiday</Button>
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
      {tab === 'Holidays' && <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Choose your organization's country calendar or add custom state, local and company holidays.</p>
          <select aria-label="Holiday year" value={holidayYear} onChange={e => setHolidayYear(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            {[...new Set([currentYear, currentYear + 1, currentYear + 2, ...holidays.map(h => Number(h.startDate?.slice(0,4))).filter(Boolean)])].sort((a,b) => a-b).map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        {!companyId && <p className="mb-3 text-sm text-amber-700">Select a company to manage its holidays.</p>}
        <DataTable columns={holidayColumns} data={(companyId ? holidays : []).filter(h => h.recurring || h.startDate?.startsWith(`${holidayYear}-`)).sort((a,b) => (a.startDate || '').localeCompare(b.startDate || ''))} />
      </>}

      {/* Allocations tab */}
      {tab === 'Allocations' && <DataTable columns={allocColumns} data={companyId ? allocations : []} />}

      <Modal open={calendarOpen} onClose={() => { if (!calendarSubmitting.current) setCalendarOpen(false) }} title="Add country holidays" size="xl" busy={calendarSaving}>
        <fieldset disabled={calendarSaving} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Country<select aria-label="Holiday calendar country" value={calendarCountry} onChange={e => setCalendarCountry(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2"><option value="">Select country</option>{COUNTRIES.map(country => <option key={country.value} value={country.value}>{country.label}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Year<select aria-label="Holiday calendar year" value={calendarYear} onChange={e => setCalendarYear(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2">{[currentYear - 1,currentYear,currentYear+1,currentYear+2].filter(year => year >= 2026).map(year => <option key={year}>{year}</option>)}</select></label>
          </div>
          {calendarLoading && <p role="status" className="text-sm text-slate-500">Loading calendar…</p>}
          {calendarError && <p role="alert" className="text-sm text-red-600">{calendarError}</p>}
          {calendar && <>
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">{calendar.message}</p>
            {calendar.entries.length > 0 && <>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={calendarKeys.length === calendar.entries.length} onChange={e => { setCalendarKeys(e.target.checked ? calendar.entries.map(entry => entry.key) : []); setDatesConfirmed(false) }} />Select all holidays</label>
              <div className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
                {calendar.entries.map(entry => <div key={entry.key} className="flex items-start gap-3 p-3">
                  <input type="checkbox" aria-label={entry.name} checked={calendarKeys.includes(entry.key)} onChange={e => { setCalendarKeys(keys => e.target.checked ? [...keys,entry.key] : keys.filter(key => key !== entry.key)); setDatesConfirmed(false) }} className="mt-1" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{entry.name}{entry.reviewDates && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Confirm dates</span>}</p><p className="mt-1 text-xs text-slate-500">{entry.startDate}{entry.endDate !== entry.startDate ? ` → ${entry.endDate}` : ''} · <a href={entry.source} target="_blank" rel="noreferrer" className="text-blue-700 underline">Official reference</a></p></div>
                </div>)}
              </div>
              {needsDateConfirmation && <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={datesConfirmed} onChange={e => setDatesConfirmed(e.target.checked)} className="mt-1" />I verified the dates marked for confirmation for our organization and sector. If dates differ, I will deselect the holiday and add a custom date.</label>}
              <p className="text-xs text-slate-500">Only selected holidays will be added. Existing and customized holidays stay unchanged. No employee notifications or allocations are sent automatically.</p>
            </>}
          </>}
          <div className="flex justify-end gap-2"><Button variant="secondary" disabled={calendarSaving} onClick={() => setCalendarOpen(false)}>Cancel</Button><Button onClick={importCalendar} disabled={calendarSaving || calendarLoading || !previewMatches || !calendarKeys.length || (needsDateConfirmation && !datesConfirmed)}>{calendarSaving ? 'Adding…' : `Add selected (${calendarKeys.length})`}</Button></div>
        </fieldset>
      </Modal>
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
      <Modal open={allocModal} onClose={() => setAllocModal(false)} title="New Holiday Allocation" size="lg" panelClassName="allocation-form-modal"
        footer={<div className="allocation-modal-actions"><Button type="button" variant="secondary" onClick={() => setAllocModal(false)}>Cancel</Button><Button type="submit" form="holidays-allocation-form">Allocate</Button></div>}>
        <form id="holidays-allocation-form" onSubmit={handleAllocSubmit(onAllocSubmit)} className="allocation-form-layout">
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

          <div className="allocation-type-toggle flex gap-2">
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
              <div className="allocation-employee-picker">
                <div className="allocation-picker-heading"><label>Employees</label><span>{selectAll ? employees.length : selectedEmployeeIds.length} selected</span></div>
                <div className="allocation-picker-toolbar"><label className="allocation-search"><span aria-hidden="true">⌕</span><input value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} placeholder="Search employees" aria-label="Search employees" /></label><button type="button" onClick={() => { const next = !selectAll; setSelectAll(next); setSelectedEmployeeIds(next ? employees.map(employee => employee.id) : []) }}>{selectAll ? 'Clear all' : 'Select all'}</button></div>
                <div className="allocation-employee-list">
                  {employees.filter(e => `${e.firstName || ''} ${e.lastName || ''} ${e.badgeId || ''} ${e.departmentName || ''}`.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 ? <p className="allocation-empty-employees">{employees.length ? 'No matching employees.' : 'No employees are available.'}</p> : employees.filter(e => `${e.firstName || ''} ${e.lastName || ''} ${e.badgeId || ''} ${e.departmentName || ''}`.toLowerCase().includes(employeeSearch.toLowerCase())).map(e => (
                    <label key={e.id} className="allocation-employee-option"><input type="checkbox" checked={selectAll || selectedEmployeeIds.includes(e.id)} onChange={() => { setSelectAll(false); setSelectedEmployeeIds(ids => ids.includes(e.id) ? ids.filter(id => id !== e.id) : [...ids, e.id]) }} /><span className="allocation-employee-avatar">{(e.firstName || 'E').charAt(0).toUpperCase()}</span><span className="allocation-employee-name">{e.firstName} {e.lastName || ''}</span>{e.departmentName && <small>{e.departmentName}</small>}</label>
                  ))}
                </div>
              </div>
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
