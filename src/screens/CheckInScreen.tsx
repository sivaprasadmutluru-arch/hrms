import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Card from '../components/Card';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {captureCurrentLocation, Position, reverseGeocode} from '../utils/location';
import {dateText, employeeName, workDuration} from '../utils/format';

const REQUEST_TYPES = [
  {value: 'LATE_ARRIVAL', label: 'Late Arrival'},
  {value: 'MISSING_PUNCH', label: 'Missing Punch'},
  {value: 'WORKING_HOURS_CORRECTION', label: 'Hours Correction'},
  {value: 'OVERTIME_REQUEST', label: 'Overtime'},
  {value: 'WRONG_STATUS', label: 'Wrong Status'},
  {value: 'HALF_TO_FULL_DAY', label: 'Half to Full Day'},
  {value: 'WORK_FROM_HOME', label: 'Work From Home'},
  {value: 'OFFICIAL_DUTY', label: 'Official Duty'},
];

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
  icon,
  tone = 'primary',
}: {
  label: string;
  value?: string | number | null;
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
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({pressed}) => [
        styles.punchPill,
        isClockedIn ? styles.punchPillOut : styles.punchPillIn,
        (pressed || loading) && styles.punchPillPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <>
          <Icon name={isClockedIn ? 'log-out-outline' : 'log-in-outline'} size={15} color={colors.white} />
          <Text style={styles.punchPillText}>{isClockedIn ? 'Check Out' : 'Check In'}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const {user, profile} = useAuth();
  const [clock, setClock] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [workInfo, setWorkInfo] = useState<any>(null);
  const [geofence, setGeofence] = useState<any>(null);
  const [geofenceCheck, setGeofenceCheck] = useState<any>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedRegularisation, setSelectedRegularisation] = useState<any>(null);
  const [requestType, setRequestType] = useState(REQUEST_TYPES[1].value);
  const [reason, setReason] = useState('');
  const [submittingRegularisation, setSubmittingRegularisation] = useState(false);
  const [tick, setTick] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [monthSummary, setMonthSummary] = useState({present: 0, absent: 0, late: 0});
  const [loadingMonth, setLoadingMonth] = useState(false);

  const loadStatus = useCallback(async () => {
    setMessage('');
    const [clockRes, attendanceRes, workRes, geoRes] = await Promise.allSettled([
      api.clockStatus(),
      api.myAttendance({page: 0, size: 10, sort: 'attendanceDate,desc'}),
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
    setLoadingMonth(true);
    try {
      const {from, to} = monthRange(cursor);
      const res = await api.attendanceFullView({from, to, page: 0, size: 62});
      const counts = {present: 0, absent: 0, late: 0};
      asArray(res).forEach((row: any) => {
        const status = String(row?.displayStatus || '').toUpperCase();
        if (status === 'REGULAR' || status === 'REGULARISED') counts.present += 1;
        else if (status === 'IRREGULAR') counts.late += 1;
        else if (status === 'ABSENT') counts.absent += 1;
      });
      setMonthSummary(counts);
    } catch {
      setMonthSummary({present: 0, absent: 0, late: 0});
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadMonthSummary(monthCursor);
  }, [monthCursor, loadMonthSummary]);

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

  const liveTime = useMemo(() => new Date(), [tick]);
  const wallClockLabel = liveTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  const wallDateLabel = liveTime.toLocaleDateString(undefined, {weekday: 'short', day: 'numeric', month: 'short'});

  const isClockedIn = !!clock?.online;
  const workedSeconds = useMemo(() => elapsedSeconds(clock, todayRecord), [clock, todayRecord, tick]);
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
      ? 'Fetching address…'
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
      reverseGeocode(current.coords.latitude, current.coords.longitude).then(setResolvedAddress);
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
        requestType,
        reason: reason.trim(),
      });
      setSelectedRegularisation(null);
      setReason('');
      setRequestType(REQUEST_TYPES[1].value);
      await loadStatus();
      Alert.alert('Regularisation', 'Request submitted successfully.');
    } catch (err: any) {
      Alert.alert('Regularisation', err.message || 'Failed to submit request.');
    } finally {
      setSubmittingRegularisation(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.heroBackdrop, {height: (heroHeight || 220) + (stickyHeaderHeight || insets.top + 50)}]} pointerEvents="none" />
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View
          style={[styles.hero, {paddingTop: (stickyHeaderHeight || insets.top + 50) + 18}]}
          onLayout={event => setHeroHeight(event.nativeEvent.layout.height)}>

          <Text style={styles.heroWelcome}>Welcome, {employeeName(profile)}</Text>

          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{(workInfo?.shiftName || profile?.shiftName || 'General Shift').toUpperCase()}</Text>
            </View>
            <View style={[styles.heroChip, isClockedIn ? styles.heroChipOn : styles.heroChipOff]}>
              <View style={[styles.heroChipDot, isClockedIn ? styles.heroChipDotOn : styles.heroChipDotOff]} />
              <Text style={styles.heroChipText}>{isClockedIn ? 'Checked In' : 'Not Checked In'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.clockCard}>
          <View>
            <Text style={styles.clockCardTime}>{wallClockLabel}</Text>
            <Text style={styles.clockCardDate}>{wallDateLabel}</Text>
          </View>
          <PunchPill isClockedIn={isClockedIn} onPress={submit} loading={loading || locating} />
        </View>

        <Card style={styles.quickStatsCard}>
          <View style={styles.statsRow}>
            <Stat label="Check In" value={displayTime(todayRecord?.checkIn, clock?.checkIn)} icon="log-in-outline" tone="success" />
            <View style={styles.statDivider} />
            <Stat label="Check Out" value={displayTime(todayRecord?.checkOut, clock?.checkOut)} icon="log-out-outline" tone="purple" />
            <View style={styles.statDivider} />
            <Stat label="Working Hrs" value={workedLabel} icon="timer-outline" tone="info" />
          </View>
        </Card>

        {!!message && (
          <View style={[styles.messageBanner, isSuccessMessage ? styles.messageSuccess : styles.messageError]}>
            <Icon name={isSuccessMessage ? 'checkmark-circle' : 'alert-circle'} size={16} color={isSuccessMessage ? colors.success : colors.danger} />
            <Text style={[styles.messageText, isSuccessMessage ? styles.messageTextSuccess : styles.messageTextError]}>{message}</Text>
          </View>
        )}

        <Card style={styles.monthCard}>
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
              <View style={[styles.monthStatCard, {backgroundColor: colors.successLight}]}>
                <Text style={[styles.monthStatValue, {color: colors.success}]}>{String(monthSummary.present).padStart(2, '0')}</Text>
                <Text style={styles.monthStatLabel}>Present</Text>
              </View>
              <View style={[styles.monthStatCard, {backgroundColor: colors.dangerLight}]}>
                <Text style={[styles.monthStatValue, {color: colors.danger}]}>{String(monthSummary.absent).padStart(2, '0')}</Text>
                <Text style={styles.monthStatLabel}>Absent</Text>
              </View>
              <View style={[styles.monthStatCard, {backgroundColor: colors.warningLight}]}>
                <Text style={[styles.monthStatValue, {color: colors.warning}]}>{String(monthSummary.late).padStart(2, '0')}</Text>
                <Text style={styles.monthStatLabel}>Late In</Text>
              </View>
            </View>
          )}

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

        {selectedRegularisation && (
          <Card style={styles.formCard}>
            <View style={styles.cardHead}>
              <View style={styles.cardIcon}>
                <Icon name="create-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Request Regularisation</Text>
                <Text style={styles.cardSub}>{dateText(selectedRegularisation.attendanceDate)}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {REQUEST_TYPES.map(type => (
                <Pressable
                  key={type.value}
                  onPress={() => setRequestType(type.value)}
                  style={[styles.typeChip, requestType === type.value && styles.typeChipActive]}>
                  <Text style={[styles.typeChipText, requestType === type.value && styles.typeChipTextActive]}>{type.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
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
          </Card>
        )}

      </ScrollView>

      <View
        style={styles.stickyLocationHeader}
        onLayout={event => setStickyHeaderHeight(event.nativeEvent.layout.height)}>
        <View style={[styles.heroLocationRow, {paddingTop: insets.top + 12}]}>
          <Icon name="location" size={13} color="rgba(255,255,255,0.85)" style={styles.heroLocationIcon} />
          <Text style={styles.heroLocationText} numberOfLines={2}>{locationLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  scroller: {flex: 1},
  content: {paddingBottom: 30},
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.sidebar,
  },

  hero: {
    backgroundColor: colors.sidebar,
    paddingHorizontal: 20,
    paddingBottom: 46,
  },
  stickyLocationHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.sidebar,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  heroLocationRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 6},
  heroLocationIcon: {marginTop: 2},
  heroLocationText: {flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', lineHeight: 16},
  heroWelcome: {color: colors.white, fontSize: 22, fontWeight: '900', marginTop: 10},
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
  heroChipText: {color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.3},

  clockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginTop: -30,
    shadowColor: '#101828',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  clockCardTime: {color: colors.text, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums']},
  clockCardDate: {color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3},

  punchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  punchPillIn: {backgroundColor: colors.primary},
  punchPillOut: {backgroundColor: colors.danger},
  punchPillPressed: {opacity: 0.85},
  punchPillText: {color: colors.white, fontSize: 13, fontWeight: '900'},

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

  quickStatsCard: {padding: 14, borderRadius: 16, marginHorizontal: 16, marginTop: 18},
  cardHead: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14},
  cardIcon: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  cardTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  cardSub: {color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2},

  statsRow: {flexDirection: 'row', alignItems: 'flex-start'},
  statCol: {flex: 1, alignItems: 'center', paddingHorizontal: 4},
  statDivider: {width: 1, backgroundColor: colors.border, marginTop: 4, alignSelf: 'stretch'},
  statIcon: {width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8},
  statValue: {color: colors.text, fontSize: 13, fontWeight: '900'},
  statLabel: {color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 3},

  monthCard: {padding: 16, borderRadius: 16, marginHorizontal: 16, marginTop: 16},
  monthHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16},
  geoCopy: {flex: 1},
  monthPicker: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 4, paddingVertical: 4},
  monthArrow: {width: 24, height: 24, alignItems: 'center', justifyContent: 'center'},
  monthPickerText: {color: colors.text, fontSize: 12, fontWeight: '900', minWidth: 60, textAlign: 'center'},
  monthLoading: {paddingVertical: 20},
  monthStatsRow: {flexDirection: 'row', gap: 10},
  monthStatCard: {flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center'},
  monthStatValue: {fontSize: 22, fontWeight: '900'},
  monthStatLabel: {color: colors.textMid, fontSize: 11, fontWeight: '800', marginTop: 4},
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
  plusRequestText: {color: colors.primary, fontSize: 13, fontWeight: '900'},

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
  typeRow: {gap: 8, paddingBottom: 12},
  typeChip: {borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 7},
  typeChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  typeChipText: {color: colors.textMid, fontSize: 12, fontWeight: '900'},
  typeChipTextActive: {color: colors.white},
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
});
