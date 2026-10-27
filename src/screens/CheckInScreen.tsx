import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, BackHandler, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../components/Card';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {fonts} from '../theme/typography';
import {captureCurrentLocation, Position, reverseGeocode} from '../utils/location';
import {dateText, employeeName, workDuration} from '../utils/format';
import AttendanceRecordsScreen from './AttendanceRecordsScreen';
import AttendanceRegularisationModal from '../components/AttendanceRegularisationModal';
import {AttendanceCategory, attendanceCounts, loadAttendanceCheckouts} from '../utils/attendanceRecords';

const DEFAULT_REQUEST_TYPE = 'MISSING_PUNCH';

function payload(position?: Position | null) {
  return position?.coords
    ? {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }
    : {};
}

function asArray(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Dubai'});
}

function displayTime(...values: any[]) {
  const value = values.find(item => item);
  if (!value) return '-';
  const text = String(value);

  if (text.includes('T')) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
  }

  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hour = Number(match[1]);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${match[2]} ${period}`;
  }

  return text;
}

function punchDate(fallbackDate: string, ...values: any[]) {
  const value = values.find(item => item);
  if (!value) return null;
  // Use the same local date as displayTime for full timestamps. Time-only
  // responses belong to the attendance day, parsed locally to avoid a UTC shift.
  const timestamp = values.find(item => item && String(item).includes('T'));
  return dateText(timestamp ? String(timestamp) : `${fallbackDate}T00:00:00`);
}

function elapsedSeconds(clock: any, todayRecord: any) {
  const isOnline = !!clock?.online;
  const previousSeconds = clock?.atWorkSecond || todayRecord?.atWorkSecond || 0;
  const currentStart = clock?.currentSessionStartUtc || todayRecord?.currentSessionStartUtc;
  let totalMs = previousSeconds * 1000;

  if (isOnline && currentStart) {
    const diffMs = Date.now() - new Date(currentStart).getTime();
    if (diffMs > 0) {
      totalMs += diffMs;
    }
  }

  return Math.floor(totalMs / 1000);
}

function timerClock(totalSeconds: number) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function canRequestRegularisation(record: any) {
  return !!record?.id && record?.attendanceStatus === 'IRREGULAR' && (!record?.regularisationStatus || record?.regularisationStatus === 'NONE');
}

function distanceMeters(from: {latitude: number; longitude: number}, to: {latitude: number; longitude: number}) {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function localFenceCheck(config: any, current: Position) {
  const latitude = Number(config?.latitude);
  const longitude = Number(config?.longitude);
  const radiusInMeters = Number(config?.radiusInMeters);
  if (!current?.coords || Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radiusInMeters)) {
    return null;
  }
  const distance = distanceMeters(current.coords, {latitude, longitude});
  return {
    withinFence: distance <= radiusInMeters,
    distance,
    radiusInMeters,
  };
}

function monthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {from: fmt(from), to: fmt(to)};
}

const TONE_STYLES = {
  primary: {bg: colors.primaryLight, fg: colors.primary},
  success: {bg: colors.successLight, fg: colors.success},
  warning: {bg: colors.warningLight, fg: colors.warning},
  danger: {bg: colors.dangerLight, fg: colors.danger},
  info: {bg: colors.infoLight, fg: colors.info},
  purple: {bg: colors.purpleLight, fg: colors.purple},
} as const;

function Stat({
  label,
  value,
  date,
  icon,
  tone = 'primary',
}: {
  label: string;
  value?: string | number | null;
  date?: string | null;
  icon: string;
  tone?: keyof typeof TONE_STYLES;
}) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={styles.statCol}>
      <View style={[styles.statIcon, {backgroundColor: toneStyle.bg}]}>
        <Icon name={icon as any} size={14} color={toneStyle.fg} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value || '-'}</Text>
      {!!date && <Text style={styles.statDate}>{date}</Text>}
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function PunchPill({
  isClockedIn,
  onPress,
  loading,
}: {
  isClockedIn: boolean;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <View style={[styles.punchButtonShell, {backgroundColor: isClockedIn ? colors.danger : colors.primary}]}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({pressed}) => [styles.punchPill, (pressed || loading) && styles.punchPillPressed]}>
        {loading ? (
          <View style={styles.punchPillContent}>
            <ActivityIndicator color={colors.white} size="small" />
          </View>
        ) : (
          <View style={styles.punchPillContent}>
            <Icon name={isClockedIn ? 'log-out-outline' : 'log-in-outline'} size={16} color={colors.white} />
            <Text style={styles.punchPillText}>{isClockedIn ? 'Check Out' : 'Check In'}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default function CheckInScreen({onRootChange}: {onRootChange?: (isRoot: boolean) => void}) {
  const insets = useSafeAreaInsets();
  const {user, profile} = useAuth();
  const [clock, setClock] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayActivities, setTodayActivities] = useState<any[]>([]);
  const [workInfo, setWorkInfo] = useState<any>(null);
  const [geofence, setGeofence] = useState<any>(null);
  const [geofenceCheck, setGeofenceCheck] = useState<any>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const addressRequestId = useRef(0);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedRegularisation, setSelectedRegularisation] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [submittingRegularisation, setSubmittingRegularisation] = useState(false);
  const [, setTick] = useState(0);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [monthRecords, setMonthRecords] = useState<any[]>([]);
  const [recordsCategory, setRecordsCategory] = useState<AttendanceCategory | null>(null);
  const [monthError, setMonthError] = useState('');
  const monthRequestId = useRef(0);
  const monthSummary = useMemo(() => attendanceCounts(monthRecords), [monthRecords]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const loadStatus = useCallback(async () => {
    setMessage('');
    const [clockRes, attendanceRes, activitiesRes, workRes, geoRes] = await Promise.allSettled([
      api.clockStatus(),
      api.myAttendance({page: 0, size: 10, sort: 'attendanceDate,desc'}),
      api.myAttendanceActivities(todayKey()),
      api.workInfo(),
      api.geoFencing(),
    ]);

    if (clockRes.status === 'fulfilled') {
      setClock(clockRes.value);
    } else {
      setMessage(clockRes.reason?.message || 'Unable to load clock status.');
    }
    if (attendanceRes.status === 'fulfilled') {
      setAttendance(asArray(attendanceRes.value));
    }
    if (activitiesRes.status === 'fulfilled') {
      setTodayActivities(asArray(activitiesRes.value));
    }
    if (workRes.status === 'fulfilled') {
      setWorkInfo(workRes.value);
    }
    if (geoRes.status === 'fulfilled') {
      setGeofence(geoRes.value);
    } else {
      setGeofence(null);
    }
  }, []);

  const loadMonthSummary = useCallback(async (cursor: Date) => {
    const requestId = ++monthRequestId.current;
    setLoadingMonth(true);
    setMonthError('');
    setMonthRecords([]);
    try {
      const {from, to} = monthRange(cursor);
      const res = await api.attendanceFullView({from, to, page: 0, size: 62});
      if (requestId !== monthRequestId.current) return;
      const records = await loadAttendanceCheckouts(asArray(res), api.myAttendanceActivities);
      if (requestId === monthRequestId.current) setMonthRecords(records);
    } catch (err: any) {
      if (requestId === monthRequestId.current) setMonthError(err?.message || 'Unable to load monthly attendance.');
    } finally {
      if (requestId === monthRequestId.current) setLoadingMonth(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadMonthSummary(monthCursor);
  }, [monthCursor, loadMonthSummary]);

  useEffect(() => {
    onRootChange?.(!recordsCategory);
  }, [recordsCategory, onRootChange]);

  useEffect(() => () => onRootChange?.(true), [onRootChange]);

  useEffect(() => {
    if (!recordsCategory) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setRecordsCategory(null);
      return true;
    });
    return () => subscription.remove();
  }, [recordsCategory]);

  useEffect(() => {
    locate({silent: true}).catch(err => setMessage(err.message || 'Location permission is required for attendance.'));
    const timer = setInterval(() => {
      locate({silent: true}).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
    // Location keeps polling every 30s so the header reflects live position, not just app-start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayRecord = useMemo(
    () => attendance.find(item => item?.attendanceDate === todayKey()) || null,
    [attendance],
  );

  const liveTime = new Date();
  const wallClockLabel = liveTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  const wallDateLabel = liveTime.toLocaleDateString(undefined, {weekday: 'short', day: 'numeric', month: 'short'});

  const isClockedIn = !!clock?.online;
  const workedSeconds = elapsedSeconds(clock, todayRecord);
  // While checked in this reads as a live ticking stopwatch (HH:MM:SS); once checked out it
  // settles into a plain "Xh Ym" total so it doesn't look like a frozen/broken timer.
  const workedLabel = isClockedIn ? timerClock(workedSeconds) : workDuration(workedSeconds);
  const isSuccessMessage = /synced/i.test(message);
  const geofenceActive = !!geofence?.start;
  const geofenceEnforced = geofenceActive && !!geofence?.enforceGeofence;
  const locationAllowed = !geofenceActive || geofenceCheck?.withinFence !== false;

  const locationLabel = resolvedAddress
    ? resolvedAddress
    : position
      ? resolvingAddress
        ? 'Fetching address…'
        : `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`
      : 'Location unavailable';

  const monthLabel = monthCursor.toLocaleDateString(undefined, {month: 'short', year: 'numeric'});
  const now = new Date();
  const canGoNextMonth =
    monthCursor.getFullYear() < now.getFullYear() ||
    (monthCursor.getFullYear() === now.getFullYear() && monthCursor.getMonth() < now.getMonth());

  function shiftMonth(delta: number) {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([loadStatus(), loadMonthSummary(monthCursor), locate({silent: true}).catch(() => {})]);
    } finally {
      setRefreshing(false);
    }
  }

  async function locate(options?: {silent?: boolean}) {
    setLocating(true);
    if (!options?.silent) {
      setMessage('');
    }
    try {
      const current = await captureCurrentLocation();
      setPosition(current);
      setResolvedAddress(null);
      const requestId = ++addressRequestId.current;
      setResolvingAddress(true);
      void reverseGeocode(current.coords.latitude, current.coords.longitude)
        .then(address => {
          // Ignore stale lookups from an earlier GPS refresh. Without this guard,
          // a late failed response could clear a successfully resolved address.
          if (requestId === addressRequestId.current) setResolvedAddress(address);
        })
        .finally(() => {
          if (requestId === addressRequestId.current) setResolvingAddress(false);
        });
      await validateGeofence(current, {throwWhenBlocked: false});
      return current;
    } finally {
      setLocating(false);
    }
  }

  async function validateGeofence(current: Position, options?: {throwWhenBlocked?: boolean}) {
    if (!geofence?.start || !current?.coords) {
      setGeofenceCheck(null);
      return null;
    }

    let result: any = null;
    try {
      result = await api.checkGeoLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        employeeId: user?.employeeId || null,
      });
    } catch {
      result = localFenceCheck(geofence, current);
    }

    setGeofenceCheck(result);
    const outside = result?.withinFence === false;
    if (outside && geofence?.enforceGeofence && options?.throwWhenBlocked !== false) {
      const distance = result?.distance != null ? ` You are ${Math.round(Number(result.distance))}m from office.` : '';
      throw new Error(`Geofencing is active. You must be within office radius to ${isClockedIn ? 'check out' : 'check in'}.${distance}`);
    }
    return result;
  }

  async function submit() {
    if (clock?.attendanceRequired === false && !isClockedIn) {
      Alert.alert('Attendance not required', 'You are exempt from daily attendance. No check-in is needed.');
      return;
    }
    const kind = isClockedIn ? 'out' : 'in';
    setLoading(true);
    setMessage('');
    try {
      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        throw new Error('No internet connection. Attendance needs network access.');
      }
      const current = position || (await locate());
      await validateGeofence(current, {throwWhenBlocked: true});
      if (kind === 'in') {
        await api.checkIn(payload(current));
      } else {
        await api.checkOut(payload(current));
      }
      await loadStatus();
      await loadMonthSummary(monthCursor);
      setMessage(kind === 'in' ? 'Check-in synced with HRMS.' : 'Check-out synced with HRMS.');
    } catch (err: any) {
      Alert.alert('Attendance', err.message || 'Unable to submit attendance.');
      setMessage(err.message || 'Unable to submit attendance.');
    } finally {
      setLoading(false);
    }
  }

  function openRequest() {
    if (canRequestRegularisation(todayRecord)) {
      setSelectedRegularisation(todayRecord);
    } else {
      Alert.alert('Regularisation', 'You can request regularisation only for irregular attendance on a given day.');
    }
  }

  async function submitRegularisation() {
    if (!selectedRegularisation?.id) {
      Alert.alert('Regularisation', 'Select an attendance record first.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Regularisation', 'Please enter a reason.');
      return;
    }
    setSubmittingRegularisation(true);
    try {
      await api.submitRegularisationRequest({
        attendanceId: selectedRegularisation.id,
        requestType: DEFAULT_REQUEST_TYPE,
        reason: reason.trim(),
      });
      setSelectedRegularisation(null);
      setReason('');
      await loadStatus();
      Alert.alert('Regularisation', 'Request submitted successfully.');
    } catch (err: any) {
      Alert.alert('Regularisation', err.message || 'Failed to submit request.');
    } finally {
      setSubmittingRegularisation(false);
    }
  }

  if (recordsCategory) {
    return <>
      <AttendanceRecordsScreen category={recordsCategory} month={monthLabel} monthCursor={monthCursor} onMonthChange={setMonthCursor} records={monthRecords} loading={loadingMonth} error={monthError} onCategoryChange={setRecordsCategory} onBack={() => {setSelectedRegularisation(null); setRecordsCategory(null);}} onRefresh={() => loadMonthSummary(monthCursor)} onRegularise={setSelectedRegularisation} />
      <AttendanceRegularisationModal record={selectedRegularisation} onClose={() => setSelectedRegularisation(null)} onSubmitted={async () => {await Promise.all([loadStatus(), loadMonthSummary(monthCursor)]);}} />
    </>;
  }

  return (
    <View className="flex-1 bg-background" style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#17134D" />
      <View style={[styles.stickyLocationHeader, {paddingTop: insets.top + 12}]}>
        <LinearGradient pointerEvents="none" colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFill} />
        <View style={styles.heroLocationRow}>
          <Icon name="location" size={13} color="rgba(255,255,255,0.85)" style={styles.heroLocationIcon} />
          <Text style={styles.heroLocationText} numberOfLines={2}>{locationLabel}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.hero}>
          <LinearGradient pointerEvents="none" colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFill} />

          <Text style={styles.heroWelcome}>Welcome, {employeeName(profile)}</Text>

          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{(workInfo?.shiftName || profile?.shiftName || 'General Shift').toUpperCase()}</Text>
            </View>
            <View style={[styles.heroChip, isClockedIn ? styles.heroChipOn : styles.heroChipOff]}>
              <View style={[styles.heroChipDot, isClockedIn ? styles.heroChipDotOn : styles.heroChipDotOff]} />
              <Text style={styles.heroChipText}>{isClockedIn ? 'Checked In' : clock?.attendanceRequired === false ? 'Attendance not required' : 'Not Checked In'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.clockCard}>
          <Text style={styles.clockCardTime} numberOfLines={1}>{wallClockLabel}</Text>
          <Text style={styles.clockCardDate}>{wallDateLabel}</Text>
        </View>
        {clock?.attendanceRequired === false && !isClockedIn ? (
          <Card><Text style={styles.cardSub}>You are exempt from daily attendance. No check-in or regularisation is needed. Your leave policy remains unchanged.</Text></Card>
        ) : <PunchPill isClockedIn={isClockedIn} onPress={submit} loading={loading || locating} />}

        <Card style={[styles.quickStatsCard, styles.flatCard]}>
          <View style={styles.statsRow}>
            <Stat label="Check In" value={displayTime(todayRecord?.checkIn, clock?.checkIn)} date={punchDate(todayRecord?.attendanceDate || todayKey(), todayRecord?.checkIn, clock?.checkIn)} icon="log-in-outline" tone="success" />
            <View style={styles.statDivider} />
            <Stat label="Check Out" value={displayTime(todayRecord?.checkOut, clock?.checkOut)} date={punchDate(todayRecord?.attendanceDate || todayKey(), todayRecord?.checkOut, clock?.checkOut)} icon="log-out-outline" tone="purple" />
            <View style={styles.statDivider} />
            <Stat label="Working Hrs" value={workedLabel} icon="timer-outline" tone="info" />
          </View>
        </Card>

        <Card style={[styles.activityCard, styles.flatCard]}>
          <View style={styles.activityHeader}>
            <View>
              <Text style={styles.cardTitle}>Today's punch history</Text>
              <Text style={styles.cardSub}>Every mobile or biometric clock event</Text>
            </View>
            <View style={styles.activityCount}>
              <Text style={styles.activityCountText}>{todayActivities.length} event{todayActivities.length === 1 ? '' : 's'}</Text>
            </View>
          </View>
          {todayActivities.length ? todayActivities.map((activity, index) => (
            <View key={String(activity.id || index)} style={styles.activityRow}>
              <View style={[styles.activityDot, activity.clockOut ? styles.activityDotComplete : styles.activityDotOpen]} />
              <View style={styles.activityTimes}>
                <View style={styles.activityPunch}>
                  <Text style={styles.activityTime}>In {displayTime(activity.clockIn, activity.inDatetime)}</Text>
                  {!!(activity.clockIn || activity.inDatetime) && <Text style={styles.activityDate}>{punchDate(activity.attendanceDate || todayKey(), activity.clockIn, activity.inDatetime)}</Text>}
                </View>
                <View style={styles.activityPunch}>
                  <Text style={styles.activityTime}>Out {displayTime(activity.clockOut, activity.outDatetime)}</Text>
                  {!!(activity.clockOut || activity.outDatetime) && <Text style={styles.activityDate}>{punchDate(activity.attendanceDate || todayKey(), activity.clockOut, activity.outDatetime)}</Text>}
                </View>
              </View>
              <Text style={styles.activityStatus}>{activity.clockOut ? 'Completed' : 'Open'}</Text>
            </View>
          )) : (
            <Text style={styles.activityEmpty}>No punches recorded yet today.</Text>
          )}
        </Card>

        {!!message && !isSuccessMessage && (
          <View style={[styles.messageBanner, isSuccessMessage ? styles.messageSuccess : styles.messageError]}>
            <Icon name={isSuccessMessage ? 'checkmark-circle' : 'alert-circle'} size={16} color={isSuccessMessage ? colors.success : colors.danger} />
            <Text style={[styles.messageText, isSuccessMessage ? styles.messageTextSuccess : styles.messageTextError]}>{message}</Text>
          </View>
        )}

        <Card style={[styles.monthCard, styles.flatCard]}>
          <View style={styles.monthHead}>
            <View style={styles.geoCopy}>
              <Text style={styles.cardTitle}>Attendance This Month</Text>
              <Text style={styles.cardSub}>Present, absent & late overview</Text>
            </View>
            <View style={styles.monthPicker}>
              <Pressable onPress={() => shiftMonth(-1)} style={styles.monthArrow}>
                <Icon name="chevron-back" size={14} color={colors.primary} />
              </Pressable>
              <Text style={styles.monthPickerText}>{monthLabel}</Text>
              <Pressable onPress={() => canGoNextMonth && shiftMonth(1)} disabled={!canGoNextMonth} style={styles.monthArrow}>
                <Icon name="chevron-forward" size={14} color={canGoNextMonth ? colors.primary : colors.subtle} />
              </Pressable>
            </View>
          </View>

          {loadingMonth ? (
            <ActivityIndicator color={colors.primary} style={styles.monthLoading} />
          ) : (
            <View style={styles.monthStatsRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`View ${monthSummary.present} present records for ${monthLabel}`} onPress={() => setRecordsCategory('present')} style={[styles.monthStatCard, {borderColor: 'rgba(16,185,129,0.24)'}]}>
                <View style={[styles.monthStatAccent, {backgroundColor: colors.success}]} />
                <Text style={[styles.monthStatValue, {color: colors.success}]}>{String(monthSummary.present).padStart(2, '0')}</Text>
                <Text style={styles.monthStatLabel}>Present</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`View ${monthSummary.absent} absent records for ${monthLabel}`} onPress={() => setRecordsCategory('absent')} style={[styles.monthStatCard, {borderColor: 'rgba(239,68,68,0.22)'}]}>
                <View style={[styles.monthStatAccent, {backgroundColor: colors.danger}]} />
                <Text style={[styles.monthStatValue, {color: colors.danger}]}>{String(monthSummary.absent).padStart(2, '0')}</Text>
                <Text style={styles.monthStatLabel}>Absent</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`View ${monthSummary.late} late in records for ${monthLabel}`} onPress={() => setRecordsCategory('late')} style={[styles.monthStatCard, {borderColor: 'rgba(245,158,11,0.26)'}]}>
                <View style={[styles.monthStatAccent, {backgroundColor: colors.warning}]} />
                <Text style={[styles.monthStatValue, {color: colors.warning}]}>{String(monthSummary.late).padStart(2, '0')}</Text>
                <Text style={styles.monthStatLabel}>Late In</Text>
              </Pressable>
            </View>
          )}

          {!!monthError && <Pressable accessibilityRole="button" onPress={() => loadMonthSummary(monthCursor)}><Text style={styles.messageTextError}>{monthError} Tap to retry.</Text></Pressable>}

          <Pressable onPress={openRequest} style={styles.plusRequestButton}>
            <Icon name="add" size={16} color={colors.primary} />
            <Text style={styles.plusRequestText}>Request</Text>
          </Pressable>
        </Card>

        {geofenceActive && (
          <Card style={styles.geofenceCard}>
            <View style={styles.cardHead}>
              <View style={[styles.cardIcon, styles.geoIconActive]}>
                <Icon name="location-outline" size={18} color={colors.success} />
              </View>
              <Text style={[styles.cardTitle, styles.geoCopy]}>Geofencing</Text>
              <View style={[styles.chip, styles.chipActive]}>
                <Text style={[styles.chipText, styles.chipTextActive]}>{geofenceEnforced ? 'Enforced' : 'Tracking'}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <Stat label="Radius" value={`${geofence?.radiusInMeters || '-'}m`} icon="scan-circle-outline" tone="primary" />
              <View style={styles.statDivider} />
              <Stat
                label="Your Status"
                value={geofenceCheck ? (geofenceCheck.withinFence ? 'Inside office' : 'Outside office') : position ? 'Checking' : 'Need location'}
                icon={locationAllowed ? 'checkmark-circle-outline' : 'close-circle-outline'}
                tone={locationAllowed ? 'success' : 'danger'}
              />
            </View>
            <Text style={[styles.geoStatusText, locationAllowed ? styles.geoStatusOk : styles.geoStatusBlocked]}>
              {geofenceCheck?.distance != null
                ? `${Math.round(Number(geofenceCheck.distance))}m from office boundary center`
                : 'Location permission is mandatory before attendance can be submitted.'}
            </Text>
          </Card>
        )}

      </ScrollView>

      <Modal visible={!!selectedRegularisation} animationType="slide" transparent onRequestClose={() => setSelectedRegularisation(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Pressable onPress={() => setSelectedRegularisation(null)} style={styles.modalClose}>
              <Icon name="close-outline" size={20} color={colors.textMid} />
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <View style={styles.cardHead}>
                <View style={styles.cardIcon}>
                  <Icon name="create-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Request Regularisation</Text>
                  <Text style={styles.cardSub}>{dateText(selectedRegularisation?.attendanceDate)}</Text>
                </View>
              </View>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Reason for correction"
                placeholderTextColor={colors.subtle}
                multiline
                style={styles.reasonInput}
              />
              <View style={styles.formActions}>
                <PrimaryButton title="Submit Request" loading={submittingRegularisation} onPress={submitRegularisation} />
                <PrimaryButton title="Cancel" variant="outline" onPress={() => setSelectedRegularisation(null)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// React Native 0.86 supports the flex `gap` properties used below, but the
// generated project typings still omit them. Keep the runtime styles intact
// while avoiding a false-negative TypeScript build failure.
const styles = StyleSheet.create<Record<string, any>>({
  screen: {flex: 1, backgroundColor: colors.background},
  scroller: {flex: 1},
  content: {paddingBottom: 30},
  hero: {
    backgroundColor: '#17134D',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  stickyLocationHeader: {
    backgroundColor: '#17134D',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  heroLocationRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 6},
  heroLocationIcon: {marginTop: 2},
  heroLocationText: {flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: fonts.medium, lineHeight: 16},
  heroWelcome: {color: colors.white, fontSize: 20, fontFamily: fonts.bold, marginTop: 10},
  heroChipRow: {flexDirection: 'row', gap: 8, marginTop: 14},
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroChipOn: {backgroundColor: 'rgba(16,185,129,0.25)'},
  heroChipOff: {backgroundColor: 'rgba(255,255,255,0.16)'},
  heroChipDot: {width: 6, height: 6, borderRadius: 3},
  heroChipDotOn: {backgroundColor: colors.success},
  heroChipDotOff: {backgroundColor: 'rgba(255,255,255,0.6)'},
  heroChipText: {color: colors.white, fontSize: 11, fontFamily: fonts.semibold, letterSpacing: 0.2},

  clockCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  clockCardTime: {color: colors.text, fontSize: 22, lineHeight: 30, fontFamily: fonts.bold, fontVariant: ['tabular-nums']},
  clockCardDate: {color: colors.muted, fontSize: 12, fontFamily: fonts.medium, marginTop: 3},
  punchButtonShell: {
    height: 52,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  punchPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  punchPillPressed: {opacity: 0.85},
  punchPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 15,
  },
  punchPillText: {color: colors.white, fontSize: 15, fontFamily: fonts.semibold, textAlign: 'center'},

  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  messageSuccess: {backgroundColor: colors.successLight, borderColor: colors.successLight},
  messageError: {backgroundColor: colors.dangerLight, borderColor: colors.dangerLight},
  messageText: {flex: 1, fontSize: 13, fontWeight: '800'},
  messageTextSuccess: {color: colors.success},
  messageTextError: {color: colors.danger},

  quickStatsCard: {padding: 14, borderRadius: 18, marginHorizontal: 16, marginTop: 14, shadowOpacity: 0.06, elevation: 2},
  activityCard: {padding: 14, borderRadius: 18, marginHorizontal: 16, marginTop: 14, shadowOpacity: 0.04, elevation: 1},
  flatCard: {shadowOpacity: 0, shadowRadius: 0, elevation: 0, borderColor: colors.border},
  activityHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8},
  activityCount: {backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5},
  activityCountText: {color: colors.primary, fontSize: 11, fontFamily: fonts.semibold},
  activityRow: {flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 11},
  activityDot: {width: 9, height: 9, borderRadius: 9},
  activityDotComplete: {backgroundColor: colors.success},
  activityDotOpen: {backgroundColor: colors.warning},
  activityTimes: {flex: 1, flexDirection: 'row', gap: 12},
  activityPunch: {flex: 1},
  activityDate: {color: colors.muted, fontSize: 10, fontFamily: fonts.medium, marginTop: 3},
  activityTime: {color: colors.text, fontSize: 12, fontFamily: fonts.semibold},
  activityStatus: {color: colors.muted, fontSize: 11, fontFamily: fonts.medium},
  activityEmpty: {color: colors.muted, fontSize: 12, paddingTop: 2},
  cardHead: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14},
  cardIcon: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  cardTitle: {color: colors.text, fontSize: 16, fontFamily: fonts.bold},
  cardSub: {color: colors.muted, fontSize: 12, fontFamily: fonts.regular, marginTop: 2},

  statsRow: {flexDirection: 'row', alignItems: 'flex-start'},
  statCol: {flex: 1, alignItems: 'center', paddingHorizontal: 4},
  statDivider: {width: 1, backgroundColor: colors.border, marginTop: 4, alignSelf: 'stretch'},
  statIcon: {width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8},
  statValue: {color: colors.text, fontSize: 14, fontFamily: fonts.semibold},
  statDate: {color: colors.muted, fontSize: 10, fontFamily: fonts.medium, marginTop: 3, textAlign: 'center'},
  statLabel: {color: colors.muted, fontSize: 10, fontFamily: fonts.medium, textTransform: 'uppercase', marginTop: 4},

  monthCard: {padding: 16, borderRadius: 18, marginHorizontal: 16, marginTop: 16, shadowOpacity: 0.06, elevation: 2},
  monthHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16},
  geoCopy: {flex: 1},
  monthPicker: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 4, paddingVertical: 4},
  monthArrow: {width: 24, height: 24, alignItems: 'center', justifyContent: 'center'},
  monthPickerText: {color: colors.text, fontSize: 12, fontFamily: fonts.semibold, minWidth: 60, textAlign: 'center'},
  monthLoading: {paddingVertical: 20},
  monthStatsRow: {flexDirection: 'row', gap: 10},
  monthStatCard: {
    flex: 1,
    minHeight: 94,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.white,
    paddingVertical: 13,
    alignItems: 'center',
    overflow: 'hidden',
  },
  monthStatAccent: {position: 'absolute', top: 0, left: 18, right: 18, height: 3, borderRadius: 999},
  monthStatValue: {fontSize: 20, fontFamily: fonts.bold},
  monthStatLabel: {color: colors.textMid, fontSize: 12, fontFamily: fonts.medium, marginTop: 5},
  plusRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  plusRequestText: {color: colors.primary, fontSize: 13, fontFamily: fonts.semibold},

  geofenceCard: {padding: 14, borderRadius: 16, marginHorizontal: 16, marginTop: 16},
  geoIconActive: {backgroundColor: colors.successLight},
  geoStatusText: {fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 12},
  geoStatusOk: {color: colors.success},
  geoStatusBlocked: {color: colors.danger},

  chip: {borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5},
  chipActive: {backgroundColor: colors.successLight},
  chipText: {fontSize: 11, fontWeight: '900'},
  chipTextActive: {color: colors.success},

  formCard: {padding: 14, borderRadius: 16, marginHorizontal: 16, marginTop: 16},
  reasonInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: colors.surfaceAlt,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  formActions: {gap: 10},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end'},
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 24,
  },
  modalContent: {paddingHorizontal: 16, paddingTop: 12},
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
});
