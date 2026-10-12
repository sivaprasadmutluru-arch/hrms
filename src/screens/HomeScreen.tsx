import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {pick, types} from '@react-native-documents/picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../components/Card';
import FieldRow from '../components/FieldRow';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import {API_MEDIA_BASE_URL, api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {fonts} from '../theme/typography';
import {dateText, employeeName, money, timeText, workDuration} from '../utils/format';
import HelpdeskScreen from './HelpdeskScreen';
import NotificationsScreen from './NotificationsScreen';

type ModuleKey = 'overview' | 'attendance' | 'leave' | 'leaveRequest' | 'payslips' | 'documents' | 'hours' | 'holidays' | 'announcements' | 'carr' | 'notifications' | 'helpdesk' | 'loans';

const LOAN_TYPES = [
  {value: 'LOAN', label: 'Loan'},
  {value: 'ADVANCED_SALARY', label: 'Advance Salary'},
  {value: 'FINE', label: 'Fine'},
];

const REGULARISATION_TYPES = [
  {value: 'LATE_ARRIVAL', label: 'Late Arrival'},
  {value: 'MISSING_PUNCH', label: 'Missing Punch'},
  {value: 'WORKING_HOURS_CORRECTION', label: 'Hours Correction'},
  {value: 'OVERTIME_REQUEST', label: 'Overtime'},
  {value: 'WRONG_STATUS', label: 'Wrong Status'},
  {value: 'HALF_TO_FULL_DAY', label: 'Half to Full Day'},
  {value: 'WORK_FROM_HOME', label: 'Work From Home'},
  {value: 'OFFICIAL_DUTY', label: 'Official Duty'},
];

const moduleInfo: Record<ModuleKey, {label: string; icon: string; subtitle: string}> = {
  overview: {label: 'Home', icon: 'grid-outline', subtitle: 'Employee self service'},
  attendance: {label: 'Attendance', icon: 'finger-print-outline', subtitle: 'Daily status and attendance history'},
  leave: {label: 'Leave', icon: 'calendar-clear-outline', subtitle: 'Full leave history and approval status'},
  leaveRequest: {label: 'Request Leave', icon: 'send-outline', subtitle: 'Check balance and submit a new application'},
  payslips: {label: 'Payslips', icon: 'wallet-outline', subtitle: 'Payroll history and monthly salary slips'},
  documents: {label: 'Documents', icon: 'document-attach-outline', subtitle: 'Requested and uploaded employee documents'},
  hours: {label: 'Hours', icon: 'time-outline', subtitle: 'Shift timings and worked hours summary'},
  holidays: {label: 'Holidays', icon: 'sparkles-outline', subtitle: 'Company holiday calendar'},
  announcements: {label: 'Announcements', icon: 'megaphone-outline', subtitle: 'Company news and important updates'},
  carr: {label: 'CAR Tasks', icon: 'checkmark-done-outline', subtitle: 'Your responsibilities, progress, and reviews'},
  notifications: {label: 'Notifications', icon: 'notifications-outline', subtitle: 'Read, unread, and cleared notifications'},
  helpdesk: {label: 'Helpdesk', icon: 'help-circle-outline', subtitle: 'Tickets and support request status'},
  loans: {label: 'Loans', icon: 'cash-outline', subtitle: 'Apply for a loan and track requests'},
};

function asArray(value: any) {
  if (Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value?.content)) {
    return value.content;
  }
  if (Array.isArray(value?.items)) {
    return value.items;
  }
  return [];
}

function uploadFile(file: any) {
  return {
    uri: file.uri,
    name: file.name || `document-${Date.now()}`,
    type: file.type || 'application/octet-stream',
  };
}

function field(item: any, names: string[], fallback: any = '-') {
  for (const name of names) {
    const value = item?.[name];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
}

function profilePhotoUrl(profile: any) {
  const path = profile?.photoPath || profile?.photoUrl || profile?.avatarUrl;
  if (!path) {
    return null;
  }
  if (String(path).startsWith('http')) {
    return String(path);
  }
  return `${API_MEDIA_BASE_URL}/media/${String(path).replace(/^\//, '')}`;
}

function statusTone(status?: string) {
  const text = String(status || '').toLowerCase();
  if (text.includes('approved') || text.includes('paid') || text.includes('present')) {
    return {bg: colors.successLight, fg: colors.success};
  }
  if (text.includes('reject') || text.includes('absent') || text.includes('cancel')) {
    return {bg: colors.dangerLight, fg: colors.danger};
  }
  if (text.includes('pending') || text.includes('late') || text.includes('irregular')) {
    return {bg: colors.warningLight, fg: colors.warning};
  }
  return {bg: colors.primaryLight, fg: colors.primary};
}

function canRequestRegularisation(record: any) {
  const date = String(field(record, ['attendanceDate', 'date'], '')).slice(0, 10);
  const noPendingRequest = !record?.regularisationStatus || record?.regularisationStatus === 'NONE';
  if (!noPendingRequest || !date || date < earliestRegularisationDateKey() || date > todayDateKey()) return false;
  // Week-offs are non-working days. A virtual row has no attendance id, so it
  // must be checked before the virtual-row fallback below.
  const dayStatus = String(field(record, ['displayStatus', 'status', 'attendanceStatus'], '')).replace(/[ _-]/g, '').toUpperCase();
  if (dayStatus === 'WEEKOFF') return false;
  // Existing records must be irregular. Virtual full-view rows have no id and
  // represent a missing attendance day, which the API accepts as MISSING_PUNCH.
  return record?.id ? record?.attendanceStatus === 'IRREGULAR' : true;
}

function leaveStatusGroup(item: any): 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'OTHER' {
  const text = String(field(item, ['status', 'approvalStatus'], '')).toUpperCase();
  if (text.includes('REQUEST') || text.includes('PEND')) return 'PENDING';
  if (text.includes('APPROV')) return 'APPROVED';
  if (text.includes('REJECT')) return 'REJECTED';
  if (text.includes('CANCEL')) return 'CANCELLED';
  return 'OTHER';
}

function leaveMeta(item: any) {
  const days = field(item, ['requestedDays', 'days', 'totalDays'], '');
  const reason = field(item, ['reason', 'remarks', 'description'], '');
  const parts: string[] = [];
  if (days !== '' && days !== '-') {
    parts.push(`${days} day${Number(days) === 1 ? '' : 's'}`);
  }
  if (reason && reason !== '-') {
    parts.push(String(reason));
  }
  return parts.join('  •  ');
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Dubai'});
}

function punchDateTime(record: any, value: any) {
  if (!value) return null;
  const text = String(value);
  if (text.includes('T')) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!timeMatch) return null;

  const dateTextValue = String(field(record, ['attendanceDate', 'date', 'createdAt'], todayKey())).slice(0, 10);
  const date = new Date(`${dateTextValue}T${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:${timeMatch[3] || '00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function durationFromPunches(record: any) {
  const checkIn = punchDateTime(record, field(record, ['checkIn', 'checkInTime', 'inTime'], ''));
  const checkOut = punchDateTime(record, field(record, ['checkOut', 'checkOutTime', 'outTime'], ''));
  if (!checkIn || !checkOut) return '-';

  let seconds = Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000);
  if (seconds < 0) {
    seconds += 24 * 60 * 60;
  }
  return seconds > 0 ? workDuration(seconds) : '-';
}

function attendanceTime(record: any) {
  const value = field(record, ['attendanceDate', 'date', 'createdAt'], '');
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function relativeAttendanceDay(record: any) {
  const date = String(field(record, ['attendanceDate', 'date', 'createdAt'], '')).slice(0, 10);
  const today = todayKey();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', {timeZone: 'Asia/Dubai'});
  if (date === today) return 'Today';
  if (date === yesterday) return 'Yesterday';
  return 'Earlier';
}

function attendanceLocation(record: any, kind: 'in' | 'out') {
  const address = kind === 'in'
    ? field(record, ['checkInAddress', 'checkInLocation'], '')
    : field(record, ['checkOutAddress', 'checkOutLocation'], '');
  if (address && address !== '-') return String(address);

  const latitude = kind === 'in'
    ? field(record, ['checkInLatitude', 'latitude'], '')
    : field(record, ['checkOutLatitude'], '');
  const longitude = kind === 'in'
    ? field(record, ['checkInLongitude', 'longitude'], '')
    : field(record, ['checkOutLongitude'], '');
  if (latitude !== '' && latitude !== '-' && longitude !== '' && longitude !== '-') {
    return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
  }
  return 'Not recorded';
}

function hoursWorked(record: any, clock?: any) {
  const seconds = record?.atWorkSecond ?? clock?.atWorkSecond;
  if (seconds !== undefined && seconds !== null) return workDuration(Number(seconds));
  return record?.workedHours || record?.totalHours || record?.hours || record?.duration || durationFromPunches(record);
}

function regularisationLabel(record: any) {
  const status = record?.regularisationStatus;
  const attendanceStatus = record?.attendanceStatus;
  const displayStatus = record?.displayStatus;
  if (status === 'REGULARISED' || attendanceStatus === 'REGULARISED') return 'Regularised';
  if (status === 'HAS_PENDING') return 'Pending';
  if (attendanceStatus === 'IRREGULAR') return 'Request needed';
  if (displayStatus && displayStatus !== 'REGULAR') return String(displayStatus).replace(/_/g, ' ');
  return 'Regular';
}

function SectionTitle({title, subtitle, icon}: {title: string; subtitle?: string; icon: string}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionIcon}>
        <Icon name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function Metric({label, value, icon, tone = 'primary'}: {label: string; value?: any; icon: string; tone?: 'primary' | 'success' | 'warning' | 'info'}) {
  const palette = {
    primary: [colors.primaryLight, colors.primary],
    success: [colors.successLight, colors.success],
    warning: [colors.warningLight, colors.warning],
    info: [colors.infoLight, colors.info],
  }[tone];
  return (
    <Card style={styles.metric}>
      <View style={[styles.metricIcon, {backgroundColor: palette[0]}]}>
        <Icon name={icon as any} size={18} color={palette[1]} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>{value || '-'}</Text>
    </Card>
  );
}

function HomeMetric({label, value, icon, tone}: {label: string; value?: any; icon: string; tone: 'success' | 'danger' | 'purple' | 'info'}) {
  const palette = {
    success: [colors.successLight, colors.success],
    danger: [colors.dangerLight, colors.danger],
    purple: [colors.purpleLight, colors.purple],
    info: [colors.infoLight, colors.info],
  }[tone];
  return (
    <View style={styles.homeMetric}>
      <View style={[styles.homeMetricIcon, {backgroundColor: palette[0]}]}><Icon name={icon as any} size={19} color={palette[1]} /></View>
      <Text style={styles.homeMetricLabel}>{label}</Text>
      <Text style={styles.homeMetricValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

function Empty({title, text, icon = 'folder-open-outline', fullPage = false}: {title: string; text?: string; icon?: string; fullPage?: boolean}) {
  return (
    <View style={[styles.emptyState, fullPage && styles.emptyStatePage]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon as any} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!text && <Text style={styles.emptyText}>{text}</Text>}
    </View>
  );
}

function Pill({text}: {text?: string}) {
  const tone = statusTone(text);
  return (
    <View style={[styles.pill, {backgroundColor: tone.bg}]}>
      <Text style={[styles.pillText, {color: tone.fg}]}>{text || 'Open'}</Text>
    </View>
  );
}

function RecordCard({title, subtitle, meta, status, children}: {title: string; subtitle?: string; meta?: string; status?: string; children?: React.ReactNode}) {
  return (
    <Card style={styles.record}>
      <View style={styles.recordTop}>
        <View style={styles.recordText}>
          <Text style={styles.recordTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.recordSub}>{subtitle}</Text>}
        </View>
        {!!status && <Pill text={status} />}
      </View>
      {!!meta && <Text style={styles.recordMeta}>{meta}</Text>}
      {children}
    </Card>
  );
}

function AttendanceEntry({record, onRegularise}: {record: any; onRegularise: (record: any) => void}) {
  const status = field(record, ['displayStatus', 'status', 'attendanceStatus'], '');
  const checkIn = timeText(field(record, ['checkIn', 'checkInTime', 'inTime']));
  const checkOut = timeText(field(record, ['checkOut', 'checkOutTime', 'outTime']));
  const normalizedStatus = String(status).replace(/[ _-]/g, '').toUpperCase();
  const accent = normalizedStatus === 'ABSENT' ? colors.danger
    : normalizedStatus === 'WEEKOFF' ? colors.primary
    : normalizedStatus === 'HOLIDAY' ? colors.purple
    : colors.success;

  return (
    <View style={[styles.attendanceEntry, {borderLeftColor: accent}]}>
      <View style={styles.attendanceEntryHead}>
        <View style={styles.attendanceHeadingGroup}>
          <View style={[styles.attendanceDateIcon, {backgroundColor: `${accent}16`}]}> 
            <Icon name="calendar-outline" size={19} color={accent} />
          </View>
          <View style={styles.attendanceDateWrap}>
            <Text style={styles.attendanceDate}>{dateText(field(record, ['attendanceDate', 'date', 'createdAt'], ''))}</Text>
            <Text style={styles.attendanceHours}>{hoursWorked(record)} worked</Text>
          </View>
        </View>
        <Pill text={status} />
      </View>

      <View style={styles.attendanceTimes}>
        <View style={styles.attendanceTimeColumn}>
          <View style={[styles.attendanceMetricIcon, {backgroundColor: colors.successLight}]}><Icon name="log-in-outline" size={16} color={colors.success} /></View>
          <Text style={styles.attendanceTimeLabel}>CHECK IN</Text>
          <Text style={styles.attendanceTimeValue}>{checkIn}</Text>
        </View>
        <View style={styles.attendanceTimeDivider} />
        <View style={styles.attendanceTimeColumn}>
          <View style={[styles.attendanceMetricIcon, {backgroundColor: colors.dangerLight}]}><Icon name="log-out-outline" size={16} color={colors.danger} /></View>
          <Text style={styles.attendanceTimeLabel}>CHECK OUT</Text>
          <Text style={styles.attendanceTimeValue}>{checkOut}</Text>
        </View>
        <View style={styles.attendanceTimeDivider} />
        <View style={styles.attendanceTimeColumn}>
          <View style={[styles.attendanceMetricIcon, {backgroundColor: colors.purpleLight}]}><Icon name="bar-chart-outline" size={16} color={colors.purple} /></View>
          <Text style={styles.attendanceTimeLabel}>HOURS WORKED</Text>
          <Text style={styles.attendanceTimeValue} numberOfLines={1}>{hoursWorked(record)}</Text>
        </View>
      </View>

      <View style={styles.attendanceLocations}>
        <View style={styles.attendanceLocationRow}>
          <View style={[styles.attendanceLocationIcon, {backgroundColor: colors.successLight}]}><Icon name="location-outline" size={16} color={colors.success} /></View>
          <View style={styles.attendanceLocationCopy}>
            <Text style={styles.attendanceLocationLabel}>IN LOCATION</Text>
            <Text style={styles.attendanceLocationValue} numberOfLines={2}>{attendanceLocation(record, 'in')}</Text>
          </View>
        </View>
        <View style={styles.attendanceLocationRow}>
          <View style={[styles.attendanceLocationIcon, {backgroundColor: colors.primaryLight}]}><Icon name="location-outline" size={16} color={colors.primary} /></View>
          <View style={styles.attendanceLocationCopy}>
            <Text style={styles.attendanceLocationLabel}>OUT LOCATION</Text>
            <Text style={styles.attendanceLocationValue} numberOfLines={2}>{attendanceLocation(record, 'out')}</Text>
          </View>
        </View>
      </View>

      {canRequestRegularisation(record) ? (
        <Pressable onPress={() => onRegularise(record)} style={({pressed}) => [styles.attendanceRegulariseLink, pressed && styles.pressed]}>
          <Icon name="create-outline" size={15} color={colors.warning} />
          <Text style={styles.attendanceRegulariseText}>Request regularisation</Text>
        </Pressable>
      ) : record.attendanceStatus === 'IRREGULAR' ? (
        <Text style={styles.attendanceRequestState}>{regularisationLabel(record)}</Text>
      ) : null}
    </View>
  );
}

function FeatureTile({
  icon,
  label,
  description,
  tone = 'primary',
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'purple';
  onPress: () => void;
}) {
  const palette = {
    primary: ['#FBF7FF', colors.primary, '#E2D5FF'],
    success: ['#F4FFFA', colors.success, '#BDEFD9'],
    warning: ['#FFFDF4', colors.warning, '#F8DEAA'],
    info: ['#F4FAFF', colors.info, '#C8E2FF'],
    purple: ['#FDF5FF', colors.purple, '#E6CCFF'],
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.featureTile, {borderColor: palette[2]}, pressed && styles.pressed]}>
      <View style={[styles.featureIcon, {backgroundColor: palette[0]}]}>
        <Icon name={icon as any} size={22} color={palette[1]} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
      <View style={[styles.openRow, {backgroundColor: palette[1]}]}>
        <Text style={[styles.openText, {color: colors.white}]}>Open</Text>
        <Icon name="arrow-forward" size={14} color={colors.white} />
      </View>
    </Pressable>
  );
}

function PageHeader({active, onBack, onApplyLeave, onApplyLoan}: {active: ModuleKey; onBack: () => void; onApplyLeave?: () => void; onApplyLoan?: () => void}) {
  const page = moduleInfo[active];
  return (
      <LinearGradient colors={['#1E1B4B', '#3730A3', '#6366F1']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-back-outline" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.pageTitleWrap}>
          <Text style={styles.pageTitle}>{page.label}</Text>
          <Text style={styles.pageSubtitle}>{page.subtitle}</Text>
        </View>
        {((active === 'leave' && onApplyLeave) || (active === 'loans' && onApplyLoan)) && (
          <Pressable onPress={active === 'leave' ? onApplyLeave : onApplyLoan} style={styles.applyLeaveHeaderButton}>
            <Icon name="add-outline" size={16} color={colors.primary} />
            <Text style={styles.applyLeaveHeaderText}>Apply</Text>
          </Pressable>
        )}
      </LinearGradient>
  );
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayDateKey() {
  return dateKey(new Date());
}

// Keep the mobile picker aligned with the server policy. `Date#setMonth` can
// overflow at month ends (for example, March 31), so clamp to the last valid
// day in the target month instead of silently moving into a different month.
function earliestLeaveDateKey() {
  const today = new Date();
  const targetYear = today.getFullYear();
  const targetMonth = today.getMonth() - 2;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return dateKey(new Date(targetYear, targetMonth, Math.min(today.getDate(), lastDay)));
}

function earliestRegularisationDateKey() {
  const today = new Date();
  const targetYear = today.getFullYear();
  const targetMonth = today.getMonth() - 1;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return dateKey(new Date(targetYear, targetMonth, Math.min(today.getDate(), lastDay)));
}

function parseDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function CalendarDateField({
  label,
  value,
  onChange,
  minDate = earliestLeaveDateKey(),
  maxDate,
  variant = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string | null;
  maxDate?: string;
  variant?: 'default' | 'filter';
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(value) || new Date());
  const selectedDate = parseDateKey(value);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({length: firstDay + daysInMonth}, (_, index) => (index < firstDay ? 0 : index - firstDay + 1));
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

  function shiftMonth(offset: number) {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openPicker() {
    setVisibleMonth(selectedDate || new Date());
    setOpen(true);
  }

  return (
    <>
      <Text style={variant === 'filter' ? styles.dateFilterLabel : styles.inputLabel}>{label}</Text>
      <Pressable onPress={openPicker} style={variant === 'filter' ? styles.dateFilterButton : styles.datePickerButton}>
        <Text style={[styles.datePickerValue, !value && styles.datePickerPlaceholder]}>{value || 'Select date'}</Text>
        <Icon name="calendar-outline" size={18} color={colors.primary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => shiftMonth(-1)} style={styles.calendarNavButton}>
                <Icon name="chevron-back-outline" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.calendarTitle}>{monthLabel}</Text>
              <Pressable onPress={() => shiftMonth(1)} style={styles.calendarNavButton}>
                <Icon name="chevron-forward-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.calendarWeekRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarWeekText}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {cells.map((day, index) => {
                const cellDate = day ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day) : null;
                const cellKey = cellDate ? dateKey(cellDate) : '';
                const selected = value === cellKey;
                const disabled = !day || Boolean(minDate && cellKey < minDate) || Boolean(maxDate && cellKey > maxDate);
                return (
                  <Pressable
                    key={`${index}-${day}`}
                    disabled={disabled}
                    onPress={() => {
                      onChange(cellKey);
                      setOpen(false);
                    }}
                    style={[styles.calendarDay, disabled && styles.calendarDayDisabled, selected && styles.calendarDaySelected]}>
                    {!!day && <Text style={[styles.calendarDayText, disabled && styles.calendarDayTextDisabled, selected && styles.calendarDayTextSelected]}>{day}</Text>}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calendarActions}>
              <PrimaryButton
                title="Today"
                variant="outline"
                onPress={() => {
                  onChange(dateKey(new Date()));
                  setOpen(false);
                }}
              />
              <PrimaryButton title="Done" onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function LeaveRequestForm({
  leaveTypes,
  selectedLeaveType,
  setSelectedLeaveType,
  onSubmit,
  submitting,
}: {
  leaveTypes: any[];
  selectedLeaveType: any;
  setSelectedLeaveType: (value: any) => void;
  onSubmit: (values: {startDate: string; endDate: string; reason: string}) => void;
  submitting: boolean;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Card style={styles.formCard}>
      <SectionTitle title="Request Leave" subtitle="Submit a new leave request to HR" icon="send-outline" />
      <Text style={styles.inputLabel}>Leave Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leaveTypeRow}>
        {leaveTypes.map(type => {
          const selected = field(type, ['id']) === field(selectedLeaveType, ['id']);
          return (
            <Pressable
              key={String(field(type, ['id', 'leaveTypeId', 'name', 'leaveTypeName']))}
              onPress={() => setSelectedLeaveType(type)}
              style={[styles.leaveType, selected && styles.leaveTypeActive]}>
              <Text style={[styles.leaveTypeText, selected && styles.leaveTypeTextActive]}>
                {field(type, ['name', 'leaveTypeName', 'typeName'])}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!leaveTypes.length && <Text style={styles.inlineHelp}>Leave types are not available yet.</Text>}

      <CalendarDateField label="Start Date" value={startDate} onChange={setStartDate} />
      <CalendarDateField label="End Date" value={endDate} onChange={setEndDate} />
      <Text style={styles.inlineHelp}>You can apply for leave up to 2 months in the past.</Text>
      <Text style={styles.inputLabel}>Reason</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Reason for leave"
        placeholderTextColor={colors.subtle}
        multiline
        style={[styles.input, styles.reasonInput]}
      />
      <PrimaryButton
        title="Submit Leave Request"
        loading={submitting}
        onPress={() => onSubmit({startDate, endDate, reason})}
      />
    </Card>
  );
}

function LeaveBalanceCard({item}: {item: any}) {
  const used = Number(field(item, ['usedDays', 'used', 'consumedDays'], 0)) || 0;
  // `remainingDays` is calculated by the API from entitlement minus approved
  // leave. Fall back for older servers, but never present the original annual
  // allocation as though it were the employee's remaining balance.
  const reportedRemaining = field(item, ['remainingDays'], null);
  const rawAvailable = Number(field(item, ['availableDays', 'balance', 'available', 'remaining', 'days'], 0)) || 0;
  const fallbackTotal = rawAvailable + used;
  const total = Number(field(item, ['totalLeaveDays', 'totalDays', 'total'], fallbackTotal)) || fallbackTotal;
  const available = reportedRemaining !== null && reportedRemaining !== '-'
    ? Number(reportedRemaining)
    : (total > 0 ? Math.max(0, total - used) : rawAvailable);
  const ratio = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0;
  const fillTone = available <= 0 && total > 0 ? colors.danger : ratio >= 0.7 ? colors.warning : colors.primary;

  return (
    <View style={styles.leaveBalanceItem}>
      <View style={styles.leaveBalanceHead}>
        <Text style={styles.leaveBalanceName} numberOfLines={1}>{field(item, ['leaveTypeName', 'name', 'typeName'])}</Text>
        <Text style={styles.leaveBalanceAvailable}>
          {available}
          <Text style={styles.leaveBalanceUnit}> left</Text>
        </Text>
      </View>
      <View style={styles.leaveProgressTrack}>
        <View style={[styles.leaveProgressFill, {width: `${ratio * 100}%`, backgroundColor: fillTone}]} />
      </View>
      <View style={styles.leaveBalanceMetaRow}>
        <Text style={styles.leaveBalanceMeta}>Used {used}</Text>
        <Text style={styles.leaveBalanceMeta}>Total {total}</Text>
      </View>
    </View>
  );
}

const LEAVE_HISTORY_PAGE_SIZE = 6;

function LeaveHistoryList({requests}: {requests: any[]}) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [visibleCount, setVisibleCount] = useState(LEAVE_HISTORY_PAGE_SIZE);

  const counts = useMemo(() => {
    const base = {ALL: requests.length, PENDING: 0, APPROVED: 0, REJECTED: 0};
    requests.forEach(item => {
      const group = leaveStatusGroup(item);
      if (group === 'PENDING' || group === 'APPROVED' || group === 'REJECTED') {
        base[group] += 1;
      }
    });
    return base;
  }, [requests]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return requests;
    return requests.filter(item => leaveStatusGroup(item) === filter);
  }, [requests, filter]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  if (!requests.length) {
    return <Empty title="No Leave Requests" text="Submitted leave requests will appear here." icon="calendar-outline" />;
  }

  const filters: {key: typeof filter; label: string}[] = [
    {key: 'ALL', label: `All (${counts.ALL})`},
    {key: 'PENDING', label: `Pending (${counts.PENDING})`},
    {key: 'APPROVED', label: `Approved (${counts.APPROVED})`},
    {key: 'REJECTED', label: `Rejected (${counts.REJECTED})`},
  ];

  return (
    <>
      <View style={styles.leaveFilterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            onPress={() => {
              setFilter(f.key);
              setVisibleCount(LEAVE_HISTORY_PAGE_SIZE);
            }}
            style={[styles.leaveFilterChip, filter === f.key && styles.leaveFilterChipActive]}>
            <Text style={[styles.leaveFilterText, filter === f.key && styles.leaveFilterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.leaveListHead}>
        <Text style={styles.leaveListHeadLeft}>Date / Leave Type</Text>
        <View style={styles.leaveListHeadRight}>
          <Text style={styles.leaveListHeadStatus}>Status</Text>
          <Icon name="filter-outline" size={19} color={colors.textMid} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Empty title="No matching requests" text="Try a different filter above." icon="filter-outline" />
      ) : (
        <>
          {visible.map(item => (
            <LeaveHistoryEntry
              key={String(field(item, ['id', 'requestId', 'startDate']))}
              item={item}
            />
          ))}
          {remaining > 0 && (
            <Pressable onPress={() => setVisibleCount(v => v + LEAVE_HISTORY_PAGE_SIZE)} style={styles.showMoreButton}>
              <Text style={styles.showMoreText}>Show {Math.min(LEAVE_HISTORY_PAGE_SIZE, remaining)} more</Text>
              <Icon name="chevron-down-outline" size={14} color={colors.primary} />
            </Pressable>
          )}
          {remaining <= 0 && filtered.length > LEAVE_HISTORY_PAGE_SIZE && (
            <Pressable onPress={() => setVisibleCount(LEAVE_HISTORY_PAGE_SIZE)} style={styles.showMoreButton}>
              <Text style={styles.showMoreText}>Show less</Text>
              <Icon name="chevron-up-outline" size={14} color={colors.primary} />
            </Pressable>
          )}
        </>
      )}
    </>
  );
}

function LeaveHistoryEntry({item}: {item: any}) {
  const startDate = field(item, ['startDate', 'fromDate'], '');
  const endDate = field(item, ['endDate', 'toDate'], '');
  const parsed = new Date(`${String(startDate).slice(0, 10)}T12:00:00`);
  const validDate = !Number.isNaN(parsed.getTime());
  const days = field(item, ['requestedDays', 'days', 'totalDays'], '-');
  const reason = field(item, ['reason', 'remarks', 'description'], '');
  const status = field(item, ['status', 'approvalStatus'], 'REQUESTED');
  const tone = statusTone(status);

  return (
    <Pressable style={({pressed}) => [styles.leaveHistoryPressable, pressed && styles.pressed]}>
      <View style={styles.leaveHistoryEntry}>
        <View style={styles.leaveDateColumn}>
          <Text style={styles.leaveDateDay}>{validDate ? parsed.getDate() : '-'}</Text>
          <Text style={styles.leaveDateMonth}>{validDate ? parsed.toLocaleString('en-US', {month: 'short'}).toUpperCase() : ''}</Text>
          <Text style={styles.leaveDateYear}>{validDate ? parsed.getFullYear() : ''}</Text>
        </View>
        <View style={styles.leaveEntryDivider} />
        <View style={styles.leaveEntryCopy}>
          <View style={styles.leaveEntryTitleRow}>
            <Text style={styles.leaveEntryTitle} numberOfLines={1}>{field(item, ['leaveTypeName', 'typeName', 'name'])}</Text>
            <View style={[styles.leaveStatusPill, {backgroundColor: tone.bg}]}>
              <View style={[styles.leaveStatusDot, {backgroundColor: tone.fg}]} />
              <Text style={[styles.leaveStatusText, {color: tone.fg}]}>{String(status).replace(/_/g, ' ')}</Text>
            </View>
            <Icon name="chevron-forward-outline" size={19} color={colors.muted} />
          </View>
          <View style={styles.leaveEntryMetaRow}>
            <Icon name="calendar-outline" size={15} color={colors.muted} />
            <Text style={styles.leaveEntryMeta} numberOfLines={1}>{dateText(startDate)} – {dateText(endDate)}</Text>
          </View>
          <View style={styles.leaveEntryMetaRow}>
            <Icon name="time-outline" size={15} color={colors.muted} />
            <Text style={styles.leaveEntryMeta}>{days} day{Number(days) === 1 ? '' : 's'}</Text>
          </View>
          {!!reason && reason !== '-' && (
            <View style={styles.leaveEntryMetaRow}>
              <Icon name="document-text" size={15} color={colors.muted} />
              <Text style={styles.leaveEntryMeta} numberOfLines={2}>{reason}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function loanStatusGroup(item: any): 'PENDING' | 'APPROVED' | 'REJECTED' | 'OTHER' {
  const text = String(field(item, ['status'], '')).toUpperCase();
  if (text === 'PENDING') return 'PENDING';
  if (text === 'APPROVED') return 'APPROVED';
  if (text === 'REJECTED') return 'REJECTED';
  return 'OTHER';
}

function loanTypeLabel(value: string) {
  return LOAN_TYPES.find(type => type.value === value)?.label || value;
}

function LoanRequestForm({onSubmit, submitting}: {onSubmit: (values: {loanType: string; amount: string; installments: string; reason: string}) => void; submitting: boolean}) {
  const [loanType, setLoanType] = useState(LOAN_TYPES[0].value);
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Card style={styles.formCard}>
      <SectionTitle title="Request a Loan" subtitle="Submit a loan, advance, or fine request" icon="cash-outline" />
      <Text style={styles.inputLabel}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leaveTypeRow}>
        {LOAN_TYPES.map(type => {
          const selected = loanType === type.value;
          return (
            <Pressable key={type.value} onPress={() => setLoanType(type.value)} style={[styles.leaveType, selected && styles.leaveTypeActive]}>
              <Text style={[styles.leaveTypeText, selected && styles.leaveTypeTextActive]}>{type.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.inputLabel}>Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Requested amount"
        placeholderTextColor={colors.subtle}
        keyboardType="numeric"
        style={styles.input}
      />
      <Text style={styles.inputLabel}>Installments</Text>
      <TextInput
        value={installments}
        onChangeText={setInstallments}
        placeholder="Number of installments"
        placeholderTextColor={colors.subtle}
        keyboardType="numeric"
        style={styles.input}
      />
      <Text style={styles.inputLabel}>Reason</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Reason for the request"
        placeholderTextColor={colors.subtle}
        multiline
        style={[styles.input, styles.reasonInput]}
      />
      <PrimaryButton title="Submit Loan Request" loading={submitting} onPress={() => onSubmit({loanType, amount, installments, reason})} />
    </Card>
  );
}

function LoanHistoryList({requests}: {requests: any[]}) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const counts = useMemo(() => {
    const base = {ALL: requests.length, PENDING: 0, APPROVED: 0, REJECTED: 0};
    requests.forEach(item => {
      const group = loanStatusGroup(item);
      if (group === 'PENDING' || group === 'APPROVED' || group === 'REJECTED') {
        base[group] += 1;
      }
    });
    return base;
  }, [requests]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return requests;
    return requests.filter(item => loanStatusGroup(item) === filter);
  }, [requests, filter]);

  if (!requests.length) {
    return <Empty title="No Loan Requests" text="Submitted loan requests will appear here." icon="cash-outline" />;
  }

  const filters: {key: typeof filter; label: string}[] = [
    {key: 'ALL', label: `All (${counts.ALL})`},
    {key: 'PENDING', label: `Pending (${counts.PENDING})`},
    {key: 'APPROVED', label: `Approved (${counts.APPROVED})`},
    {key: 'REJECTED', label: `Rejected (${counts.REJECTED})`},
  ];

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leaveFilterRow}>
        {filters.map(f => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.leaveFilterChip, filter === f.key && styles.leaveFilterChipActive]}>
            <Text style={[styles.leaveFilterText, filter === f.key && styles.leaveFilterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <Empty title="No matching requests" text="Try a different filter above." icon="filter-outline" />
      ) : (
        filtered.map(item => (
          <RecordCard
            key={String(field(item, ['id'], ''))}
            title={loanTypeLabel(field(item, ['loanType'], ''))}
            subtitle={money(field(item, ['requestedAmount'], ''), '')}
            meta={[
              field(item, ['requestedInstallments'], '') ? `${field(item, ['requestedInstallments'], '')} installments` : '',
              field(item, ['reason'], ''),
              field(item, ['reviewRemarks'], ''),
            ]
              .filter(Boolean)
              .join('  •  ')}
            status={field(item, ['status'], '')}
          />
        ))
      )}
    </>
  );
}

export default function HomeScreen({onRootChange}: {onRootChange?: (isRoot: boolean) => void}) {
  const insets = useSafeAreaInsets();
  const {user, profile, refreshProfile} = useAuth();
  const [active, setActive] = useState<ModuleKey>('overview');
  const [clock, setClock] = useState<any>(null);
  const [workInfo, setWorkInfo] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [carrTasks, setCarrTasks] = useState<any[]>([]);
  const [carrTaskTarget, setCarrTaskTarget] = useState<any>(null);
  const [carrProgress, setCarrProgress] = useState('0');
  const [carrComment, setCarrComment] = useState('');
  const [savingCarrTask, setSavingCarrTask] = useState(false);
  const [loanRequests, setLoanRequests] = useState<any[]>([]);
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<any>(null);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [lastDocumentUpload, setLastDocumentUpload] = useState('');
  const [regularisationTarget, setRegularisationTarget] = useState<any>(null);
  const [regularisationType, setRegularisationType] = useState(REGULARISATION_TYPES[1].value);
  const [regularisationReason, setRegularisationReason] = useState('');
  const [regularisationCheckIn, setRegularisationCheckIn] = useState('09:00');
  const [submittingRegularisation, setSubmittingRegularisation] = useState(false);
  const [attendanceFrom, setAttendanceFrom] = useState('');
  const [attendanceTo, setAttendanceTo] = useState('');
  const [appliedAttendanceFrom, setAppliedAttendanceFrom] = useState('');
  const [appliedAttendanceTo, setAppliedAttendanceTo] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const load = useCallback(async () => {
    const network = await NetInfo.fetch();
    setOnline(Boolean(network.isConnected));
    if (!network.isConnected) {
      return;
    }

    const results = await Promise.allSettled([
      api.clockStatus(),
      api.workInfo(),
      api.documentRequests(),
      api.attendanceFullView({from: earliestRegularisationDateKey(), to: todayDateKey(), size: 50}),
      api.myLeave(),
      api.leaveTypes(),
      api.leaveBalance(),
      api.myPayslips(),
      api.holidays(),
      api.announcements(),
      api.carrMyTasks(),
      api.myLoanRequests(),
      refreshProfile(),
    ]);

    const [clockRes, workRes, docsRes, attendanceRes, leaveRes, typesRes, balanceRes, paysRes, holidayRes, announcementsRes, carrTasksRes, loansRes] = results;
    if (clockRes.status === 'fulfilled') setClock(clockRes.value);
    if (workRes.status === 'fulfilled') setWorkInfo(workRes.value);
    if (docsRes.status === 'fulfilled') setDocuments(asArray(docsRes.value));
    if (attendanceRes.status === 'fulfilled') setAttendance(asArray(attendanceRes.value));
    if (leaveRes.status === 'fulfilled') setLeaveRequests(asArray(leaveRes.value));
    if (typesRes.status === 'fulfilled') {
      const items = asArray(typesRes.value);
      setLeaveTypes(items);
      setSelectedLeaveType((current: any) => current || items[0] || null);
    }
    if (balanceRes.status === 'fulfilled') setLeaveBalance(asArray(balanceRes.value));
    if (paysRes.status === 'fulfilled') setPayslips(asArray(paysRes.value));
    if (holidayRes.status === 'fulfilled') setHolidays(asArray(holidayRes.value));
    if (announcementsRes.status === 'fulfilled') setAnnouncements(asArray(announcementsRes.value));
    if (carrTasksRes.status === 'fulfilled') setCarrTasks(asArray(carrTasksRes.value));
    if (loansRes.status === 'fulfilled') setLoanRequests(asArray(loansRes.value));
  }, [refreshProfile]);

  // The original screen only filtered the one-month default dataset in memory.
  // Fetch the selected range from the same full-view endpoint used by web so a
  // filter can return older attendance as well.
  useEffect(() => {
    if (!appliedAttendanceFrom && !appliedAttendanceTo) return;

    let current = true;
    const timeout = setTimeout(async () => {
      setAttendanceLoading(true);
      try {
        const result = await api.attendanceFullView({
          ...(appliedAttendanceFrom ? {from: appliedAttendanceFrom} : {}),
          ...(appliedAttendanceTo ? {to: appliedAttendanceTo} : {}),
          size: 500,
        });
        if (current) setAttendance(asArray(result));
      } catch (err: any) {
        if (current) Alert.alert('Attendance', err.message || 'Unable to load attendance for this date range.');
      } finally {
        if (current) setAttendanceLoading(false);
      }
    }, 250);

    return () => {
      current = false;
      clearTimeout(timeout);
    };
  }, [appliedAttendanceFrom, appliedAttendanceTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onRootChange?.(active === 'overview');
  }, [active, onRootChange]);

  const upcomingHolidays = useMemo(
    () =>
      holidays
        .filter(item => {
          const raw = field(item, ['date', 'holidayDate', 'startDate'], '');
          const date = raw ? new Date(raw) : null;
          return date && !Number.isNaN(date.getTime()) && date >= new Date(new Date().toDateString());
        })
        .slice(0, 6),
    [holidays],
  );

  const filteredAttendance = useMemo(() => {
    const from = appliedAttendanceFrom.trim();
    const to = appliedAttendanceTo.trim();
    const records = !from && !to
      ? attendance
      : attendance.filter(item => {
          const date = String(field(item, ['attendanceDate', 'date', 'createdAt'], '')).slice(0, 10);
          if (!date) return false;
          if (from && date < from) return false;
          if (to && date > to) return false;
          return true;
        });

    return [...records].sort((a, b) => attendanceTime(b) - attendanceTime(a));
  }, [attendance, appliedAttendanceFrom, appliedAttendanceTo]);

  const attendanceSections = useMemo(() => {
    if (appliedAttendanceFrom || appliedAttendanceTo) {
      return [{title: 'Filtered results', records: filteredAttendance}];
    }

    const grouped = new Map<string, any[]>([
      ['Today', []],
      ['Yesterday', []],
      ['Earlier', []],
    ]);
    filteredAttendance.forEach(record => grouped.get(relativeAttendanceDay(record))?.push(record));
    return Array.from(grouped.entries())
      .filter(([, records]) => records.length)
      .map(([title, records]) => ({title, records}));
  }, [filteredAttendance, appliedAttendanceFrom, appliedAttendanceTo]);

  const todayRecord = useMemo(
    () => attendance.find(item => item?.attendanceDate === todayKey()) || null,
    [attendance],
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function submitLeave(values: {startDate: string; endDate: string; reason: string}) {
    if (!selectedLeaveType) {
      Alert.alert('Leave Request', 'Please select a leave type.');
      return;
    }
    if (!values.startDate || !values.endDate) {
      Alert.alert('Leave Request', 'Please enter start date and end date.');
      return;
    }
    if (values.endDate < values.startDate) {
      Alert.alert('Leave Request', 'End date cannot be before start date.');
      return;
    }
    if (values.startDate < earliestLeaveDateKey()) {
      Alert.alert('Leave Request', `Leave can only be applied up to 2 months in the past (from ${earliestLeaveDateKey()}).`);
      return;
    }

    setSubmittingLeave(true);
    try {
      const leaveTypeId = field(selectedLeaveType, ['id', 'leaveTypeId'], '');
      await api.applyLeave({
        leaveTypeId,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
      });
      Alert.alert('Leave Request', 'Leave request submitted successfully.');
      await load();
      setActive('leave');
    } catch (err: any) {
      Alert.alert('Leave Request', err.message || 'Unable to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
  }

  async function submitLoan(values: {loanType: string; amount: string; installments: string; reason: string}) {
    const amount = Number(values.amount);
    const installments = Number(values.installments);
    if (!amount || amount <= 0) {
      Alert.alert('Loan Request', 'Please enter a valid amount.');
      return;
    }
    if (!installments || installments <= 0) {
      Alert.alert('Loan Request', 'Please enter a valid number of installments.');
      return;
    }

    setSubmittingLoan(true);
    try {
      await api.submitLoanRequest({
        loanType: values.loanType,
        requestedAmount: amount,
        requestedInstallments: installments,
        reason: values.reason,
      });
      setLoanModalVisible(false);
      Alert.alert('Loan Request', 'Loan request submitted successfully.');
      await load();
    } catch (err: any) {
      Alert.alert('Loan Request', err.message || 'Unable to submit loan request.');
    } finally {
      setSubmittingLoan(false);
    }
  }

  async function chooseDocument() {
    setUploadingDocument(true);
    try {
      const [file] = await pick({type: [types.allFiles], allowMultiSelection: false});
      const result = await api.uploadDocument(uploadFile(file));
      setLastDocumentUpload(result?.path || file?.name || '');
      const latestDocuments = await api.documentRequests();
      setDocuments(asArray(latestDocuments));
      Alert.alert('Uploaded', result?.path || 'Document uploaded successfully.');
    } catch (err: any) {
      if (!String(err?.message || '').toLowerCase().includes('cancel')) {
        Alert.alert('Upload Failed', err.message || 'Unable to upload document.');
      }
    } finally {
      setUploadingDocument(false);
    }
  }

  async function submitRegularisation() {
    if (!regularisationTarget) {
      Alert.alert('Regularisation', 'Select an attendance date first.');
      return;
    }
    if (!regularisationReason.trim()) {
      Alert.alert('Regularisation', 'Please enter a reason.');
      return;
    }
    setSubmittingRegularisation(true);
    try {
      const isVirtualDate = !regularisationTarget.id;
      if (isVirtualDate && !/^([01]\d|2[0-3]):[0-5]\d$/.test(regularisationCheckIn)) {
        Alert.alert('Regularisation', 'Enter a valid check-in time in HH:MM format.');
        return;
      }
      await api.submitRegularisationRequest(isVirtualDate
        ? {
            attendanceDate: field(regularisationTarget, ['attendanceDate', 'date']),
            requestType: 'MISSING_PUNCH',
            requestedCheckIn: regularisationCheckIn,
            reason: regularisationReason.trim(),
          }
        : {
            attendanceId: regularisationTarget.id,
            requestType: regularisationType,
            reason: regularisationReason.trim(),
          });
      setRegularisationTarget(null);
      setRegularisationReason('');
      setRegularisationCheckIn('09:00');
      setRegularisationType(REGULARISATION_TYPES[1].value);
      await load();
      Alert.alert('Regularisation', 'Request submitted successfully.');
    } catch (err: any) {
      Alert.alert('Regularisation', err.message || 'Failed to submit request.');
    } finally {
      setSubmittingRegularisation(false);
    }
  }

  function openRegularisationRequest(record: any) {
    setRegularisationTarget(record);
    setRegularisationType(record?.id ? REGULARISATION_TYPES[1].value : 'MISSING_PUNCH');
    setRegularisationCheckIn('09:00');
    setActive('attendance');
  }

  function renderOverview() {
    const statusText = clock?.online ? 'Checked in' : 'Not checked in';
    const latestAnnouncement = announcements
      .filter(item => !String(field(item, ['expiresOn', 'expiryDate'], '')).slice(0, 10) || String(field(item, ['expiresOn', 'expiryDate'], '')).slice(0, 10) >= todayDateKey())
      .sort((a, b) => String(field(b, ['createdAt', 'publishedAt'], '')).localeCompare(String(field(a, ['createdAt', 'publishedAt'], ''))))[0];

    return (
      <>
        <View style={styles.homeAttendanceCard}>
          <View style={styles.homeAttendanceTop}>
            <View style={styles.homeAttendanceHeading}>
              <View style={styles.homeAttendanceIcon}><Icon name="radio-outline" size={24} color={colors.primary} /></View>
              <View>
                <Text style={styles.homeAttendanceTitle}>Today Attendance</Text>
                <Text style={styles.homeAttendanceSub}>Current status for your workday</Text>
              </View>
            </View>
            <View style={[styles.homeStatusPill, {backgroundColor: clock?.online ? colors.successLight : colors.dangerLight}]}>
              <View style={[styles.statusDot, {backgroundColor: clock?.online ? colors.success : colors.danger}]} />
              <Text style={[styles.homeStatusText, {color: clock?.online ? colors.success : colors.danger}]}>{statusText}</Text>
            </View>
          </View>
          <View style={styles.homeAttendanceMetrics}>
            <HomeMetric icon="log-in-outline" label="Check In" value={timeText(clock?.checkIn)} tone="success" />
            <HomeMetric icon="log-out-outline" label="Check Out" value={timeText(clock?.checkOut)} tone="danger" />
            <HomeMetric icon="stopwatch-outline" label="Hours Worked" value={hoursWorked(todayRecord, clock)} tone="purple" />
            <HomeMetric icon="calendar-outline" label="Shift" value={profile?.shiftName || workInfo?.shiftName || 'General'} tone="info" />
          </View>
        </View>
        <View style={styles.modulesHead}>
          <Text style={styles.modulesTitle}>Quick Actions</Text>
          <Pressable onPress={() => setActive('attendance')} style={styles.viewAllLink}>
            <Text style={styles.viewAllText}>View all</Text><Icon name="chevron-forward-outline" size={17} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.featureGrid}>
          <FeatureTile icon="analytics" label="Attendance" description="Track your attendance" onPress={() => setActive('attendance')} />
          <FeatureTile icon="paper-plane" label="Leave" description="Manage leave requests" tone="purple" onPress={() => setActive('leave')} />
          <FeatureTile icon="document-text" label="Documents" description="Employee documents" tone="info" onPress={() => setActive('documents')} />
          <FeatureTile icon="time" label="Hours" description="Track work hours" tone="warning" onPress={() => setActive('hours')} />
          <FeatureTile icon="sunny" label="Holidays" description="View holiday calendar" tone="success" onPress={() => setActive('holidays')} />
          <FeatureTile icon="megaphone" label="Announcements" description="Company news and updates" tone="info" onPress={() => setActive('announcements')} />
          <FeatureTile icon="checkmark-circle" label="CAR Tasks" description="Responsibilities and progress" tone="primary" onPress={() => setActive('carr')} />
          <FeatureTile icon="wallet" label="Payslips" description="Salary documents" tone="success" onPress={() => setActive('payslips')} />
        </View>

        <Pressable onPress={() => setActive('announcements')} style={({pressed}) => [styles.homeAnnouncementCard, pressed && styles.pressed]}>
          <View style={styles.homeAnnouncementHead}>
            <View style={styles.homeAnnouncementIcon}><Icon name="megaphone-outline" size={23} color={colors.primary} /></View>
            <View style={styles.homeAnnouncementCopy}>
              <Text style={styles.homeAnnouncementTitle}>Latest Announcements</Text>
              <Text style={styles.homeAnnouncementSub}>Stay updated with company news</Text>
            </View>
            <Text style={styles.viewAllText}>View all</Text>
          </View>
          <View style={styles.homeAnnouncementBody}>
            <Icon name="megaphone-outline" size={21} color={colors.primary} />
            <View style={styles.homeAnnouncementCopy}>
              <Text style={styles.homeAnnouncementBodyTitle} numberOfLines={1}>{latestAnnouncement ? field(latestAnnouncement, ['title', 'subject'], 'Announcement') : 'No new announcements'}</Text>
              <Text style={styles.homeAnnouncementBodyText} numberOfLines={2}>{latestAnnouncement ? field(latestAnnouncement, ['description', 'message', 'content'], 'Open to read the update.') : 'You’re all caught up. Check back later for updates.'}</Text>
            </View>
          </View>
        </Pressable>
      </>
    );
  }

  function renderAttendance() {
    return (
      <>
        <View style={styles.attendanceFilter}>
          <View style={styles.attendanceFilterHead}>
            <View style={styles.attendanceFilterIcon}>
              <Icon name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.attendanceFilterCopy}>
              <Text style={styles.attendanceFilterTitle}>Find a date</Text>
              <Text style={styles.attendanceFilterSub}>Use a date range to view attendance history</Text>
            </View>
          </View>
          <View style={styles.dateFilterRow}>
            <View style={styles.dateFilterField}>
              <CalendarDateField
                label="From"
                value={attendanceFrom}
                onChange={value => {
                  setAttendanceFrom(value);
                  if (attendanceTo && value > attendanceTo) setAttendanceTo(value);
                }}
                minDate={null}
                maxDate={todayDateKey()}
                variant="filter"
              />
            </View>
            <View style={styles.dateFilterField}>
              <CalendarDateField
                label="To"
                value={attendanceTo}
                onChange={value => {
                  setAttendanceTo(value);
                  if (attendanceFrom && value < attendanceFrom) setAttendanceFrom(value);
                }}
                minDate={null}
                maxDate={todayDateKey()}
                variant="filter"
              />
            </View>
            <Pressable
              onPress={() => {
                if (!attendanceFrom && !attendanceTo) {
                  Alert.alert('Attendance', 'Select at least one date to search.');
                  return;
                }
                setAppliedAttendanceFrom(attendanceFrom);
                setAppliedAttendanceTo(attendanceTo);
              }}
              style={({pressed}) => [styles.dateFilterSearch, pressed && styles.pressed]}>
              <Icon name="search-outline" size={20} color={colors.white} />
              <Text style={styles.dateFilterSearchText}>Search</Text>
            </Pressable>
          </View>
          {(attendanceFrom || attendanceTo) && (
            <Pressable
              onPress={() => {
                setAttendanceFrom('');
                setAttendanceTo('');
                setAppliedAttendanceFrom('');
                setAppliedAttendanceTo('');
                void load();
              }}
              style={styles.clearFilterButton}>
              <Icon name="close-outline" size={15} color={colors.primary} />
              <Text style={styles.clearFilterText}>Clear filter</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.attendanceHistoryHead}>
          <View>
            <Text style={styles.attendanceHistoryTitle}>Attendance</Text>
            <Text style={styles.attendanceHistorySub}>{attendanceLoading ? 'Loading selected dates…' : `${filteredAttendance.length} record${filteredAttendance.length === 1 ? '' : 's'} found`}</Text>
          </View>
          {(appliedAttendanceFrom || appliedAttendanceTo) && <Pill text="Filtered" />}
        </View>

        {filteredAttendance.length ? (
          attendanceSections.map(section => (
            <View style={styles.attendanceSection} key={section.title}>
              <Text style={styles.attendanceSectionTitle}>{section.title}</Text>
              <View style={styles.attendanceList}>
                {section.records.map(item => (
                  <AttendanceEntry
                    key={String(field(item, ['id', 'attendanceDate', 'date']))}
                    record={item}
                    onRegularise={openRegularisationRequest}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <Empty title="No Attendance Records" text="Try changing the date range to view older attendance." icon="calendar-clear-outline" />
        )}

        {renderRegularisationModal()}
      </>
    );
  }

  function renderRegularisationModal() {
    return (
      <Modal visible={!!regularisationTarget} animationType="slide" transparent onRequestClose={() => setRegularisationTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Pressable onPress={() => setRegularisationTarget(null)} style={styles.modalClose}>
              <Icon name="close-outline" size={20} color={colors.textMid} />
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionTitle title="Request Regularisation" subtitle={dateText(field(regularisationTarget, ['attendanceDate', 'date'], ''))} icon="create-outline" />
              {regularisationTarget?.id && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regularisationTypeRow}>
                {REGULARISATION_TYPES.map(type => (
                  <Pressable
                    key={type.value}
                    onPress={() => setRegularisationType(type.value)}
                    style={[styles.regularisationChip, regularisationType === type.value && styles.regularisationChipActive]}>
                    <Text style={[styles.regularisationChipText, regularisationType === type.value && styles.regularisationChipTextActive]}>
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>}
              {!regularisationTarget?.id && <>
                <Text style={styles.inlineHelp}>A missing-attendance request will be sent for this date. HR approval is required.</Text>
                <Text style={styles.inputLabel}>Check-in time</Text>
                <TextInput value={regularisationCheckIn} onChangeText={setRegularisationCheckIn} placeholder="09:00" placeholderTextColor={colors.subtle} style={styles.input} />
              </>}
              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                value={regularisationReason}
                onChangeText={setRegularisationReason}
                placeholder="Reason for correction"
                placeholderTextColor={colors.subtle}
                multiline
                style={[styles.input, styles.reasonInput]}
              />
              <View style={styles.regularisationActions}>
                <PrimaryButton title="Submit Request" loading={submittingRegularisation} onPress={submitRegularisation} />
                <PrimaryButton title="Cancel" variant="outline" onPress={() => setRegularisationTarget(null)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderLeave() {
    return (
      <LeaveHistoryList requests={leaveRequests} />
    );
  }

  function renderLeaveRequestPage() {
    return (
      <>
        <Card style={styles.panel}>
          <SectionTitle title="Leave Balance" subtitle="Available vs. used leave by type" icon="pie-chart-outline" />
          {leaveBalance.length ? (
            <View style={styles.leaveBalanceList}>
              {leaveBalance.map(item => (
                <LeaveBalanceCard key={String(field(item, ['leaveTypeId', 'id', 'leaveTypeName']))} item={item} />
              ))}
            </View>
          ) : (
            <Empty title="No Leave Balance" text="Leave balances will appear once HR updates them." icon="pie-chart-outline" />
          )}
        </Card>

        <LeaveRequestForm
          leaveTypes={leaveTypes}
          selectedLeaveType={selectedLeaveType}
          setSelectedLeaveType={setSelectedLeaveType}
          onSubmit={submitLeave}
          submitting={submittingLeave}
        />
      </>
    );
  }

  function renderPayslips() {
    if (!payslips.length) {
      return <Empty fullPage title="No Payslips Available" text="Your salary slips will appear here after payroll is processed." icon="wallet-outline" />;
    }

    return (
      <View style={styles.plainList}>
        {payslips.slice(0, 12).map(item => (
          <Pressable key={String(field(item, ['id', 'payrollId', 'month']))} onPress={() => setSelectedPayslip(item)} style={({pressed}) => pressed && styles.pressed}>
            <RecordCard
              title={field(item, ['monthName', 'month', 'payPeriod'], 'Payslip')}
              subtitle={`Gross ${money(field(item, ['grossPay', 'grossSalary', 'totalEarnings'], ''), profile?.currencySymbol || '')}`}
              meta={`Net ${money(field(item, ['netPay', 'netSalary', 'payableAmount'], ''), profile?.currencySymbol || '')}`}
              status={field(item, ['status', 'paymentStatus'], '')}
            >
              <Text style={styles.openPayslipText}>Tap to open payslip</Text>
            </RecordCard>
          </Pressable>
        ))}
        <Modal visible={!!selectedPayslip} animationType="slide" transparent onRequestClose={() => setSelectedPayslip(null)}>
          <View style={styles.modalOverlay}><View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Pressable onPress={() => setSelectedPayslip(null)} style={styles.modalClose}><Icon name="close-outline" size={20} color={colors.textMid} /></Pressable>
            <ScrollView showsVerticalScrollIndicator={false}>
              <SectionTitle title={field(selectedPayslip, ['monthName', 'month', 'payPeriod'], 'Payslip')} subtitle="Salary statement" icon="wallet-outline" />
              <Card style={styles.payslipDetailCard}>
                <FieldRow label="Period" value={`${dateText(field(selectedPayslip, ['startDate'], ''))} to ${dateText(field(selectedPayslip, ['endDate'], ''))}`} />
                <FieldRow label="Basic Pay" value={money(field(selectedPayslip, ['basicPay', 'basicSalary'], ''), profile?.currencySymbol || '')} />
                <FieldRow label="Allowances" value={money(field(selectedPayslip, ['totalAllowances', 'allowances'], ''), profile?.currencySymbol || '')} />
                <FieldRow label="Deductions" value={money(field(selectedPayslip, ['totalDeductions', 'deductions'], ''), profile?.currencySymbol || '')} />
                <FieldRow label="Gross Pay" value={money(field(selectedPayslip, ['grossPay', 'grossSalary', 'totalEarnings'], ''), profile?.currencySymbol || '')} />
                <FieldRow label="Net Pay" value={money(field(selectedPayslip, ['netPay', 'netSalary', 'payableAmount'], ''), profile?.currencySymbol || '')} />
                <FieldRow label="Status" value={field(selectedPayslip, ['status', 'paymentStatus'], '')} />
                <FieldRow label="Pay Date" value={dateText(field(selectedPayslip, ['payDate', 'paymentDate'], ''))} />
              </Card>
              <PrimaryButton title="Close" variant="outline" onPress={() => setSelectedPayslip(null)} />
            </ScrollView>
          </View></View>
        </Modal>
      </View>
    );
  }

  function renderDocuments() {
    return (
      <>
        <Card style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="cloud-upload-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Add Document</Text>
              <Text style={styles.sectionSub}>Upload employee files directly to HRMS</Text>
            </View>
          </View>
          <Text style={styles.documentHelp}>Choose PDF, image, or office documents from your device.</Text>
          <PrimaryButton title="Upload Document" onPress={chooseDocument} loading={uploadingDocument} />
          {!!lastDocumentUpload && <Text style={styles.uploadPath}>Last upload: {lastDocumentUpload}</Text>}
        </Card>

        {documents.length ? (
          <Card style={styles.documentCard}>
            {documents.map(item => (
              <View key={String(field(item, ['id', 'requestId', 'documentType', 'fileName']))} style={styles.documentRow}>
                <View style={styles.documentRowIcon}>
                  <Icon name="document-text-outline" size={18} color={colors.info} />
                </View>
                <View style={styles.documentRowText}>
                  <Text style={styles.documentTitle} numberOfLines={1}>
                    {field(item, ['documentType', 'name', 'title', 'fileName'], 'Document')}
                  </Text>
                  <Text style={styles.documentSub} numberOfLines={2}>
                    {field(item, ['description', 'fileName', 'remarks', 'path'], 'Employee document')}
                  </Text>
                  <Text style={styles.documentDate}>{dateText(field(item, ['createdAt', 'uploadedAt', 'requestedAt'], ''))}</Text>
                </View>
                <Pill text={field(item, ['status', 'requestStatus'], '')} />
              </View>
            ))}
          </Card>
        ) : (
          <Empty title="No Documents Available" text="Uploaded and requested documents will appear here." icon="document-attach-outline" />
        )}
      </>
    );
  }

  function renderHours() {
    const expected = field(workInfo, ['dailyHours', 'workingHours', 'shiftHours'], profile?.shiftHours || '-');
    return (
      <>
        <View style={styles.metricsRow}>
          <Metric label="Today" value={workDuration(clock?.atWorkSecond)} icon="timer-outline" tone="info" />
          <Metric label="Expected" value={expected} icon="business-outline" tone="primary" />
        </View>
        <Card style={styles.panel}>
          <SectionTitle title="Hours & Shift" subtitle="Work schedule and time summary" icon="time-outline" />
          <FieldRow label="Shift" value={profile?.shiftName || workInfo?.shiftName} />
          <FieldRow label="Work Type" value={profile?.workTypeName || workInfo?.workTypeName} />
          <FieldRow label="Check In" value={timeText(clock?.checkIn)} />
          <FieldRow label="Check Out" value={timeText(clock?.checkOut)} />
          <FieldRow label="At Work" value={workDuration(clock?.atWorkSecond)} />
          <FieldRow label="Expected Hours" value={expected} />
        </Card>
      </>
    );
  }

  function renderLoans() {
    return (
      <>
        <Card style={styles.panel}>
          <SectionTitle
            title="Loan History"
            subtitle={loanRequests.length ? `${loanRequests.length} request${loanRequests.length === 1 ? '' : 's'} total` : 'Track your loan requests'}
            icon="cash-outline"
          />
          <LoanHistoryList requests={loanRequests} />
        </Card>

        <Modal visible={loanModalVisible} animationType="slide" transparent onRequestClose={() => setLoanModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Pressable onPress={() => setLoanModalVisible(false)} style={styles.modalClose}>
                <Icon name="close-outline" size={20} color={colors.textMid} />
              </Pressable>
              <ScrollView showsVerticalScrollIndicator={false}>
                <LoanRequestForm onSubmit={submitLoan} submitting={submittingLoan} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  function renderHolidays() {
    const displayedHolidays = upcomingHolidays.length ? upcomingHolidays : holidays.slice(0, 10);
    return (
      <>
        {displayedHolidays.length ? (
          <View style={styles.holidayList}>
          {displayedHolidays.map(item => (
            <RecordCard
              key={String(field(item, ['id', 'holidayId', 'holidayDate', 'date']))}
              title={field(item, ['holidayName', 'name', 'description'], 'Holiday')}
              subtitle={dateText(field(item, ['holidayDate', 'date', 'startDate'], ''))}
              meta={field(item, ['type', 'branchName', 'companyName'], '')}
            />
          ))
          }</View>
        ) : (
          <View style={styles.holidayEmpty}>
            <View style={styles.holidayEmptyIcon}>
              <Icon name="calendar-clear-outline" size={30} color={colors.primary} />
            </View>
            <Text style={styles.holidayEmptyTitle}>No published holidays</Text>
            <Text style={styles.holidayEmptyText}>Your company has not added holidays to its calendar yet.</Text>
          </View>
        )}
      </>
    );
  }

  function renderAnnouncements() {
    const now = todayDateKey();
    const published = announcements
      .filter(item => {
        const expiry = String(field(item, ['expiresOn', 'expiryDate'], '')).slice(0, 10);
        return !expiry || expiry >= now;
      })
      .sort((a, b) => String(field(b, ['createdAt', 'publishedAt'], '')).localeCompare(String(field(a, ['createdAt', 'publishedAt'], ''))));

    if (!published.length) {
      return <Empty fullPage title="No Announcements" text="Important company updates will appear here." icon="megaphone-outline" />;
    }

    return (
      <View style={styles.plainList}>
        {published.map(item => (
          <RecordCard
            key={String(field(item, ['id', 'announcementId']))}
            title={field(item, ['title', 'subject'], 'Announcement')}
            subtitle={dateText(field(item, ['publishedAt', 'createdAt', 'date'], ''))}
            meta={field(item, ['description', 'message', 'content'], '')}
          />
        ))}
      </View>
    );
  }

  function openCarrTask(task: any) {
    setCarrTaskTarget(task);
    setCarrProgress(String(field(task, ['progress'], 0)));
    setCarrComment('');
  }

  async function saveCarrProgress(status: string) {
    if (!carrTaskTarget?.id) return;
    const progress = status === 'COMPLETED' ? 100 : Number(carrProgress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      Alert.alert('CARR Task', 'Progress must be between 0 and 100.');
      return;
    }
    setSavingCarrTask(true);
    try {
      await api.updateCarrTaskProgress(carrTaskTarget.id, {
        status,
        progress,
        comment: carrComment.trim() || null,
        workDetails: carrComment.trim() || null,
        actualCompletionDate: status === 'COMPLETED' ? todayDateKey() : null,
      });
      setCarrTaskTarget(null);
      await load();
      Alert.alert('CARR Task', 'Progress updated successfully.');
    } catch (err: any) {
      Alert.alert('CARR Task', err.message || 'Unable to update task progress.');
    } finally {
      setSavingCarrTask(false);
    }
  }

  function renderCarr() {
    const ordered = [...carrTasks].sort((a, b) => {
      const overdue = Number(Boolean(b.overdue)) - Number(Boolean(a.overdue));
      return overdue || String(field(a, ['dueDate'], '')).localeCompare(String(field(b, ['dueDate'], '')));
    });
    return (
      <>
        <Card style={styles.panel}>
          <SectionTitle title="My CARR Tasks" subtitle={`${ordered.length} assigned responsibility${ordered.length === 1 ? '' : 'ies'}`} icon="checkmark-done-outline" />
          {ordered.length ? ordered.map(task => (
            <Pressable key={String(task.id)} onPress={() => openCarrTask(task)} style={({pressed}) => [styles.carrTask, pressed && styles.pressed]}>
              <View style={styles.recordTop}>
                <View style={styles.recordText}>
                  <Text style={styles.recordTitle}>{field(task, ['title'], 'CARR responsibility')}</Text>
                  <Text style={styles.recordSub}>{field(task, ['departmentName', 'companyName'], 'Assigned responsibility')}</Text>
                </View>
                <Pill text={field(task, ['status'], 'TODO')} />
              </View>
              <Text style={styles.recordMeta}>{field(task, ['description', 'instructions'], '')}</Text>
              <View style={styles.carrProgressRow}>
                <View style={styles.carrProgressTrack}><View style={[styles.carrProgressFill, {width: `${Math.min(100, Math.max(0, Number(field(task, ['progress'], 0)) || 0))}%`}]} /></View>
                <Text style={styles.carrProgressText}>{field(task, ['progress'], 0)}%</Text>
              </View>
              <Text style={[styles.carrDueDate, task.overdue && styles.carrOverdue]}>{task.overdue ? 'Overdue' : 'Due'} {dateText(field(task, ['dueDate'], ''))}</Text>
            </Pressable>
          )) : <Empty title="No CARR Tasks" text="Assigned responsibilities will appear here." icon="checkmark-done-outline" />}
        </Card>

        <Modal visible={!!carrTaskTarget} animationType="slide" transparent onRequestClose={() => setCarrTaskTarget(null)}>
          <View style={styles.modalOverlay}><View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Pressable onPress={() => setCarrTaskTarget(null)} style={styles.modalClose}><Icon name="close-outline" size={20} color={colors.textMid} /></Pressable>
            <ScrollView keyboardShouldPersistTaps="handled">
              <SectionTitle title={field(carrTaskTarget, ['title'], 'CARR Task')} subtitle={`Due ${dateText(field(carrTaskTarget, ['dueDate'], ''))}`} icon="checkmark-done-outline" />
              <Text style={styles.recordMeta}>{field(carrTaskTarget, ['description', 'instructions'], 'No description provided.')}</Text>
              {!!field(carrTaskTarget, ['requiredDeliverables'], '') && <Text style={styles.carrDeliverable}>Deliverable: {field(carrTaskTarget, ['requiredDeliverables'], '')}</Text>}
              {(carrTaskTarget?.canUpdateProgress || carrTaskTarget?.canSubmit) ? <>
                <Text style={styles.inputLabel}>Progress (%)</Text>
                <TextInput value={carrProgress} onChangeText={setCarrProgress} keyboardType="number-pad" style={styles.input} placeholder="0 to 100" placeholderTextColor={colors.subtle} />
                <Text style={styles.inputLabel}>Work update</Text>
                <TextInput value={carrComment} onChangeText={setCarrComment} multiline style={[styles.input, styles.reasonInput]} placeholder="Describe completed work or any blocker" placeholderTextColor={colors.subtle} />
                <View style={styles.regularisationActions}>
                  <PrimaryButton title="Save Progress" loading={savingCarrTask} onPress={() => saveCarrProgress('IN_PROGRESS')} />
                  <PrimaryButton title="Mark Complete" loading={savingCarrTask} onPress={() => saveCarrProgress('COMPLETED')} />
                </View>
              </> : <Text style={styles.carrReadOnly}>This task is currently read-only for your role.</Text>}
            </ScrollView>
          </View></View>
        </Modal>
      </>
    );
  }

  function renderActiveModule() {
    if (active === 'notifications') return <NotificationsScreen onBack={() => setActive('overview')} />;
    if (active === 'helpdesk') return <HelpdeskScreen onBack={() => setActive('overview')} />;
    if (active === 'attendance') return renderAttendance();
    if (active === 'leave') return renderLeave();
    if (active === 'leaveRequest') return renderLeaveRequestPage();
    if (active === 'payslips') return renderPayslips();
    if (active === 'documents') return renderDocuments();
    if (active === 'hours') return renderHours();
    if (active === 'holidays') return renderHolidays();
    if (active === 'announcements') return renderAnnouncements();
    if (active === 'carr') return renderCarr();
    if (active === 'loans') return renderLoans();
    return renderOverview();
  }

  const homeAvatarUrl = profilePhotoUrl(profile);

  return (
    active === 'notifications' || active === 'helpdesk' ? (
      renderActiveModule()
    ) : active === 'overview' ? (
      <View className="flex-1 bg-background" style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={colors.sidebar} />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={[styles.homeTopBar, {paddingTop: insets.top + 8}]}>
          <View style={styles.topBar}>
            <Text style={styles.appTitle}>HRMS</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={() => setActive('notifications')} style={styles.headerIconButton}>
                <Icon name="notifications-outline" size={22} color={colors.white} />
              </Pressable>
              <Pressable onPress={() => setActive('helpdesk')} style={styles.headerIconButton}>
                <Icon name="help-circle-outline" size={22} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          <LinearGradient colors={['#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.homeWelcomeHero}>
            <View style={styles.homeHeroContent}>
              <View style={styles.welcomeBlock}>
                <Text style={styles.welcomeLabel}>Welcome back,</Text>
                <Text style={styles.welcomeName}>{employeeName(profile)}</Text>
                <Text style={styles.welcomeCompany}>{profile?.companyName || user?.companyName || 'GRECHA HRMS'}</Text>
              </View>
              <View style={styles.avatarBlock}>
                <View style={styles.avatarCircle}>
                  {homeAvatarUrl ? (
                    <Image source={{uri: homeAvatarUrl}} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{employeeName(profile).split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}</Text>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
          {!online && <Text style={styles.offline}>Offline mode: reconnect to refresh HRMS data.</Text>}

          {renderOverview()}
        </ScrollView>
      </View>
    ) : (
    <View className="flex-1 bg-background" style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.sidebar} />
      <View style={[styles.moduleHeaderWrap, {paddingTop: insets.top + 10}]}>
        <PageHeader
          active={active}
          onBack={() => setActive(active === 'leaveRequest' ? 'leave' : 'overview')}
          onApplyLeave={active === 'leave' ? () => setActive('leaveRequest') : undefined}
          onApplyLoan={active === 'loans' ? () => setLoanModalVisible(true) : undefined}
        />
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.moduleContent, active === 'attendance' && styles.compactAttendanceContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {!online && <Text style={styles.offline}>Offline mode: reconnect to refresh HRMS data.</Text>}

        {renderActiveModule()}
      </ScrollView>
    </View>
    )
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  // Home uses compact gutters so the cards use the available mobile width.
  content: {paddingHorizontal: 12, paddingTop: 0, paddingBottom: 30},
  moduleContent: {paddingHorizontal: 16, paddingTop: 0, paddingBottom: 30},
  compactAttendanceContent: {paddingHorizontal: 10},
  // The safe-area padding is outside PageHeader. Keep it on the same dark
  // header colour so the notch/status-bar area is not left white on Android.
  moduleHeaderWrap: {backgroundColor: colors.sidebar},
  homeTopBar: {paddingHorizontal: 16, paddingBottom: 10},
  homeWelcomeHero: {marginHorizontal: -12, marginTop: -1, marginBottom: 12, minHeight: 118, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24},
  homeHeroContent: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  appTitle: {color: colors.white, fontSize: 24, fontFamily: fonts.bold},
  headerActions: {flexDirection: 'row', gap: 8},
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  welcomeBlock: {flex: 1, minWidth: 0, marginTop: 0, marginRight: 10},
  welcomeLabel: {color: '#D7D9FF', fontSize: 16, fontFamily: fonts.medium},
  welcomeName: {color: colors.white, fontSize: 27, fontFamily: fonts.bold, marginTop: 3},
  welcomeCompany: {color: '#F1F3FF', fontSize: 15, fontFamily: fonts.medium, marginTop: 4},
  avatarBlock: {alignItems: 'center', justifyContent: 'center', width: 70, height: 70, flexShrink: 0},
  avatarCircle: {width: 62, height: 62, borderRadius: 31, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.74)'},
  avatarImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  avatarText: {color: colors.primary, fontSize: 21, fontFamily: fonts.bold},
  offline: {color: colors.warning, backgroundColor: colors.warningLight, padding: 11, borderRadius: 12, marginBottom: 12, fontWeight: '800'},
  modulesHead: {marginTop: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  modulesTitle: {color: colors.text, fontSize: 22, fontFamily: fonts.bold},
  viewAllLink: {flexDirection: 'row', alignItems: 'center'},
  viewAllText: {color: colors.primary, fontSize: 14, fontFamily: fonts.semibold},
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.sidebar,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  pageTitleWrap: {flex: 1},
  pageTitle: {color: colors.white, fontSize: 20, fontFamily: fonts.bold},
  pageSubtitle: {color: '#E0E7FF', fontSize: 12, fontFamily: fonts.medium, marginTop: 2},
  applyLeaveHeaderButton: {minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 10},
  applyLeaveHeaderText: {color: colors.primary, fontSize: 12, fontFamily: fonts.bold},
  featureGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 18},
  featureTile: {
    // Four columns made the copy and action arrow overlap on normal phone
    // widths.  Two full cards remain readable and match the intended card UI.
    flexBasis: '48.5%',
    maxWidth: '48.5%',
    minWidth: '48.5%',
    minHeight: 172,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 46,
    position: 'relative',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  pressed: {opacity: 0.72},
  featureIcon: {width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)'},
  featureLabel: {color: colors.text, fontSize: 16, lineHeight: 20, fontFamily: fonts.bold, marginTop: 12},
  featureDesc: {color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, marginTop: 4},
  // Anchor the arrow to its own card.  It must not participate in the text
  // flow, otherwise it appears in the gap between adjacent quick actions.
  openRow: {position: 'absolute', right: 12, bottom: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary},
  openText: {display: 'none'},
  // The overview content has a 12px page inset. Pull only this summary card
  // out by 6px so it reads as the primary full-width panel without touching
  // the spacing of the quick-action cards below it.
  homeAttendanceCard: {backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 11, marginHorizontal: -6, marginTop: 0, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0, shadowRadius: 0, elevation: 0},
  homeAttendanceTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8},
  homeAttendanceHeading: {flexDirection: 'row', alignItems: 'center', flex: 1, gap: 11},
  homeAttendanceIcon: {width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  homeAttendanceTitle: {color: colors.text, fontSize: 16, fontFamily: fonts.bold},
  homeAttendanceSub: {color: colors.muted, fontSize: 11, fontFamily: fonts.medium, marginTop: 2},
  homeStatusPill: {flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  homeStatusText: {fontSize: 12, fontFamily: fonts.bold},
  homeAttendanceMetrics: {flexDirection: 'row', marginTop: 10},
  homeMetric: {flex: 1, minWidth: 0, paddingHorizontal: 5, borderRightWidth: 1, borderRightColor: colors.border},
  homeMetricIcon: {width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4},
  homeMetricLabel: {color: colors.muted, fontSize: 9, fontFamily: fonts.semibold},
  homeMetricValue: {color: colors.text, fontSize: 12, fontFamily: fonts.bold, marginTop: 2},
  homeAnnouncementCard: {backgroundColor: colors.white, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 22, padding: 16, marginBottom: 14},
  homeAnnouncementHead: {flexDirection: 'row', alignItems: 'center', gap: 10},
  homeAnnouncementIcon: {width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  homeAnnouncementCopy: {flex: 1, minWidth: 0},
  homeAnnouncementTitle: {color: colors.text, fontSize: 17, fontFamily: fonts.bold},
  homeAnnouncementSub: {color: colors.muted, fontSize: 12, fontFamily: fonts.medium, marginTop: 2},
  homeAnnouncementBody: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primaryLight, borderRadius: 16, padding: 14, marginTop: 15},
  homeAnnouncementBodyTitle: {color: colors.text, fontSize: 14, fontFamily: fonts.bold},
  homeAnnouncementBodyText: {color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: fonts.medium, marginTop: 3},
  metricsRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  metric: {flex: 1, minHeight: 116},
  metricIcon: {width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10},
  metricLabel: {color: colors.muted, fontSize: 12, fontFamily: fonts.semibold, textTransform: 'uppercase'},
  metricValue: {color: colors.text, fontSize: 20, fontFamily: fonts.bold, marginTop: 5},
  attendanceFilter: {marginHorizontal: -10, marginBottom: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, backgroundColor: '#F1F2FF', borderBottomWidth: 1, borderBottomColor: '#E3E5FC'},
  attendanceFilterHead: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16},
  attendanceFilterIcon: {width: 46, height: 46, borderRadius: 15, backgroundColor: '#E8E9FF', alignItems: 'center', justifyContent: 'center'},
  attendanceFilterCopy: {flex: 1},
  attendanceFilterTitle: {color: colors.text, fontSize: 20, fontFamily: fonts.bold},
  attendanceFilterSub: {color: colors.muted, fontSize: 13, fontFamily: fonts.medium, marginTop: 3},
  filterCard: {padding: 0, marginBottom: 12, overflow: 'hidden', borderRadius: 12},
  dateFilterRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 8},
  dateFilterField: {flex: 1},
  dateFilterLabel: {color: colors.text, fontSize: 13, fontFamily: fonts.bold, marginBottom: 7},
  dateFilterInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    color: colors.text,
    fontWeight: '800',
    backgroundColor: colors.white,
  },
  dateFilterButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  dateFilterSearch: {width: 68, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.primary},
  dateFilterSearchText: {color: colors.white, fontSize: 10, fontFamily: fonts.bold},
  clearFilterButton: {alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, borderRadius: 999, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7},
  clearFilterText: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  attendanceHistoryHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22},
  attendanceHistoryTitle: {color: colors.text, fontSize: 24, fontFamily: fonts.bold},
  attendanceHistorySub: {color: colors.muted, fontSize: 14, fontFamily: fonts.semibold, marginTop: 4},
  attendanceSection: {marginBottom: 26},
  attendanceSectionTitle: {color: colors.text, fontSize: 17, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 11},
  attendanceList: {gap: 12},
  attendanceEntry: {backgroundColor: colors.white, paddingHorizontal: 15, paddingVertical: 16, borderWidth: 1, borderLeftWidth: 5, borderColor: colors.border, borderRadius: 20},
  attendanceEntryHead: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10},
  attendanceHeadingGroup: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10},
  attendanceDateIcon: {width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  attendanceDateWrap: {flex: 1},
  attendanceDate: {color: colors.text, fontSize: 17, fontFamily: fonts.bold},
  attendanceHours: {color: colors.muted, fontSize: 12, fontFamily: fonts.medium, marginTop: 3},
  attendanceTimes: {flexDirection: 'row', alignItems: 'stretch', marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border},
  attendanceTimeColumn: {flex: 1, minWidth: 0},
  attendanceMetricIcon: {width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 7},
  attendanceTimeDivider: {width: 1, backgroundColor: colors.border, marginHorizontal: 9},
  attendanceTimeLabel: {color: colors.subtle, fontSize: 8, fontFamily: fonts.bold, letterSpacing: 0.35},
  attendanceTimeValue: {color: colors.text, fontSize: 13, fontFamily: fonts.bold, marginTop: 4},
  attendanceLocations: {flexDirection: 'row', gap: 10, marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border},
  attendanceLocationRow: {flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 7},
  attendanceLocationIcon: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  attendanceLocationCopy: {flex: 1},
  attendanceLocationLabel: {color: colors.subtle, fontSize: 9, fontWeight: '900', letterSpacing: 0.4},
  attendanceLocationValue: {color: colors.textMid, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 2},
  attendanceRegulariseLink: {alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 15, borderRadius: 12, backgroundColor: colors.warningLight, paddingVertical: 11},
  attendanceRegulariseText: {color: colors.warning, fontSize: 12, fontWeight: '900'},
  attendanceRequestState: {color: colors.warning, fontSize: 12, fontWeight: '800', marginTop: 12},
  panel: {padding: 0, marginBottom: 12, overflow: 'hidden'},
  attendanceSummaryCard: {shadowOpacity: 0, shadowRadius: 0, elevation: 0, borderColor: colors.border},
  sectionHead: {flexDirection: 'row', alignItems: 'center', gap: 11, padding: 16, paddingBottom: 10},
  sectionIcon: {width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  sectionCopy: {flex: 1},
  sectionTitle: {color: colors.text, fontSize: 16, fontFamily: fonts.bold},
  sectionSub: {color: colors.muted, marginTop: 2, fontWeight: '600'},
  emptyState: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28},
  emptyStatePage: {minHeight: 430, paddingTop: 48, paddingBottom: 80},
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: 12,
  },
  emptyTitle: {color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center'},
  emptyText: {color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center', marginTop: 5},
  plainList: {marginTop: 4},
  holidayList: {paddingTop: 8},
  holidayEmpty: {marginTop: 24, alignItems: 'center', paddingHorizontal: 28, paddingVertical: 34, borderRadius: 18, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.white},
  holidayEmptyIcon: {width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, marginBottom: 14},
  holidayEmptyTitle: {color: colors.text, fontSize: 17, fontFamily: fonts.bold, textAlign: 'center'},
  holidayEmptyText: {color: colors.muted, fontSize: 13, lineHeight: 19, fontFamily: fonts.medium, textAlign: 'center', marginTop: 6},
  record: {marginHorizontal: 16, marginBottom: 10, padding: 13, shadowOpacity: 0.04, elevation: 1},
  recordTop: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10},
  recordText: {flex: 1},
  recordTitle: {color: colors.text, fontSize: 15, fontWeight: '900'},
  recordSub: {color: colors.textMid, marginTop: 4, fontWeight: '700'},
  recordMeta: {color: colors.muted, marginTop: 8, fontWeight: '600'},
  regulariseButton: {alignSelf: 'stretch', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, borderRadius: 12, backgroundColor: colors.warning, paddingHorizontal: 14, paddingVertical: 11},
  homeRegulariseButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 16, marginTop: 10, marginBottom: 14, borderRadius: 12, backgroundColor: colors.warning, paddingHorizontal: 14, paddingVertical: 11},
  regulariseButtonText: {color: colors.white, fontSize: 13, fontWeight: '900'},
  regularisationStatusPill: {alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, borderRadius: 999, backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 7},
  regularisationStatusText: {fontSize: 12, fontWeight: '900'},
  pill: {borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5},
  pillText: {fontSize: 11, fontWeight: '900', textTransform: 'uppercase'},
  requestLeaveCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // Use an explicit brand surface here. This shared Leave/Loan CTA must never
    // inherit a pale background while retaining its white icon and labels.
    backgroundColor: '#5B5BF7',
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  requestLeaveCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestLeaveCtaCopy: {flex: 1},
  requestLeaveCtaTitle: {color: colors.white, fontSize: 15, fontWeight: '900'},
  requestLeaveCtaSub: {color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', marginTop: 2},
  leaveBalanceList: {paddingHorizontal: 16, paddingBottom: 16, gap: 10},
  leaveBalanceItem: {backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border},
  leaveBalanceHead: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10},
  leaveBalanceName: {flex: 1, color: colors.text, fontSize: 14, fontWeight: '900'},
  leaveBalanceAvailable: {color: colors.text, fontSize: 18, fontWeight: '900'},
  leaveBalanceUnit: {color: colors.muted, fontSize: 11, fontWeight: '800'},
  leaveProgressTrack: {height: 6, borderRadius: 999, backgroundColor: colors.border, marginTop: 10, overflow: 'hidden'},
  leaveProgressFill: {height: 6, borderRadius: 999},
  leaveBalanceMetaRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 8},
  leaveBalanceMeta: {color: colors.muted, fontSize: 11, fontWeight: '800'},
  leaveFilterRow: {flexDirection: 'row', gap: 7, paddingTop: 4, paddingBottom: 14},
  leaveFilterChip: {flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 10, backgroundColor: colors.white},
  leaveFilterChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  leaveFilterText: {color: colors.textMid, fontSize: 10, fontWeight: '900'},
  leaveFilterTextActive: {color: colors.white},
  leaveListHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 13, marginHorizontal: -12},
  leaveListHeadLeft: {color: colors.muted, fontSize: 12, fontFamily: fonts.bold},
  leaveListHeadRight: {flexDirection: 'row', alignItems: 'center', gap: 12},
  leaveListHeadStatus: {color: colors.muted, fontSize: 12, fontFamily: fonts.bold},
  leaveHistoryPressable: {width: '100%'},
  leaveHistoryEntry: {width: '100%', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'stretch', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border},
  leaveDateColumn: {width: 62, flexShrink: 0, alignItems: 'flex-start', paddingLeft: 2},
  leaveDateDay: {color: colors.text, fontSize: 27, lineHeight: 31, fontFamily: fonts.bold},
  leaveDateMonth: {color: colors.muted, fontSize: 12, fontFamily: fonts.semibold, marginTop: 1},
  leaveDateYear: {color: colors.muted, fontSize: 12, fontFamily: fonts.semibold, marginTop: 2},
  leaveEntryDivider: {width: 1, backgroundColor: colors.border, marginRight: 14},
  leaveEntryCopy: {flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0},
  leaveEntryTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  leaveEntryTitle: {flex: 1, minWidth: 0, color: colors.text, fontSize: 16, fontFamily: fonts.bold},
  leaveStatusPill: {flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6},
  leaveStatusDot: {width: 7, height: 7, borderRadius: 4},
  leaveStatusText: {fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase'},
  leaveEntryMetaRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8},
  leaveEntryMeta: {flex: 1, color: colors.muted, fontSize: 12, lineHeight: 16, fontFamily: fonts.medium},
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  showMoreText: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  formCard: {padding: 0, marginBottom: 12, overflow: 'hidden'},
  inputLabel: {color: colors.textMid, fontWeight: '900', marginHorizontal: 16, marginBottom: 7},
  input: {
    minHeight: 48,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: colors.surfaceAlt,
  },
  reasonInput: {minHeight: 82, paddingTop: 12, textAlignVertical: 'top'},
  leaveTypeRow: {gap: 8, paddingHorizontal: 16, paddingBottom: 12},
  leaveType: {borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white},
  leaveTypeActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  leaveTypeText: {color: colors.textMid, fontWeight: '900'},
  leaveTypeTextActive: {color: colors.white},
  inlineHelp: {color: colors.muted, fontWeight: '700', marginHorizontal: 16, marginBottom: 12},
  documentAction: {paddingHorizontal: 16, paddingBottom: 12},
  uploadPath: {color: colors.success, fontWeight: '800', marginHorizontal: 16, marginBottom: 12},
  documentCard: {padding: 14, borderRadius: 12, marginBottom: 12},
  documentHeader: {flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12},
  documentHelp: {color: colors.muted, fontWeight: '700', lineHeight: 19, marginBottom: 12},
  documentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  documentRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoLight,
  },
  documentRowText: {flex: 1},
  documentTitle: {color: colors.text, fontSize: 14, fontWeight: '900'},
  documentSub: {color: colors.textMid, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3},
  documentDate: {color: colors.subtle, fontSize: 11, fontWeight: '800', marginTop: 5},
  regularisationTypeRow: {gap: 8, paddingHorizontal: 16, paddingBottom: 12},
  regularisationChip: {borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 7},
  regularisationChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  regularisationChipText: {color: colors.textMid, fontSize: 12, fontWeight: '900'},
  regularisationChipTextActive: {color: colors.white},
  regularisationActions: {gap: 10, paddingHorizontal: 16, paddingBottom: 16},
  carrTask: {borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 14},
  carrProgressRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10},
  carrProgressTrack: {flex: 1, height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.primaryLight},
  carrProgressFill: {height: '100%', borderRadius: 999, backgroundColor: colors.primary},
  carrProgressText: {color: colors.text, fontSize: 12, fontWeight: '900', minWidth: 34, textAlign: 'right'},
  carrDueDate: {marginTop: 8, color: colors.muted, fontSize: 12, fontWeight: '800'},
  carrOverdue: {color: colors.danger},
  carrDeliverable: {marginTop: 12, color: colors.textMid, fontSize: 13, fontWeight: '800'},
  carrReadOnly: {marginTop: 18, color: colors.muted, fontSize: 13, fontWeight: '700'},
  openPayslipText: {marginTop: 10, color: colors.primary, fontSize: 12, fontWeight: '900'},
  payslipDetailCard: {marginBottom: 16},
  datePickerButton: {
    minHeight: 48,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  datePickerValue: {flex: 1, color: colors.text, fontSize: 14, fontWeight: '800'},
  datePickerPlaceholder: {color: colors.subtle},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end'},
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 24,
  },
  modalHandle: {alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: colors.border, marginBottom: 8},
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    zIndex: 1,
  },
  calendarSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  calendarHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  calendarTitle: {color: colors.text, fontSize: 17, fontWeight: '900'},
  calendarWeekRow: {flexDirection: 'row', marginBottom: 8},
  calendarWeekText: {width: `${100 / 7}%`, color: colors.muted, fontSize: 11, fontWeight: '900', textAlign: 'center'},
  calendarGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  calendarDayDisabled: {opacity: 0.35},
  calendarDaySelected: {backgroundColor: colors.primary},
  calendarDayText: {color: colors.textMid, fontSize: 14, fontWeight: '900'},
  calendarDayTextDisabled: {color: colors.subtle},
  calendarDayTextSelected: {color: colors.white},
  calendarActions: {flexDirection: 'row', gap: 10, marginTop: 16},
});
