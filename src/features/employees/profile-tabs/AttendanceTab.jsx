import IndividualAttendanceView from '../../attendance/IndividualAttendanceView'

export default function AttendanceTab({ employeeId, companyId, profile }) {
  if (!employeeId) return null

  const employeeName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : ''
  const employeeCode = profile?.badgeId || profile?.employeeCode || ''

  return (
    <div className="attendance-tab-content">
      <IndividualAttendanceView
        employeeId={employeeId}
        companyId={companyId}
        employeeName={employeeName}
        employeeCode={employeeCode}
        isModal={false}
      />
    </div>
  )
}
