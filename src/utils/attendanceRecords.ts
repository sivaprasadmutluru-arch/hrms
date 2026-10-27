export type AttendanceCategory = 'present' | 'absent' | 'late';

export const attendanceCategories: {key: AttendanceCategory; label: string}[] = [
  {key: 'present', label: 'Present'},
  {key: 'absent', label: 'Absent'},
  {key: 'late', label: 'Late In'},
];

// Match the monthly overview's HRMS status mapping in both counts and lists.
export function attendanceCategory(record: any): AttendanceCategory | null {
  if (record?.attendanceRequired === false || record?.displayStatus === 'EXEMPT') return null;
  const status = String(record?.displayStatus || record?.attendanceStatus || record?.status || '').toUpperCase();
  if (status === 'REGULAR' || status === 'REGULARISED') return 'present';
  if (status === 'ABSENT') return 'absent';
  if (status === 'IRREGULAR') return 'late';
  return null;
}

export function attendanceCounts(records: any[]) {
  const counts = {present: 0, absent: 0, late: 0};
  records.forEach(record => {
    const category = attendanceCategory(record);
    if (category) counts[category] += 1;
  });
  return counts;
}

export function attendanceRecords(records: any[], category: AttendanceCategory) {
  return records.filter(record => attendanceCategory(record) === category)
    .sort((a, b) => String(b.attendanceDate || b.date || '').localeCompare(String(a.attendanceDate || a.date || '')));
}

export function attendancePunch(record: any, kind: 'in' | 'out'): string {
  const keys = kind === 'in'
    ? ['checkIn', 'checkInTime', 'checkinTime', 'inTime', 'clockInTime', 'clockIn', 'inDatetime']
    : ['checkOut', 'checkOutTime', 'checkoutTime', 'outTime', 'clockOutTime', 'clockOut', 'outDatetime'];
  for (const key of keys) {
    const value = record?.[key];
    if (value != null && !['', '-', 'null'].includes(String(value).trim())) return String(value);
  }
  return '';
}

export async function loadAttendanceCheckouts(records: any[], loadActivities: (date: string) => Promise<any>) {
  const result = records.map(record => ({...record}));
  // Bound concurrent day lookups. Summary rows can omit a checkout that is
  // available in the punch history; never infer one from a check-in.
  for (let start = 0; start < result.length; start += 3) {
    await Promise.all(result.slice(start, start + 3).map(async record => {
      const date = String(record.attendanceDate || record.date || '').slice(0, 10);
      if (!date || attendancePunch(record, 'out') || (!attendancePunch(record, 'in') && !['present', 'late'].includes(attendanceCategory(record) || ''))) return;
      try {
        const response = await loadActivities(date);
        const activities = Array.isArray(response) ? response : response?.content || response?.items || [];
        const checkouts: string[] = activities.map((activity: any) => attendancePunch(activity, 'out')).filter(Boolean);
        const order = (value: string) => new Date(value.includes('T') ? value : `${date}T${value}`).getTime();
        checkouts.sort((a, b) => order(b) - order(a));
        if (checkouts.length) record.checkOut = checkouts[0];
      } catch {
        record.checkoutUnavailable = true;
      }
    }));
  }
  return result;
}

export function canRegulariseAttendance(record: any, now = new Date()) {
  const date = String(record?.attendanceDate || record?.date || '').slice(0, 10);
  const today = now.toLocaleDateString('en-CA', {timeZone: 'Asia/Dubai'});
  const earliest = new Date(`${today}T12:00:00`);
  const day = earliest.getDate();
  earliest.setDate(1);
  earliest.setMonth(earliest.getMonth() - 1);
  const lastDay = new Date(earliest.getFullYear(), earliest.getMonth() + 1, 0).getDate();
  earliest.setDate(Math.min(day, lastDay));
  const earliestKey = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}-${String(earliest.getDate()).padStart(2, '0')}`;
  if (!date || date < earliestKey || date > today) return false;
  if (record?.attendanceRequired === false || record?.displayStatus === 'EXEMPT') return false;
  if (record?.regularisationStatus && record.regularisationStatus !== 'NONE') return false;
  const status = String(record?.attendanceStatus || record?.displayStatus || record?.status || '').toUpperCase();
  if (['WEEK_OFF', 'WEEKOFF', 'HOLIDAY', 'LEAVE'].includes(status)) return false;
  return status === 'ABSENT' || status === 'IRREGULAR';
}
