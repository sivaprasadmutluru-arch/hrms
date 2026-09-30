import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {pick, types} from '@react-native-documents/picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Card from '../components/Card';
import FieldRow from '../components/FieldRow';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {fonts} from '../theme/typography';
import {dateText, employeeName, money, timeText, workDuration} from '../utils/format';
import HelpdeskScreen from './HelpdeskScreen';
import NotificationsScreen from './NotificationsScreen';

type ModuleKey = 'overview' | 'attendance' | 'leave' | 'leaveRequest' | 'payslips' | 'documents' | 'hours' | 'holidays' | 'notifications' | 'helpdesk' | 'loans';

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

function statusTone(status?: string) {
  const text = String(status || '').toLowerCase();
  if (text.includes('approved') || text.includes('paid') || text.includes('present')) {
    return {bg: colors.successLight, fg: colors.success};
  }
  if (text.includes('reject') || text.includes('absent') || text.includes('cancel')) {
    return {bg: colors.dangerLight, fg: colors.danger};
  }
  if (text.includes('pending') || text.includes('late')) {
    return {bg: colors.warningLight, fg: colors.warning};
  }
  return {bg: colors.primaryLight, fg: colors.primary};
}

function canRequestRegularisation(record: any) {
  return !!record?.id && record?.attendanceStatus === 'IRREGULAR' && (!record?.regularisationStatus || record?.regularisationStatus === 'NONE');
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
    primary: [colors.primaryLight, colors.primary],
    success: [colors.successLight, colors.success],
    warning: [colors.warningLight, colors.warning],
    info: [colors.infoLight, colors.info],
    purple: [colors.purpleLight, colors.purple],
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-glassBorder bg-white p-4"
      style={({pressed}) => [styles.featureTile, pressed && styles.pressed]}>
      <View style={[styles.featureIcon, {backgroundColor: palette[0]}]}>
        <Icon name={icon as any} size={19} color={palette[1]} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
      <View style={styles.openRow}>
        <Text style={[styles.openText, {color: palette[1]}]}>Open</Text>
        <Icon name="arrow-forward-outline" size={13} color={palette[1]} />
      </View>
    </Pressable>
  );
}

function PageHeader({active, onBack}: {active: ModuleKey; onBack: () => void}) {
  const page = moduleInfo[active];
  return (
      <View style={styles.pageHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-back-outline" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.pageTitleWrap}>
          <Text style={styles.pageTitle}>{page.label}</Text>
          <Text style={styles.pageSubtitle}>{page.subtitle}</Text>
        </View>
      </View>
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

function parseDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function CalendarDateField({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(value) || new Date());
  const selectedDate = parseDateKey(value);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({length: firstDay + daysInMonth}, (_, index) => (index < firstDay ? 0 : index - firstDay + 1));
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
  const minDate = todayDateKey();

  function shiftMonth(offset: number) {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openPicker() {
    setVisibleMonth(selectedDate || new Date());
    setOpen(true);
  }

  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable onPress={openPicker} style={({pressed}) => [styles.datePickerButton, pressed && styles.pressed]}>
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
                const disabled = !day || cellKey < minDate;
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
  const available = Number(field(item, ['availableDays', 'balance', 'available', 'remaining', 'days'], 0)) || 0;
  const used = Number(field(item, ['usedDays', 'used', 'consumedDays'], 0)) || 0;
  const fallbackTotal = available + used;
  const total = Number(field(item, ['totalLeaveDays', 'totalDays', 'total'], fallbackTotal)) || fallbackTotal;
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leaveFilterRow}>
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
      </ScrollView>

      {filtered.length === 0 ? (
        <Empty title="No matching requests" text="Try a different filter above." icon="filter-outline" />
      ) : (
        <>
          {visible.map(item => (
            <RecordCard
              key={String(field(item, ['id', 'requestId', 'startDate']))}
              title={field(item, ['leaveTypeName', 'typeName', 'name'])}
              subtitle={`${dateText(field(item, ['startDate', 'fromDate'], ''))} to ${dateText(field(item, ['endDate', 'toDate'], ''))}`}
              meta={leaveMeta(item)}
              status={field(item, ['status', 'approvalStatus'], '')}
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
  const [holidays, setHolidays] = useState<any[]>([]);
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
  const [submittingRegularisation, setSubmittingRegularisation] = useState(false);
  const [attendanceFrom, setAttendanceFrom] = useState('');
  const [attendanceTo, setAttendanceTo] = useState('');

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
      api.myAttendance(),
      api.myLeave(),
      api.leaveTypes(),
      api.leaveBalance(),
      api.myPayslips(),
      api.holidays(),
      api.myLoanRequests(),
      refreshProfile(),
    ]);

    const [clockRes, workRes, docsRes, attendanceRes, leaveRes, typesRes, balanceRes, paysRes, holidayRes, loansRes] = results;
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
    if (loansRes.status === 'fulfilled') setLoanRequests(asArray(loansRes.value));
  }, [refreshProfile]);

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
    const from = attendanceFrom.trim();
    const to = attendanceTo.trim();
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
  }, [attendance, attendanceFrom, attendanceTo]);

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
    const today = todayDateKey();
    if (values.startDate < today || values.endDate < today) {
      Alert.alert('Leave Request', 'Back-dated leave requests are not allowed.');
      return;
    }
    if (values.endDate < values.startDate) {
      Alert.alert('Leave Request', 'End date cannot be before start date.');
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
    if (!regularisationTarget?.id) {
      Alert.alert('Regularisation', 'Select an irregular attendance record first.');
      return;
    }
    if (!regularisationReason.trim()) {
      Alert.alert('Regularisation', 'Please enter a reason.');
      return;
    }
    setSubmittingRegularisation(true);
    try {
      await api.submitRegularisationRequest({
        attendanceId: regularisationTarget.id,
        requestType: regularisationType,
        reason: regularisationReason.trim(),
      });
      setRegularisationTarget(null);
      setRegularisationReason('');
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
    setActive('attendance');
  }

  function renderOverview() {
    return (
      <>
        <View style={styles.modulesHead}>
          <Text style={styles.modulesTitle}>Modules</Text>
        </View>
        <View style={styles.featureGrid}>
          <FeatureTile icon="bar-chart-outline" label="Attendance" description="Track your attendance" onPress={() => setActive('attendance')} />
          <FeatureTile icon="airplane-outline" label="Leave" description="Manage leave requests" tone="purple" onPress={() => setActive('leave')} />
          <FeatureTile icon="document-text-outline" label="Documents" description="Employee documents" tone="info" onPress={() => setActive('documents')} />
          <FeatureTile icon="time-outline" label="Hours" description="Track work hours" tone="warning" onPress={() => setActive('hours')} />
          <FeatureTile icon="people-outline" label="Holidays" description="View holiday calendar" tone="success" onPress={() => setActive('holidays')} />
          <FeatureTile icon="card-outline" label="Payslips" description="Salary documents" tone="success" onPress={() => setActive('payslips')} />
          <FeatureTile icon="cash-outline" label="Loans" description="Apply and track loan requests" tone="purple" onPress={() => setActive('loans')} />
        </View>

        <Card style={styles.panel}>
          <SectionTitle title="Today Attendance" subtitle="Current status for your workday" icon="radio-outline" />
          <FieldRow label="Status" value={clock?.online ? 'Online at work' : 'Not checked in'} />
          <FieldRow label="Check In" value={timeText(clock?.checkIn)} />
          <FieldRow label="Check Out" value={timeText(clock?.checkOut)} />
          <FieldRow label="Hours Worked" value={hoursWorked(todayRecord, clock)} />
          <FieldRow label="Regularisation" value={regularisationLabel(todayRecord)} />
          <FieldRow label="Shift" value={profile?.shiftName || workInfo?.shiftName} />
          {canRequestRegularisation(todayRecord) && (
            <Pressable onPress={() => openRegularisationRequest(todayRecord)} style={({pressed}) => [styles.homeRegulariseButton, pressed && styles.pressed]}>
              <Icon name="create-outline" size={16} color={colors.white} />
              <Text style={styles.regulariseButtonText}>Request regularisation</Text>
            </Pressable>
          )}
        </Card>
      </>
    );
  }

  function renderAttendance() {
    return (
      <>
        <Card style={styles.filterCard}>
          <SectionTitle title="Date Filter" subtitle="Track attendance by back dates" icon="calendar-outline" />
          <View style={styles.dateFilterRow}>
            <View style={styles.dateFilterField}>
              <Text style={styles.dateFilterLabel}>From</Text>
              <TextInput
                value={attendanceFrom}
                onChangeText={setAttendanceFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.subtle}
                style={styles.dateFilterInput}
              />
            </View>
            <View style={styles.dateFilterField}>
              <Text style={styles.dateFilterLabel}>To</Text>
              <TextInput
                value={attendanceTo}
                onChangeText={setAttendanceTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.subtle}
                style={styles.dateFilterInput}
              />
            </View>
          </View>
          {(attendanceFrom || attendanceTo) && (
            <Pressable
              onPress={() => {
                setAttendanceFrom('');
                setAttendanceTo('');
              }}
              style={styles.clearFilterButton}>
              <Icon name="close-outline" size={15} color={colors.primary} />
              <Text style={styles.clearFilterText}>Clear filter</Text>
            </Pressable>
          )}
        </Card>

        <Card style={styles.panel}>
          <SectionTitle
            title="Attendance History"
            subtitle={`${filteredAttendance.length} record${filteredAttendance.length === 1 ? '' : 's'} found`}
            icon="list-outline"
          />
          {filteredAttendance.length ? (
            filteredAttendance.map(item => (
              <RecordCard
                key={String(field(item, ['id', 'attendanceDate', 'date']))}
                title={dateText(field(item, ['attendanceDate', 'date', 'createdAt'], ''))}
                subtitle={`In ${timeText(field(item, ['checkIn', 'checkInTime', 'inTime']))} | Out ${timeText(field(item, ['checkOut', 'checkOutTime', 'outTime']))}`}
                meta={`Hours ${hoursWorked(item)}`}
                status={field(item, ['displayStatus', 'status', 'attendanceStatus'], '')}>
                {canRequestRegularisation(item) ? (
                  <Pressable onPress={() => openRegularisationRequest(item)} style={({pressed}) => [styles.regulariseButton, pressed && styles.pressed]}>
                    <Icon name="create-outline" size={16} color={colors.white} />
                    <Text style={styles.regulariseButtonText}>Request regularisation</Text>
                  </Pressable>
                ) : item.attendanceStatus === 'IRREGULAR' ? (
                  <View style={styles.regularisationStatusPill}>
                    <Icon
                      name={item.regularisationStatus === 'HAS_PENDING' ? 'time-outline' : 'checkmark-circle-outline'}
                      size={14}
                      color={item.regularisationStatus === 'HAS_PENDING' ? colors.warning : colors.success}
                    />
                    <Text
                      style={[
                        styles.regularisationStatusText,
                        {color: item.regularisationStatus === 'HAS_PENDING' ? colors.warning : colors.success},
                      ]}>
                      {regularisationLabel(item)}
                    </Text>
                  </View>
                ) : null}
              </RecordCard>
            ))
          ) : (
            <Empty title="No Attendance Records" text="Try changing the date range to view older attendance." icon="calendar-clear-outline" />
          )}
        </Card>

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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regularisationTypeRow}>
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
              </ScrollView>
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
      <>
        <Pressable onPress={() => setActive('leaveRequest')} style={({pressed}) => [styles.requestLeaveCta, pressed && styles.pressed]}>
          <View style={styles.requestLeaveCtaIcon}>
            <Icon name="add-circle" size={22} color={colors.white} />
          </View>
          <View style={styles.requestLeaveCtaCopy}>
            <Text style={styles.requestLeaveCtaTitle}>Request Leave</Text>
            <Text style={styles.requestLeaveCtaSub}>Check balance & submit a new application</Text>
          </View>
          <Icon name="chevron-forward-outline" size={18} color={colors.white} />
        </Pressable>

        <Card style={styles.panel}>
          <SectionTitle
            title="Leave History"
            subtitle={leaveRequests.length ? `${leaveRequests.length} request${leaveRequests.length === 1 ? '' : 's'} total` : 'Track approvals and history'}
            icon="calendar-outline"
          />
          <LeaveHistoryList requests={leaveRequests} />
        </Card>
      </>
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
          <RecordCard
            key={String(field(item, ['id', 'payrollId', 'month']))}
            title={field(item, ['monthName', 'month', 'payPeriod'], 'Payslip')}
            subtitle={`Gross ${money(field(item, ['grossPay', 'grossSalary', 'totalEarnings'], ''), profile?.currencySymbol || '')}`}
            meta={`Net ${money(field(item, ['netPay', 'netSalary', 'payableAmount'], ''), profile?.currencySymbol || '')}`}
            status={field(item, ['status', 'paymentStatus'], '')}
          />
        ))}
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
        <Pressable onPress={() => setLoanModalVisible(true)} style={({pressed}) => [styles.requestLeaveCta, pressed && styles.pressed]}>
          <View style={styles.requestLeaveCtaIcon}>
            <Icon name="add-circle" size={22} color={colors.white} />
          </View>
          <View style={styles.requestLeaveCtaCopy}>
            <Text style={styles.requestLeaveCtaTitle}>Apply Loan</Text>
            <Text style={styles.requestLeaveCtaSub}>Submit a loan, advance, or fine request</Text>
          </View>
          <Icon name="chevron-forward-outline" size={18} color={colors.white} />
        </Pressable>

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
    return (
      <Card style={styles.panel}>
        <SectionTitle title="Holidays" subtitle="Company holiday calendar" icon="sparkles-outline" />
        {(upcomingHolidays.length ? upcomingHolidays : holidays.slice(0, 10)).length ? (
          (upcomingHolidays.length ? upcomingHolidays : holidays.slice(0, 10)).map(item => (
            <RecordCard
              key={String(field(item, ['id', 'holidayId', 'holidayDate', 'date']))}
              title={field(item, ['holidayName', 'name', 'description'], 'Holiday')}
              subtitle={dateText(field(item, ['holidayDate', 'date', 'startDate'], ''))}
              meta={field(item, ['type', 'branchName', 'companyName'], '')}
            />
          ))
        ) : (
          <Empty title="No Holidays Available" text="Company holidays will appear here once published." icon="sparkles-outline" />
        )}
      </Card>
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
    if (active === 'loans') return renderLoans();
    return renderOverview();
  }

  return (
    active === 'notifications' || active === 'helpdesk' ? (
      renderActiveModule()
    ) : active === 'overview' ? (
      <View className="flex-1 bg-background" style={styles.screen}>
        <View style={[styles.fixedHomeHeader, {paddingTop: insets.top + 12}]}>
          <View style={styles.topBar}>
            <View style={styles.headerSpacer} />
            <Text style={styles.appTitle}>HRMS</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={() => setActive('notifications')} style={styles.headerIconButton}>
                <Icon name="notifications-outline" size={16} color={colors.white} />
              </Pressable>
              <Pressable onPress={() => setActive('helpdesk')} style={styles.headerIconButton}>
                <Icon name="help-outline" size={16} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          <View style={styles.appHeader}>
            <View style={styles.welcomeBlock}>
              <Text style={styles.welcomeLabel}>Welcome Back</Text>
              <Text style={styles.welcomeName}>{employeeName(profile)}</Text>
              <Text style={styles.welcomeCompany}>{profile?.companyName || user?.companyName || 'GRECHA HRMS'}</Text>
            </View>
          </View>

          {!online && <Text style={styles.offline}>Offline mode: reconnect to refresh HRMS data.</Text>}

          {renderOverview()}
        </ScrollView>
      </View>
    ) : (
    <View className="flex-1 bg-background" style={styles.screen}>
      <View style={[styles.moduleHeaderWrap, {paddingTop: insets.top + 10}]}>
        <PageHeader active={active} onBack={() => setActive(active === 'leaveRequest' ? 'leave' : 'overview')} />
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.moduleContent}
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
  content: {paddingHorizontal: 16, paddingTop: 0, paddingBottom: 30},
  moduleContent: {paddingHorizontal: 16, paddingTop: 0, paddingBottom: 30},
  moduleHeaderWrap: {backgroundColor: colors.background},
  fixedHomeHeader: {
    backgroundColor: colors.sidebar,
    paddingBottom: 16,
    paddingHorizontal: 32,
  },
  appHeader: {
    backgroundColor: colors.sidebar,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 20,
    paddingBottom: 22,
    marginBottom: 10,
    marginHorizontal: -16,
    paddingHorizontal: 32,
  },
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  appTitle: {color: colors.white, fontSize: 13, fontFamily: fonts.bold},
  headerActions: {flexDirection: 'row', gap: 8},
  headerSpacer: {width: 64, height: 28},
  headerIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  welcomeBlock: {marginTop: 0},
  welcomeLabel: {color: '#C7D2FE', fontSize: 12, fontFamily: fonts.semibold},
  welcomeName: {color: colors.white, fontSize: 20, fontFamily: fonts.bold, marginTop: 4},
  welcomeCompany: {color: '#E0E7FF', fontSize: 14, fontFamily: fonts.semibold, marginTop: 4},
  offline: {color: colors.warning, backgroundColor: colors.warningLight, padding: 11, borderRadius: 12, marginBottom: 12, fontWeight: '800'},
  modulesHead: {marginBottom: 10},
  modulesTitle: {color: colors.text, fontSize: 16, fontFamily: fonts.bold},
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  pageTitleWrap: {flex: 1},
  pageTitle: {color: colors.text, fontSize: 20, fontFamily: fonts.bold},
  pageSubtitle: {color: colors.muted, fontSize: 12, fontFamily: fonts.medium, marginTop: 2},
  featureGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14},
  featureTile: {
    width: '48%',
    minHeight: 142,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    shadowColor: colors.sidebar,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  pressed: {opacity: 0.72},
  featureIcon: {width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
  featureLabel: {color: colors.text, fontSize: 14, fontFamily: fonts.semibold, marginTop: 11},
  featureDesc: {color: colors.muted, fontSize: 12, fontFamily: fonts.regular, marginTop: 3},
  openRow: {flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 12},
  openText: {fontSize: 11, fontWeight: '900'},
  metricsRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  metric: {flex: 1, minHeight: 116},
  metricIcon: {width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10},
  metricLabel: {color: colors.muted, fontSize: 12, fontFamily: fonts.semibold, textTransform: 'uppercase'},
  metricValue: {color: colors.text, fontSize: 20, fontFamily: fonts.bold, marginTop: 5},
  filterCard: {padding: 0, marginBottom: 12, overflow: 'hidden', borderRadius: 12},
  dateFilterRow: {flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12},
  dateFilterField: {flex: 1},
  dateFilterLabel: {color: colors.textMid, fontSize: 12, fontWeight: '900', marginBottom: 7},
  dateFilterInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: colors.text,
    fontWeight: '800',
    backgroundColor: colors.surfaceAlt,
  },
  clearFilterButton: {alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginHorizontal: 16, marginBottom: 14, borderRadius: 999, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7},
  clearFilterText: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  panel: {padding: 0, marginBottom: 12, overflow: 'hidden'},
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
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#101828',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 3,
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
  leaveFilterRow: {gap: 8, paddingHorizontal: 16, paddingBottom: 12},
  leaveFilterChip: {borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.white},
  leaveFilterChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  leaveFilterText: {color: colors.textMid, fontSize: 12, fontWeight: '900'},
  leaveFilterTextActive: {color: colors.white},
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
