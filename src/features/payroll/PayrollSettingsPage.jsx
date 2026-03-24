import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchPayrollGeneralSettings, upsertPayrollGeneralSettings,
  fetchEncashmentSettings, upsertEncashmentSettings,
  fetchPayslipAutoGenerate, upsertPayslipAutoGenerate,
  selectPayrollGeneralSettings, selectEncashmentSettings, selectPayslipAutoGenerate,
  selectLoading,
} from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

const TABS = ['General', 'Encashment', 'Auto-Generate']

export default function PayrollSettingsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const loading = useSelector(selectLoading)
  const generalSettings = useSelector(selectPayrollGeneralSettings)
  const encashmentSettings = useSelector(selectEncashmentSettings)
  const autoGenerate = useSelector(selectPayslipAutoGenerate)

  const [tab, setTab] = useState('General')

  const { register: regGeneral, handleSubmit: handleGeneral, reset: resetGeneral, formState: { errors: errG } } = useForm()
  const { register: regEncash, handleSubmit: handleEncash, reset: resetEncash, formState: { errors: errE } } = useForm()
  const { register: regAuto, handleSubmit: handleAuto, reset: resetAuto, formState: { errors: errA } } = useForm()

  useEffect(() => {
    if (!companyId) return
    dispatch(fetchPayrollGeneralSettings(companyId))
    dispatch(fetchEncashmentSettings(companyId))
    dispatch(fetchPayslipAutoGenerate(companyId))
  }, [dispatch, companyId])

  useEffect(() => {
    if (generalSettings) resetGeneral({
      roundOff: generalSettings.roundOff,
      enableEncashment: generalSettings.enableEncashment,
      enableBonusPoint: generalSettings.enableBonusPoint,
      maxOvertimeHours: generalSettings.maxOvertimeHours,
      payrollStartDay: generalSettings.payrollStartDay,
    })
  }, [generalSettings, resetGeneral])

  useEffect(() => {
    if (encashmentSettings) resetEncash({
      enableSelfEncashment: encashmentSettings.enableSelfEncashment,
      maxEncashmentDays: encashmentSettings.maxEncashmentDays,
      minAccrualBeforeEncashment: encashmentSettings.minAccrualBeforeEncashment,
    })
  }, [encashmentSettings, resetEncash])

  useEffect(() => {
    if (autoGenerate) resetAuto({
      isEnabled: autoGenerate.isEnabled,
      generateDay: autoGenerate.generateDay,
      notifyEmail: autoGenerate.notifyEmail,
    })
  }, [autoGenerate, resetAuto])

  const onSaveGeneral = async (data) => {
    try {
      await dispatch(upsertPayrollGeneralSettings({ companyId, data })).unwrap()
      toast.success('General settings saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  const onSaveEncash = async (data) => {
    try {
      await dispatch(upsertEncashmentSettings({ companyId, data })).unwrap()
      toast.success('Encashment settings saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  const onSaveAuto = async (data) => {
    try {
      await dispatch(upsertPayslipAutoGenerate({ companyId, data })).unwrap()
      toast.success('Auto-generate settings saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Settings" subtitle="General, encashment and auto-generate configuration" />

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'General' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <h3 className="text-base font-semibold text-gray-800">General Payroll Settings</h3>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="roundOff" {...regGeneral('roundOff')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="roundOff" className="text-sm text-gray-700">Round off payroll figures</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="enableEncashment" {...regGeneral('enableEncashment')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="enableEncashment" className="text-sm text-gray-700">Enable leave encashment</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="enableBonusPoint" {...regGeneral('enableBonusPoint')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="enableBonusPoint" className="text-sm text-gray-700">Enable bonus point system</label>
          </div>
          <Input label="Max Overtime Hours" type="number" step="0.5" error={errG.maxOvertimeHours?.message} {...regGeneral('maxOvertimeHours', { valueAsNumber: true })} />
          <Input label="Payroll Start Day (1–31)" type="number" min="1" max="31" error={errG.payrollStartDay?.message} {...regGeneral('payrollStartDay', { valueAsNumber: true })} />
          <div className="flex justify-end">
            <Button onClick={handleGeneral(onSaveGeneral)} disabled={loading}>Save</Button>
          </div>
        </div>
      )}

      {tab === 'Encashment' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <h3 className="text-base font-semibold text-gray-800">Encashment Settings</h3>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="enableSelfEncashment" {...regEncash('enableSelfEncashment')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="enableSelfEncashment" className="text-sm text-gray-700">Allow employees to self-request encashment</label>
          </div>
          <Input label="Max Encashment Days per Year" type="number" error={errE.maxEncashmentDays?.message} {...regEncash('maxEncashmentDays', { valueAsNumber: true })} />
          <Input label="Min Accrual Before Encashment" type="number" error={errE.minAccrualBeforeEncashment?.message} {...regEncash('minAccrualBeforeEncashment', { valueAsNumber: true })} />
          <div className="flex justify-end">
            <Button onClick={handleEncash(onSaveEncash)} disabled={loading}>Save</Button>
          </div>
        </div>
      )}

      {tab === 'Auto-Generate' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <h3 className="text-base font-semibold text-gray-800">Payslip Auto-Generation</h3>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isEnabled" {...regAuto('isEnabled')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="isEnabled" className="text-sm text-gray-700">Enable automatic payslip generation</label>
          </div>
          <Input label="Generate on Day of Month (1–31)" type="number" min="1" max="31" error={errA.generateDay?.message} {...regAuto('generateDay', { valueAsNumber: true })} />
          <Input label="Notification Email" type="email" error={errA.notifyEmail?.message} {...regAuto('notifyEmail')} />
          <div className="flex justify-end">
            <Button onClick={handleAuto(onSaveAuto)} disabled={loading}>Save</Button>
          </div>
        </div>
      )}
    </div>
  )
}
