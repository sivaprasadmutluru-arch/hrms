import { useEffect, useState } from 'react'
import api from '../../../services/api'
import Spinner from '../../../components/common/Spinner'
import { formatDate, formatCurrency } from '../../../utils/formatters'

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">{children}</dl>
  </div>
)

const Field = ({ label, value }) => (
  <div>
    <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
    <dd className="text-sm text-gray-900">{value != null && value !== '' ? value : '—'}</dd>
  </div>
)

export default function WorkInfoTab({ employeeId }) {
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    api.get(`/employees/${employeeId}/work-info`)
      .then(res => setInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (!info)   return <p className="text-sm text-gray-400 py-6">No work information available.</p>

  return (
    <div className="space-y-2">
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
