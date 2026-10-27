import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import Icon from '../components/Icon';
import LeaveAttachments from '../components/LeaveAttachments';
import TeamDateField from '../components/TeamDateField';
import {colors} from '../theme/colors';
import {dateText, timeText} from '../utils/format';
import {pendingReview, teamRecords, validTeamRange} from '../utils/myTeam';

type Section = 'Employees' | 'Leave' | 'Attendance' | 'Regularisation';
type Decision = {kind: 'leave' | 'regularisation'; action: 'approve' | 'reject'; item: any};
const sections: Section[] = ['Employees', 'Leave', 'Attendance', 'Regularisation'];
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function MyTeamScreen() {
  const {user, profile} = useAuth();
  const insets = useSafeAreaInsets();
  const companyId = profile?.companyId || user?.companyId;
  const companyName = profile?.companyName || user?.companyName || 'Your company';
  const today = new Date();
  const [range, setRange] = useState({from: localDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: localDate(today)});
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);
  const [dateError, setDateError] = useState('');
  const [section, setSection] = useState<Section>('Employees');
  const [members, setMembers] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [regularisations, setRegularisations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [picker, setPicker] = useState(false);
  const [status, setStatus] = useState('PENDING');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const mutation = useRef(false);
  const currentCompany = useRef(companyId);
  currentCompany.current = companyId;

  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true); setError('');
    try {
      if (!companyId) throw new Error('Your employee company is unavailable. Refresh your profile or sign in again.');
      const results = await Promise.all([api.teamEmployees(companyId), api.teamLeaves(companyId),
        api.teamAttendance(companyId, range.from, range.to), api.teamRegularisations(companyId)]);
      if (version !== request.current) return;
      if (results.some(result => !Array.isArray(result))) throw new Error('Unable to read the team response. Please contact support.');
      const roster = results[0].filter(member => String(member.companyId) === String(companyId));
      const ids = new Set(roster.map(member => String(member.id)));
      const scoped = (rows: any[]) => rows.filter(item => ids.has(String(item.employeeId))
        && (item.companyId == null || String(item.companyId) === String(companyId)));
      setMembers(roster); setLeaves(scoped(results[1])); setAttendance(scoped(results[2])); setRegularisations(scoped(results[3]));
      setEmployeeId(previous => roster.some(member => String(member.id) === previous) ? previous : '');
    } catch (err: any) {
      if (version === request.current) {
        setMembers([]); setLeaves([]); setAttendance([]); setRegularisations([]);
        setError(err?.message || 'Unable to load your team.');
      }
    } finally { if (version === request.current) setLoading(false); }
  }, [companyId, range.from, range.to]);

  useEffect(() => {
    setMembers([]); setLeaves([]); setAttendance([]); setRegularisations([]);
    load();
    return () => { request.current += 1; };
  }, [load]);
  useEffect(() => {setDecision(null); setEmployeeId(''); setSearch('');}, [companyId]);
  useEffect(() => {setSearch('');}, [section]);

  const pendingLeaves = leaves.filter(pendingReview).length;
  const pendingRegularisations = regularisations.filter(pendingReview).length;
  const selectedMember = members.find(member => String(member.id) === employeeId);
  const visibleMembers = members.filter(member => String(`${member.fullName} ${member.badgeId || ''} ${member.departmentName || ''}`).toLowerCase().includes(search.trim().toLowerCase()));
  const records = teamRecords(section === 'Leave' ? leaves : section === 'Regularisation' ? regularisations : attendance,
    employeeId, search, section === 'Attendance' ? 'ALL' : status)
    .sort((a, b) => String(b.attendanceDate || b.startDate || '').localeCompare(String(a.attendanceDate || a.startDate || '')));

  function openDecision(item: any, action: Decision['action']) {
    if (!pendingReview(item) || loading || mutation.current) return;
    setDecision({item, action, kind: section === 'Leave' ? 'leave' : 'regularisation'});
    setReason(''); setActionError('');
  }
  async function confirmDecision() {
    if (!decision || !companyId || mutation.current) return;
    if (decision.action === 'reject' && !reason.trim()) {setActionError('Enter a rejection reason.'); return;}
    if (!pendingReview(decision.item)) return;
    mutation.current = true; setBusy(true); setActionError('');
    const actionCompany = companyId;
    try {
      if (decision.kind === 'leave') await api.decideTeamLeave(decision.item.id, decision.action, companyId, reason.trim());
      else await api.decideTeamRegularisation(decision.item.id, decision.action, companyId, reason.trim());
      if (currentCompany.current === actionCompany) {setDecision(null); await load();}
    } catch (err: any) {
      if (currentCompany.current === actionCompany) setActionError(err?.message || 'Unable to update the request. Refresh and try again.');
    } finally {mutation.current = false; setBusy(false);}
  }
  function employeeView(member: any, target: Section) {setEmployeeId(String(member.id)); setSection(target); setStatus('ALL');}
  const button = (label: string, onPress: () => void, danger = false, disabled = false, accessibilityLabel = label) => (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={onPress}
      style={[styles.button, danger ? styles.danger : styles.primary, disabled && {opacity: .5}]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );

  return <View style={styles.screen}>
    <LinearGradient colors={[colors.sidebar, colors.primaryDark]} style={[styles.header, {paddingTop: insets.top + 14}]}>
      <View style={styles.row}><Icon name="people-outline" size={27} color="white" /><Text style={styles.headerTitle}>My Team</Text></View>
      <Text style={styles.headerText}>{companyName}</Text>
      <Text style={styles.headerText}>{loading ? 'Loading your team...' : `${members.length} direct reports`} · Only your assigned employees</Text>
    </LinearGradient>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={styles.row}>
        <Pressable accessibilityLabel="Pending team leave" style={styles.summary} onPress={() => {setSection('Leave'); setStatus('PENDING'); setEmployeeId('');}}>
          <Text style={styles.count}>{pendingLeaves}</Text><Text style={styles.label}>Pending leave</Text>
        </Pressable>
        <Pressable accessibilityLabel="Pending team regularisations" style={styles.summary} onPress={() => {setSection('Regularisation'); setStatus('PENDING'); setEmployeeId('');}}>
          <Text style={styles.count}>{pendingRegularisations}</Text><Text style={styles.label}>Pending regularisations</Text>
        </Pressable>
      </View>
      <View style={styles.sectionGrid}>{sections.map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={`Team ${value}`} accessibilityState={{selected: section === value}}
        onPress={() => {setSection(value); setStatus('PENDING');}} style={[styles.sectionButton, section === value && styles.selected]}>
        <Text style={[styles.label, section === value && {color: 'white'}]}>{value}</Text>
      </Pressable>)}</View>
      {!!error && <View style={styles.card}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{button('Retry team loading', load)}</View>}
      {!error && !loading && !members.length && <Text style={styles.hint}>No active direct reports are assigned to you in this company.</Text>}
      {section !== 'Employees' && <Pressable accessibilityLabel="Filter team employee" style={styles.filter} onPress={() => setPicker(true)}>
        <Text style={styles.label}>{selectedMember?.fullName || 'All team employees'}</Text><Icon name="chevron-down-outline" size={18} color={colors.primary} />
      </Pressable>}
      <TextInput accessibilityLabel="Search my team" placeholder={section === 'Employees' ? 'Search employee, badge or department' : 'Search employee or request'} placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={styles.input} />
      {section === 'Attendance' && <View style={styles.card}>
        <Text style={styles.title}>Attendance date range</Text>
        <View style={styles.row}><TeamDateField label="Attendance from" value={draftFrom} onChange={setDraftFrom} />
          <TeamDateField label="Attendance to" value={draftTo} onChange={setDraftTo} /></View>
        {button('Apply attendance dates', () => {
          if (!validTeamRange(draftFrom, draftTo)) {setDateError('Enter valid YYYY-MM-DD dates in order, no more than one year apart.'); return;}
          setDateError('');
          if (range.from === draftFrom && range.to === draftTo) load();
          else setRange({from: draftFrom, to: draftTo});
        }, false, loading)}
        {!!dateError && <Text accessibilityRole="alert" style={styles.error}>{dateError}</Text>}
        <Text style={styles.hint}>Showing recorded attendance. Missing records are not automatically classified as absent.</Text>
      </View>}
      {(section === 'Leave' || section === 'Regularisation') && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statuses}>
        {['PENDING', 'ALL', 'APPROVED', 'REJECTED', ...(section === 'Leave' ? ['CANCELLED'] : [])].map(value => <Pressable key={value} accessibilityLabel={`Team status ${value}`} onPress={() => setStatus(value)} style={[styles.chip, status === value && styles.selected]}>
          <Text style={[styles.label, status === value && {color: 'white'}]}>{value === 'PENDING' ? 'Pending' : value.charAt(0) + value.slice(1).toLowerCase()}</Text>
        </Pressable>)}
      </ScrollView>}
      {loading && <ActivityIndicator accessibilityLabel="Loading my team" color={colors.primary} />}
      {!loading && !error && section === 'Employees' && visibleMembers.map(member => <View key={member.id} style={styles.card}>
        <Text style={styles.title}>{member.fullName}</Text><Text style={styles.hint}>{[member.badgeId, member.departmentName, member.jobPositionName].filter(Boolean).join(' · ') || 'Direct report'}</Text>
        <View style={styles.row}>{button('Attendance', () => employeeView(member, 'Attendance'), false, false, `Attendance for ${member.fullName}`)}{button('Leave history', () => employeeView(member, 'Leave'), false, false, `Leave history for ${member.fullName}`)}</View>
      </View>)}
      {!loading && !error && section !== 'Employees' && records.map(item => <View key={item.id} style={styles.card}>
        <Text style={styles.title}>{item.employeeName}</Text>
        <Text style={styles.badge}>{item.status || item.attendanceStatus || 'Recorded'}</Text>
        {section === 'Leave' ? <>
          <Text style={styles.label}>{item.leaveTypeName} · {item.requestedDays ?? '-'} day(s)</Text>
          <Text style={styles.hint}>{dateText(item.startDate)} to {dateText(item.endDate)} · {String(item.leaveDuration || 'FULL_DAY').replace(/_/g, ' ')}</Text>
          <Text style={styles.body}>Reason: {item.description || 'Not provided'}</Text>
          {!!item.approvedByName && <Text style={styles.hint}>Approved by {item.approvedByName}</Text>}
          {!!item.rejectReason && <Text style={styles.error}>Rejection: {item.rejectReason}</Text>}
          <LeaveAttachments request={item} companyId={companyId} />
        </> : section === 'Attendance' ? <>
          <Text style={styles.label}>{dateText(item.attendanceDate)}</Text>
          <View style={styles.metrics}><Text style={styles.body}>In {timeText(item.checkIn)}</Text><Text style={styles.body}>Out {timeText(item.checkOut)}</Text><Text style={styles.body}>{item.workedHour == null ? '-' : `${Number(item.workedHour).toFixed(2)} h`}</Text></View>
          {!!item.shiftName && <Text style={styles.hint}>Shift: {item.shiftName}</Text>}
          {!!item.checkInAddress && <Text style={styles.hint}>In location: {item.checkInAddress}</Text>}
          {!!item.checkOutAddress && <Text style={styles.hint}>Out location: {item.checkOutAddress}</Text>}
        </> : <>
          <Text style={styles.label}>{dateText(item.attendanceDate)} · {String(item.requestType || 'Correction').replace(/_/g, ' ')}</Text>
          <Text style={styles.body}>Reason: {item.reason || 'Not provided'}</Text>
          <Text style={styles.hint}>Requested in: {timeText(item.requestedCheckIn)} · Out: {timeText(item.requestedCheckOut)}</Text>
          {item.requestedOvertimeHours != null && <Text style={styles.hint}>Requested overtime: {item.requestedOvertimeHours} h</Text>}
          {!!item.rejectionRemarks && <Text style={styles.error}>Rejection: {item.rejectionRemarks}</Text>}
        </>}
        {section !== 'Attendance' && pendingReview(item) && <View style={styles.actions}>
          {button('Approve', () => openDecision(item, 'approve'), false, busy, `Approve ${item.employeeName}`)}
          {button('Reject', () => openDecision(item, 'reject'), true, busy, `Reject ${item.employeeName}`)}
        </View>}
      </View>)}
      {!loading && !error && members.length > 0 && (section === 'Employees' ? !visibleMembers.length : !records.length) && <Text style={styles.hint}>No matching {section === 'Employees' ? 'employees' : section.toLowerCase() + ' records'}.</Text>}
    </ScrollView>
    <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
      <View style={styles.overlay}><View style={styles.dialog}><Text style={styles.title}>Choose team employee</Text><ScrollView>
        {[{id: '', fullName: 'All team employees'}, ...members].map(member => <Pressable accessibilityLabel={`Select ${member.fullName}`} key={member.id} style={styles.option} onPress={() => {setEmployeeId(String(member.id)); setPicker(false);}}><Text style={styles.label}>{member.fullName}</Text></Pressable>)}
      </ScrollView>{button('Close employee filter', () => setPicker(false))}</View></View>
    </Modal>
    <Modal visible={!!decision} transparent animationType="fade" onRequestClose={() => {if (!busy) setDecision(null);}}>
      <View style={styles.overlay}><View style={styles.dialog}>
        <Text style={styles.title}>{decision?.action === 'approve' ? 'Approve' : 'Reject'} {decision?.kind === 'leave' ? 'leave' : 'regularisation'} request</Text>
        <Text style={styles.body}>{decision?.item.employeeName}</Text>
        <Text style={styles.hint}>{dateText(decision?.item.startDate || decision?.item.attendanceDate)}{decision?.item.endDate ? ` to ${dateText(decision.item.endDate)}` : ''}</Text>
        {decision?.kind === 'leave' && <LeaveAttachments request={decision.item} companyId={companyId} />}
        {decision?.action === 'reject' ? <TextInput accessibilityLabel="Team rejection reason" placeholder="Rejection reason (required)" value={reason} onChangeText={setReason} multiline style={[styles.input, {minHeight: 80}]} editable={!busy} /> : <Text style={styles.body}>Confirm that you have reviewed this request.</Text>}
        {!!actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
        <View style={styles.actions}>{button('Cancel team decision', () => setDecision(null), false, busy)}{button(busy ? 'Saving decision...' : 'Confirm team decision', confirmDecision, decision?.action === 'reject', busy)}</View>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  header: {paddingHorizontal: 18, paddingBottom: 18, gap: 6}, headerTitle: {fontSize: 26, fontWeight: '700', color: 'white'}, headerText: {fontSize: 13, color: 'white'},
  content: {padding: 16, gap: 12, paddingBottom: 28}, row: {flexDirection: 'row', gap: 10, alignItems: 'center'}, flex: {flex: 1},
  summary: {flex: 1, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, padding: 14, minHeight: 90}, count: {fontSize: 26, fontWeight: '700', color: colors.primary},
  title: {fontSize: 17, fontWeight: '700', color: colors.text}, label: {fontSize: 13, fontWeight: '600', color: colors.textMid}, body: {fontSize: 14, lineHeight: 21, color: colors.text}, hint: {fontSize: 13, lineHeight: 19, color: colors.muted}, error: {fontSize: 13, color: colors.danger, lineHeight: 20},
  card: {backgroundColor: 'white', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, gap: 9},
  sectionGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, sectionButton: {width: '48%', paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white'}, selected: {backgroundColor: colors.primary, borderColor: colors.primary},
  input: {backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14},
  filter: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, backgroundColor: 'white', borderRadius: 11, borderWidth: 1, borderColor: colors.border},
  button: {flex: 1, borderRadius: 10, minHeight: 44, padding: 11, alignItems: 'center', justifyContent: 'center'}, primary: {backgroundColor: colors.primary}, danger: {backgroundColor: colors.danger}, buttonText: {color: 'white', fontSize: 12, fontWeight: '700', textAlign: 'center'},
  statuses: {gap: 8}, chip: {borderRadius: 20, backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border},
  actions: {flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12}, badge: {fontSize: 12, color: colors.primaryDark, fontWeight: '700'}, metrics: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, backgroundColor: colors.surfaceAlt, padding: 12, borderRadius: 10},
  overlay: {flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,.45)'}, dialog: {maxHeight: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, gap: 14}, option: {paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border},
});
