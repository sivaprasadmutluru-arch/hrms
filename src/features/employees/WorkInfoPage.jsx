import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchWorkInfo, saveWorkInfo, selectWorkInfo, selectLoading } from './employeeExtrasSlice'
import { fetchAll as fetchDepartments, selectAll as selectDepartments } from '../departments/departmentsSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from './employeesSlice'
import {
  fetchShiftSchedules, selectShiftSchedules,
  fetchWorkTypes, selectWorkTypes,
  fetchJobPositions, selectJobPositions,
} from '../base/baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function WorkInfoPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const workInfo = useSelector(selectWorkInfo)
  const loading = useSelector(selectLoading)
  const departments = useSelector(selectDepartments)
  const employees = useSelector(selectEmployees)
  const shiftSchedules = useSelector(selectShiftSchedules)
  const workTypes = useSelector(selectWorkTypes)
  const jobPositions = useSelector(selectJobPositions)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchDepartments())
    dispatch(fetchEmployees())
    dispatch(fetchShiftSchedules())
    dispatch(fetchWorkTypes())
    dispatch(fetchJobPositions())
    dispatch(fetchWorkInfo(id)).then(res => {
      if (res.payload && !res.error) {
        const wi = res.payload
        reset({
          departmentId: wi.departmentId ?? '',
          jobPositionId: wi.jobPositionId ?? '',
          shiftId: wi.shiftId ?? '',
          workTypeId: wi.workTypeId ?? '',
          reportingManagerId: wi.reportingManagerId ?? '',
          location: wi.location ?? '',
          dateJoining: wi.dateJoining ?? '',
          contractEndDate: wi.contractEndDate ?? '',
          basicSalary: wi.basicSalary ?? '',
          housingAllowance: wi.housingAllowance ?? '',
          transportAllowance: wi.transportAllowance ?? '',
          otherAllowance: wi.otherAllowance ?? '',
        })
      }
    })
  }, [dispatch, id])

  const onSubmit = async (data) => {
    const payload = {
      department: data.departmentId ? { id: Number(data.departmentId) } : null,
      jobPosition: data.jobPositionId ? { id: Number(data.jobPositionId) } : null,
      shift: data.shiftId ? { id: Number(data.shiftId) } : null,
      workType: data.workTypeId ? { id: Number(data.workTypeId) } : null,
      reportingManager: data.reportingManagerId ? { id: Number(data.reportingManagerId) } : null,
      location: data.location || null,
      dateJoining: data.dateJoining || null,
      contractEndDate: data.contractEndDate || null,
      basicSalary: data.basicSalary || null,
      housingAllowance: data.housingAllowance || null,
      transportAllowance: data.transportAllowance || null,
      otherAllowance: data.otherAllowance || null,
    }
    try {
      await dispatch(saveWorkInfo({ employeeId: id, data: payload })).unwrap()
      toast.success('Work information saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  return (
    <div>
      <PageHeader title="Work Information" subtitle="Manage employee work details and salary components" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <div className="space-y-4">

          <div className="border-b pb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Assignment</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" {...register('departmentId')}>
                  <option value="">— Select Department —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Position</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" {...register('jobPositionId')}>
                  <option value="">— Select Job Position —</option>
                  {jobPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" {...register('shiftId')}>
                  <option value="">— Select Shift —</option>
                  {shiftSchedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Work Type</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" {...register('workTypeId')}>
                  <option value="">— Select Work Type —</option>
                  {workTypes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Reporting Manager</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" {...register('reportingManagerId')}>
                  <option value="">— Select Reporting Manager —</option>
                  {employees.filter(e => String(e.id) !== String(id)).map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Location" {...register('location')} />
            <Input label="Date of Joining" type="date" {...register('dateJoining')} />
          </div>
          <Input label="Contract End Date" type="date" {...register('contractEndDate')} />

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Salary Components</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Basic Salary" type="number" step="0.01" {...register('basicSalary')} />
              <Input label="Housing Allowance" type="number" step="0.01" {...register('housingAllowance')} />
              <Input label="Transport Allowance" type="number" step="0.01" {...register('transportAllowance')} />
              <Input label="Other Allowance" type="number" step="0.01" {...register('otherAllowance')} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Work Information'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
