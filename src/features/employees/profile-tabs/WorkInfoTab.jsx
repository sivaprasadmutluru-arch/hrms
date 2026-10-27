import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api'
import Spinner from '../../../components/common/Spinner'
import { formatDate } from '../../../utils/formatters'
import useCurrency from '../../../hooks/useCurrency'
import useAuth from '../../../hooks/useAuth'

const Section = ({ title, children }) => (
  <div className="employee-detail-section mb-6">
    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
    <dl className="employee-detail-fields grid grid-cols-1 gap-2">{children}</dl>
  </div>
)

const Field = ({ label, value }) => (
  <div className="employee-detail-field">
    <dt className="employee-detail-field-label">{label}</dt>
    <dd className="employee-detail-field-value">{value != null && value !== '' ? value : '—'}</dd>
  </div>
)

export default function WorkInfoTab({ employeeId, companyId, isSelf = false }) {
  const formatCurrency = useCurrency().format
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const navigate = useNavigate()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager } = useAuth()
  const canEdit = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()

  useEffect(() => {
    if (!employeeId && !isSelf) return
    setError(null)
    const url = isSelf ? '/ess/my-work-info' : `/employees/${employeeId}/work-info`
    const cfg = (!isSelf && companyId) ? { headers: { 'X-Company-Id': companyId } } : {}
    api.get(url, cfg)
      .then(res => setInfo(res.data))
      .catch(err => {
        if (err.response?.status !== 404) {
          setError('Failed to load work information.')
        }
      })
      .finally(() => setLoading(false))
  }, [employeeId, companyId])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  if (error) return <p className="text-sm text-red-500 py-6">{error}</p>

  if (!info) return (
    <div className="py-6 flex flex-col items-start gap-3">
      <p className="text-sm text-gray-400">No work information available.</p>
      {canEdit && (
        <button
          onClick={() => navigate(`/employees/${employeeId}/work-info`)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          + Add Work Information
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => navigate(`/employees/${employeeId}/work-info`)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Edit
          </button>
        </div>
      )}
      <Section title="Assignment">
        <Field label="Department"        value={info.departmentName} />
        <Field label="Job Position"      value={info.jobPositionName} />
        <Field label="Job Role"          value={info.jobRoleName} />
        <Field label="Shift"             value={info.shiftName} />
        <Field label="Work Type"         value={info.workTypeName} />
        <Field label="Reporting Manager" value={info.reportingManagerName} />
        <Field label="Work Location"     value={info.location} />
        <Field label="Work Email"        value={info.workEmail} />
        <Field label="Work Mobile"       value={info.workMobile} />
        <Field label="Date of Joining"   value={formatDate(info.dateJoining)} />
        <Field label="Contract End Date" value={formatDate(info.contractEndDate)} />
      </Section>

      <div className="border-t border-gray-100" />

      <Section title="Salary Components">
        <Field label="Basic Salary"          value={info.basicSalary != null ? formatCurrency(info.basicSalary) : null} />
        <Field label="Housing Allowance"     value={info.housingAllowance != null ? formatCurrency(info.housingAllowance) : null} />
        <Field label="Transport Allowance"   value={info.transportAllowance != null ? formatCurrency(info.transportAllowance) : null} />
        <Field label="Other Allowance"       value={info.otherAllowance != null ? formatCurrency(info.otherAllowance) : null} />
        <Field
          label="Total Salary"
          value={
            [info.basicSalary, info.housingAllowance, info.transportAllowance, info.otherAllowance]
              .some(v => v != null)
              ? formatCurrency(
                  [info.basicSalary, info.housingAllowance, info.transportAllowance, info.otherAllowance]
                    .reduce((sum, v) => sum + (Number(v) || 0), 0)
                )
              : null
          }
        />
      </Section>
    </div>
  )
}
