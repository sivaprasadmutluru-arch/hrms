import {attendanceCategory, attendanceCounts, canRegulariseAttendance} from '../src/utils/attendanceRecords';

it('never counts exempt records as absent, late or present', () => {
  expect(attendanceCategory({displayStatus:'EXEMPT',attendanceStatus:'IRREGULAR',attendanceRequired:false})).toBeNull();
  expect(attendanceCategory({displayStatus:'EXEMPT'})).toBeNull();
  expect(attendanceCounts([{displayStatus:'EXEMPT'}, {displayStatus:'ABSENT'}, {displayStatus:'REGULAR'}])).toEqual({present:1,absent:1,late:0});
});
it('does not offer regularisation on an exempt date, including a stored irregular row', () => {
  const now=new Date('2026-10-27T12:00:00Z');
  expect(canRegulariseAttendance({attendanceDate:'2026-10-27',displayStatus:'EXEMPT'},now)).toBe(false);
  expect(canRegulariseAttendance({attendanceDate:'2026-10-27',attendanceStatus:'IRREGULAR',attendanceRequired:false},now)).toBe(false);
  expect(canRegulariseAttendance({attendanceDate:'2026-10-27',displayStatus:'ABSENT'},now)).toBe(true);
});
