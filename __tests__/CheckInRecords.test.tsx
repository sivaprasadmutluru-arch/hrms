import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {FlatList} from 'react-native';
import {api} from '../src/api/client';
import CheckInScreen from '../src/screens/CheckInScreen';
import AttendanceRecordsScreen from '../src/screens/AttendanceRecordsScreen';
import AttendanceRegularisationModal from '../src/components/AttendanceRegularisationModal';
import PrimaryButton from '../src/components/PrimaryButton';
import {attendanceCounts, attendanceRecords, attendancePunch, canRegulariseAttendance, loadAttendanceCheckouts} from '../src/utils/attendanceRecords';

jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/context/AuthContext', () => ({useAuth: () => ({user: {}, profile: {firstName: 'Employee'}})}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})}));
jest.mock('../src/utils/location', () => ({captureCurrentLocation: jest.fn().mockRejectedValue(new Error('Location unavailable')), reverseGeocode: jest.fn()}));

const records = [
  {id: 1, attendanceDate: '2026-10-10', displayStatus: 'REGULAR', checkIn: '09:00', checkOut: '17:00'},
  {id: 2, attendanceDate: '2026-10-12', displayStatus: 'REGULARISED'},
  {attendanceDate: '2026-10-13', displayStatus: 'ABSENT'},
  {id: 4, attendanceDate: '2026-10-14', displayStatus: 'IRREGULAR'},
  {attendanceDate: '2026-10-15', displayStatus: 'HOLIDAY'},
];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-18T08:00:00Z'));
  jest.spyOn(api, 'clockStatus').mockResolvedValue({online: false});
  jest.spyOn(api, 'myAttendance').mockResolvedValue([]);
  jest.spyOn(api, 'myAttendanceActivities').mockResolvedValue([]);
  jest.spyOn(api, 'workInfo').mockResolvedValue({});
  jest.spyOn(api, 'geoFencing').mockResolvedValue(null);
  jest.spyOn(api, 'attendanceFullView').mockResolvedValue(records);
});

afterEach(() => {jest.restoreAllMocks(); jest.useRealTimers();});

it('keeps overview counts consistent with filtered lists and orders recent dates first', () => {
  expect(attendanceCounts(records)).toEqual({present: 2, absent: 1, late: 1});
  expect(attendanceRecords(records, 'present').map(item => item.id)).toEqual([2, 1]);
  expect(attendanceRecords(records, 'absent')).toEqual([records[2]]);
  expect(attendanceRecords(records, 'late')).toEqual([records[3]]);
});

it('opens each monthly card as a dedicated page and returns to Check In', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const onRootChange = jest.fn();
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CheckInScreen onRootChange={onRootChange} />);});
  expect(onRootChange).toHaveBeenLastCalledWith(true);
  expect(api.attendanceFullView).toHaveBeenCalledWith(expect.objectContaining({from: '2026-10-01', to: '2026-10-31'}));
  for (const [category, label, count] of [['present', 'present', 2], ['absent', 'absent', 1], ['late', 'late in', 1]] as const) {
    const card = renderer.root.findAll(node => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith(`View ${count} ${label} records`))[0];
    await ReactTestRenderer.act(async () => {card.props.onPress();});
    expect(onRootChange).toHaveBeenLastCalledWith(false);
    expect(renderer.root.findByType(AttendanceRecordsScreen).props.category).toBe(category);
    expect(renderer.root.findByType(FlatList).props.data).toHaveLength(count);
    await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Back to Check In'}).props.onPress();});
    expect(renderer.root.findAllByType(AttendanceRecordsScreen)).toHaveLength(0);
    expect(onRootChange).toHaveBeenLastCalledWith(true);
  }
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('allows switching categories and retrying failed record loads on the dedicated page', async () => {
  const onCategoryChange = jest.fn();
  const onRefresh = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AttendanceRecordsScreen category="present" month="Oct 2026" records={[]} loading={false} error="Network unavailable" onCategoryChange={onCategoryChange} onRefresh={onRefresh} onBack={jest.fn()} />);});
  await ReactTestRenderer.act(async () => {renderer.root.findAll(node => node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function')[1].props.onPress();});
  expect(onCategoryChange).toHaveBeenCalledWith('absent');
  const retry = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && !node.props.accessibilityLabel)[0];
  await ReactTestRenderer.act(async () => {retry.props.onPress();});
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('uses recorded checkout aliases and the latest day punch without fabricating checkouts', async () => {
  expect(attendancePunch({checkOut: '-', checkoutTime: '17:30'}, 'out')).toBe('17:30');
  const load = jest.fn().mockResolvedValueOnce([{clockIn: '09:00', clockOut: '12:00'}, {inDatetime: '2026-10-14T13:00:00', outDatetime: '2026-10-14T17:30:00'}]);
  const enriched = await loadAttendanceCheckouts([records[0], {...records[1], clockOutTime: '18:00'}, {...records[3], checkIn: '09:00'}, records[2]], load);
  expect(enriched[0].checkOut).toBe('17:00');
  expect(enriched[2].checkOut).toBe('2026-10-14T17:30:00');
  expect(load).toHaveBeenCalledTimes(1);
  // Re-run the missing-checkout case; a summary with no checkout uses history.
  const fallback = await loadAttendanceCheckouts([{...records[0], checkOut: null}], jest.fn().mockResolvedValue([{clockOut: '12:00'}, {clockOut: '17:30'}]));
  expect(fallback[0].checkOut).toBe('17:30');
  const missing = await loadAttendanceCheckouts([{...records[0], checkOut: null}], jest.fn().mockResolvedValue([{clockIn: '09:00'}]));
  expect(attendancePunch(missing[0], 'out')).toBe('');
});

it('limits regularisation to correctable dates with no existing request', () => {
  expect(canRegulariseAttendance(records[2])).toBe(true);
  expect(canRegulariseAttendance(records[3])).toBe(true);
  for (const record of [records[0], {...records[2], regularisationStatus: 'PENDING'}, {...records[2], attendanceDate: '2026-10-20'}, {...records[2], attendanceDate: '2026-01-01'}, {...records[2], displayStatus: 'HOLIDAY'}]) {
    expect(canRegulariseAttendance(record)).toBe(false);
  }
});

it('opens regularisation from the absent records page and submits requested times with its date', async () => {
  const submit = jest.spyOn(api, 'submitRegularisationRequest').mockResolvedValue({});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CheckInScreen />);});
  const absentCard = renderer.root.findAll(node => String(node.props.accessibilityLabel).startsWith('View 1 absent records'))[0];
  await ReactTestRenderer.act(async () => {absentCard.props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Regularise attendance for 2026-10-13'}).props.onPress();});
  expect(renderer.root.findByType(AttendanceRegularisationModal).props.record.attendanceDate).toBe('2026-10-13');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({accessibilityLabel: 'Requested check-out time'}).props.onChangeText('17:30');
    renderer.root.findByProps({accessibilityLabel: 'Reason for correction'}).props.onChangeText('Forgot to punch');
  });
  await ReactTestRenderer.act(async () => {await renderer.root.findByType(PrimaryButton).props.onPress();});
  expect(submit).toHaveBeenCalledWith({attendanceDate: '2026-10-13', requestType: 'MISSING_PUNCH', requestedCheckIn: '09:00', requestedCheckOut: '17:30', reason: 'Forgot to punch'});
  expect(renderer.root.findByType(AttendanceRegularisationModal).props.record).toBeNull();
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('changes the records month from the header calendar and preserves the selected category', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CheckInScreen />);});
  await ReactTestRenderer.act(async () => {renderer.root.findAll(node => String(node.props.accessibilityLabel).startsWith('View 1 late in records'))[0].props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Change attendance month'}).props.onPress();});
  expect(renderer.root.findByProps({accessibilityLabel: 'November 2026'}).props.disabled).toBe(true);
  jest.mocked(api.attendanceFullView).mockResolvedValueOnce([]);
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'September 2026'}).props.onPress();});
  expect(api.attendanceFullView).toHaveBeenLastCalledWith(expect.objectContaining({from: '2026-09-01', to: '2026-09-30'}));
  const page = renderer.root.findByType(AttendanceRecordsScreen);
  expect(page.props.monthCursor.getMonth()).toBe(8);
  expect(page.props.category).toBe('late');
  expect(renderer.root.findByType(FlatList).props.data).toEqual([]);
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Back to Check In'}).props.onPress();});
  expect(renderer.root.findAll(node => String(node.props.accessibilityLabel).startsWith('View 0 present records'))).not.toHaveLength(0);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
