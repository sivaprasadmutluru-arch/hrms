import { formatDate, formatDateTime, formatStatus } from '../../../utils/formatters'

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

export default function AboutTab({ profile }) {
  if (!profile) return null
  return (
    <div className="space-y-2">
      <Section title="Personal Information">
        <Field label="First Name"      value={profile.firstName} />
        <Field label="Last Name"       value={profile.lastName} />
        <Field label="Employee ID"     value={profile.badgeId} />
        <Field label="Email"           value={profile.email} />
        <Field label="Phone"           value={profile.phone} />
        <Field label="Date of Birth"   value={formatDate(profile.dateOfBirth)} />
        <Field label="Gender"          value={formatStatus(profile.gender)} />
        <Field label="Marital Status"  value={formatStatus(profile.maritalStatus)} />
        <Field label="Nationality"     value={profile.nationality} />
        <Field label="Country of Birth" value={profile.countryOfBirth} />
        <Field label="Place of Birth"  value={profile.placeOfBirth} />
        <Field label="Qualification"   value={profile.qualification} />
        <Field label="Experience"      value={profile.experience != null ? `${profile.experience} yrs` : null} />
        <Field label="Children"        value={profile.children} />
      </Section>

      <div className="border-t border-gray-100" />

      <Section title="Work Information">
        <Field label="Department"         value={profile.departmentName} />
        <Field label="Job Position"       value={profile.jobPositionName} />
        <Field label="Job Role"           value={profile.jobRoleName} />
        <Field label="Work Type"          value={profile.workTypeName} />
        <Field label="Shift"              value={profile.shiftName} />
        <Field label="Reporting Manager"  value={profile.reportingManagerName} />
        <Field label="Branch / Company"   value={profile.companyName} />
        <Field label="Work Email"         value={profile.workEmail} />
        <Field label="Work Phone"         value={profile.workPhone} />
        <Field label="Date of Joining"    value={formatDate(profile.dateJoining)} />
        <Field label="Employee Type"      value={formatStatus(profile.employeeType)} />
        <Field label="Created At"         value={formatDateTime(profile.createdAt)} />
      </Section>

      <div className="border-t border-gray-100" />

      <Section title="Address">
        <Field label="Permanent Address" value={profile.permanentAddress} />
        <Field label="Current Address"   value={profile.currentAddress} />
        <Field label="Country"           value={profile.country} />
        <Field label="State"             value={profile.state} />
        <Field label="City"              value={profile.city} />
        <Field label="ZIP Code"          value={profile.zip} />
      </Section>

      <div className="border-t border-gray-100" />

      <Section title="Emergency Contact">
        <Field label="Contact Name"     value={profile.emergencyContactName} />
        <Field label="Contact Phone"    value={profile.emergencyContact} />
        <Field label="Relation"         value={profile.emergencyContactRelation} />
      </Section>
    </div>
  )
}
