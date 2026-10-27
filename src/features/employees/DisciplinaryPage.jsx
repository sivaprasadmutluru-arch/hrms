import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDisciplinaryActions, createDisciplinaryAction, updateDisciplinaryAction,
  deleteDisciplinaryAction, selectDisciplinaryActions, selectLoading
} from './employeeExtrasSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from './employeesSlice'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import { formatDate } from '../../utils/formatters'

const ACTION_TYPES = [
  { value: 'VERBAL_WARNING', label: 'Verbal Warning' },
  { value: 'WRITTEN_WARNING', label: 'Written Warning' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'DEMOTION', label: 'Demotion' },
  { value: 'TERMINATION', label: 'Termination' },
]

export default function DisciplinaryPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const actions = useSelector(selectDisciplinaryActions)
  const employees = useSelector(selectEmployees)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const [employeeSearch, setEmployeeSearch] = useState('')
  const selectedEmployeeIds = watch('employeeIds') || []

  useEffect(() => {
    dispatch(fetchDisciplinaryActions())
    dispatch(fetchEmployees({ page: 0, size: 200 }))
  }, [dispatch])

  const openCreate = () => { setEditing(null); setEmployeeSearch(''); reset({ startDate: new Date().toISOString().slice(0, 10), employeeIds: [] }); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    setEmployeeSearch('')
    reset({
      ...row,
      actionType: row.actionType,
      employeeIds: row.employees?.map(e => String(e.id)) ?? [],
    })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      company: { id: user?.companyId },
      employees: data.employeeIds ? String(data.employeeIds).split(',').map(id => ({ id: Number(id.trim()) })) : [],
    }
    try {
      if (editing) {
        await dispatch(updateDisciplinaryAction({ id: editing.id, data: payload })).unwrap()
        toast.success('Disciplinary action updated')
      } else {
        await dispatch(createDisciplinaryAction(payload)).unwrap()
        toast.success('Disciplinary action created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteDisciplinaryAction(deleteTarget.id)).unwrap()
      toast.success('Disciplinary action deleted')
      setDeleteTarget(null)
    } catch (e) { toast.error(e || 'Error') }
  }

  const filteredActions = actions.filter(action => {
    const employeeNames = action.employees?.map(employee => employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`).join(' ') || ''
    return `${action.actionType || ''} ${action.description || ''} ${employeeNames}`.toLowerCase().includes(search.toLowerCase())
  })
  const coveredEmployees = new Set(actions.flatMap(action => action.employees || []).map(employee => employee.id)).size
  const recordedDays = actions.reduce((total, action) => total + (Number(action.days) || 0), 0)
  const actionTone = (type) => ['SUSPENSION', 'DEMOTION', 'TERMINATION'].includes(type) ? 'serious' : 'warning'
  const filteredEmployees = employees.filter(employee => `${employee.fullName || ''} ${employee.firstName || ''} ${employee.lastName || ''} ${employee.departmentName || ''}`.toLowerCase().includes(employeeSearch.toLowerCase()))

  return (
    <div className="disciplinary-page">
      <section className="disciplinary-hero">
        <div className="disciplinary-hero-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg></div>
        <div className="disciplinary-hero-copy"><span className="disciplinary-eyebrow">PEOPLE OPERATIONS</span><h1>Disciplinary actions</h1><p>Maintain clear, consistent records of employee conduct and follow-up.</p></div>
        <Button onClick={openCreate}>+ New action</Button>
      </section>

      <section className="disciplinary-summary" aria-label="Disciplinary action summary">
        <div className="disciplinary-stat"><span className="disciplinary-stat-icon">▤</span><div><span>Recorded actions</span><strong>{actions.length}</strong></div></div>
        <div className="disciplinary-stat"><span className="disciplinary-stat-icon disciplinary-stat-icon-blue">♙</span><div><span>Employees covered</span><strong>{coveredEmployees}</strong></div></div>
        <div className="disciplinary-stat"><span className="disciplinary-stat-icon disciplinary-stat-icon-slate">◷</span><div><span>Total days recorded</span><strong>{recordedDays}</strong></div></div>
      </section>

      <section className="disciplinary-records">
        <div className="disciplinary-records-head"><div><h2>Action records</h2><p>Search and manage documented employee actions.</p></div><label className="disciplinary-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search employee or action" aria-label="Search disciplinary actions" /></label></div>
        {loading ? <div className="disciplinary-loading"><span />Loading action records…</div> : filteredActions.length === 0 ? (
          <div className="disciplinary-empty"><span className="disciplinary-empty-icon">✓</span><h3>{search ? 'No matching records' : 'No actions recorded'}</h3><p>{search ? 'Try another employee name or action type.' : 'New disciplinary records will appear here once created.'}</p>{!search && <Button onClick={openCreate}>Create first action</Button>}</div>
        ) : (
          <div className="disciplinary-grid">
            {filteredActions.map(action => (
              <article className="disciplinary-card" key={action.id}>
                <div className="disciplinary-card-top"><span className={`disciplinary-type disciplinary-type-${actionTone(action.actionType)}`}>{action.actionType?.replace(/_/g, ' ') || 'ACTION'}</span><span className="disciplinary-record-id">RECORD #{action.id}</span></div>
                <div className="disciplinary-card-main"><div className="disciplinary-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="M9 12h6"/></svg></div><div className="disciplinary-card-copy"><h3>{action.employees?.length ? action.employees.map(employee => employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()).join(', ') : 'No employees assigned'}</h3><span>Employee{action.employees?.length === 1 ? '' : 's involved'}</span></div></div>
                {action.description && <p className="disciplinary-description">{action.description}</p>}
                <div className="disciplinary-card-meta"><div><span>Start date</span><strong>{action.startDate ? formatDate(action.startDate) : '—'}</strong></div><div><span>Duration</span><strong>{action.days ? `${action.days} day${Number(action.days) === 1 ? '' : 's'}` : 'Not specified'}</strong></div></div>
                <div className="disciplinary-card-actions"><Button size="sm" variant="secondary" onClick={() => openEdit(action)}>Edit record</Button><Button size="sm" variant="danger" onClick={() => setDeleteTarget(action)}>Delete</Button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Disciplinary Action' : 'New Disciplinary Action'}
        size="lg"
        panelClassName="disciplinary-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        <div className="disciplinary-form">
          <Select
            label="Action Type"
            options={ACTION_TYPES}
            error={errors.actionType?.message}
            {...register('actionType', { required: 'Required' })}
          />
          <Input label="Start Date" type="date" {...register('startDate')} />
          <Input label="Duration (days)" type="number" {...register('days')} />
          <div className="disciplinary-description-field">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('description')} />
          </div>
          <div className="disciplinary-employee-field">
            <div className="disciplinary-employee-heading"><label>Employees</label><span>{selectedEmployeeIds.length} selected</span></div>
            {employees.length > 0 && <label className="disciplinary-employee-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input value={employeeSearch} onChange={event => setEmployeeSearch(event.target.value)} placeholder="Find an employee" aria-label="Find an employee" /></label>}
            <div className="disciplinary-employee-options">
              {employees.length === 0 ? <div className="disciplinary-no-employees"><span>♙</span><strong>No employees available</strong><small>Employees will appear here when they are added to this organization.</small></div> : filteredEmployees.length === 0 ? <p className="disciplinary-no-results">No employees match “{employeeSearch}”.</p> : filteredEmployees.map(employee => (
                <label className="disciplinary-employee-option" key={employee.id}>
                  <input type="checkbox" value={String(employee.id)} {...register('employeeIds')} />
                  <span className="disciplinary-employee-avatar">{(employee.fullName || employee.firstName || 'E').trim().charAt(0).toUpperCase()}</span>
                  <span className="disciplinary-employee-name">{employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()}</span>
                  {employee.departmentName && <small>{employee.departmentName}</small>}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Disciplinary Action"
        message="Are you sure you want to delete this disciplinary action?"
        confirmLabel="Delete"
      />
    </div>
  )
}
