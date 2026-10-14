import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {api, API_BASE_URL} from '../api/client';
import {colors} from '../theme/colors';
import {assignableCompanyRoles, companyRoleMembers, COMPANY_ROLE_PAGES, RoleMember} from '../utils/companyRoles';
import {loadDocumentEmployees} from '../utils/employeeDocuments';
import {roleLabel} from '../utils/roles';
import AssignCompanyRoleModal from './AssignCompanyRoleModal';
import Icon from './Icon';

type Props = {companies: any[]; selectedCompanyId: number | string; onSelectCompany: (id: number | string) => void; page: string; onSelectPage: (page: string) => void; callerRoles: string[]; callerUserId?: number | string; companiesError?: string; onReloadCompanies?: () => void};

export default function CompanyRoles({companies, selectedCompanyId, onSelectCompany, page, onSelectPage, callerRoles, callerUserId, companiesError, onReloadCompanies}: Props) {
  const company = companies.find(item => String(item.id) === String(selectedCompanyId));
  const [members, setMembers] = useState<RoleMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [target, setTarget] = useState<RoleMember | null>(null);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const currentCompanyId = useRef(selectedCompanyId);
  currentCompanyId.current = selectedCompanyId;
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setMembers([]); setTarget(null); setError('');
    if (!company) {setLoading(false); return;}
    setLoading(true);
    try {
      const employees = await loadDocumentEmployees(api.companyEmployees, company);
      const assignments = await api.companyUserRoles(company.id);
      const users = await api.assignableUsers(company.id);
      if (id === requestId.current) setMembers(companyRoleMembers(employees, users, assignments, company.id));
    } catch (err: any) {if (id === requestId.current) setError(err?.message || 'Unable to load company roles.');}
    finally {if (id === requestId.current) setLoading(false);}
  }, [company]);
  useEffect(() => {setQuery(''); setMessage(''); load(); return () => {requestId.current += 1;};}, [load]);
  const scopedMembers = members.filter(member => String(member.companyId) === String(selectedCompanyId));
  const filtered = scopedMembers.filter(member => [member.name, member.email, member.departmentName, ...member.assignments.map(item => `${item.roleName} ${roleLabel(item.roleName || '')} ${item.accessScope}`)].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const allowedRoles = company ? assignableCompanyRoles(callerRoles, company) : [];
  return <>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={companiesError ? onReloadCompanies : load} />} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Company</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Select roles company" onPress={() => setPickerOpen(true)} style={styles.selector}><Icon name="business-outline" size={18} color={colors.primary} /><Text style={styles.selectorText}>{company?.name || 'Select company'}</Text><Icon name="chevron-down-outline" size={18} color={colors.muted} /></Pressable>
      <View style={styles.tabs}>{COMPANY_ROLE_PAGES.map(name => <Pressable key={name} accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{selected: name === page}} style={[styles.tab, name === page && styles.activeTab]} onPress={() => onSelectPage(name)}><Text style={[styles.tabText, name === page && styles.activeTabText]}>{name}</Text></Pressable>)}</View>
      <View style={styles.searchBox}><Icon name="search-outline" size={18} color={colors.muted} /><TextInput accessibilityLabel="Search company employees and roles" value={query} onChangeText={setQuery} placeholder="Search employee, email or role" placeholderTextColor={colors.subtle} style={styles.searchInput} /></View>
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      {loading ? <ActivityIndicator color={colors.primary} style={styles.state} /> : error || companiesError ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error || companiesError}</Text><Pressable accessibilityRole="button" onPress={companiesError ? onReloadCompanies : load} style={styles.retry}><Icon name="refresh-outline" size={16} color={colors.primary} /><Text style={styles.actionText}>Retry</Text></Pressable></View> : !company ? <Text style={styles.stateText}>Select a company.</Text> : <>
        <Text style={styles.count}>{filtered.length} people · {scopedMembers.reduce((count, member) => count + member.assignments.length, 0)} role assignments</Text>
        {filtered.map(member => {
          const photo = member.photoPath ? member.photoPath.startsWith('http') ? member.photoPath : `${API_BASE_URL}/files/${member.photoPath.replace(/^\//, '')}` : null;
          return <View key={member.key} style={styles.card}>
            <View style={styles.personRow}>
              {photo ? <Image source={{uri: photo}} style={styles.avatar} /> : <View style={styles.avatar}><Icon name="person-outline" size={24} color={colors.primary} /></View>}
              <View style={styles.personCopy}><Text style={styles.name}>{member.name}</Text>{!!member.email && <Text style={styles.secondary}>{member.email}</Text>}{!!member.departmentName && <Text style={styles.secondary}>{member.departmentName}</Text>}</View>
              {!!allowedRoles.length && member.userId != null && <Pressable accessibilityRole="button" accessibilityLabel={`Assign role to ${member.name}`} onPress={() => setTarget(member)} style={styles.assignAction}><Icon name="add-outline" size={16} color={colors.primary} /><Text style={styles.actionText}>Assign</Text></Pressable>}
            </View>
            {member.assignments.length ? member.assignments.map(assignment => <View key={String(assignment.id)} style={styles.assignment}>
              <View style={styles.roleHeading}><Icon name="shield-outline" size={14} color={colors.info} /><Text style={styles.roleName}>{roleLabel(assignment.roleName || '')}</Text><Text style={styles.roleStatus}>{assignment.assignmentStatus || 'ACTIVE'}</Text></View>
              <Text style={styles.scope}>{roleLabel(assignment.accessScope || '')}{assignment.accessLevel === 'PARTIAL' ? ' · Partial (no Payroll)' : ''}{assignment.departmentId ? ` · Department ${assignment.departmentId}` : ''}</Text>
              {!!assignment.effectiveFrom && <Text style={styles.secondary}>From {assignment.effectiveFrom}{assignment.expiresOn ? ` · To ${assignment.expiresOn}` : ''}</Text>}
            </View>) : <Text style={styles.noRoles}>{member.userId == null ? 'No linked login account' : 'No role assignments in this company'}</Text>}
          </View>;
        })}
        {!filtered.length && <Text style={styles.stateText}>No matching employees or users in this company.</Text>}
      </>}
    </ScrollView>
    <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
      <View style={styles.backdrop}><View style={styles.picker}>
        <View style={styles.pickerHeader}><Text style={styles.pickerTitle}>Company</Text><Pressable accessibilityLabel="Close roles company selector" onPress={() => setPickerOpen(false)} style={styles.close}><Icon name="close-outline" size={22} color={colors.text} /></Pressable></View>
        <TextInput accessibilityLabel="Search roles companies" value={companyQuery} onChangeText={setCompanyQuery} placeholder="Search companies" placeholderTextColor={colors.subtle} style={styles.companySearch} />
        <ScrollView keyboardShouldPersistTaps="handled">{companies.filter(item => String(item.name).toLowerCase().includes(companyQuery.toLowerCase())).map(item => <Pressable key={String(item.id)} accessibilityRole="button" accessibilityLabel={`Roles company: ${item.name}`} onPress={() => {onSelectCompany(item.id); setPickerOpen(false); setCompanyQuery('');}} style={styles.companyOption}><Text style={styles.selectorText}>{item.name}</Text>{String(item.id) === String(selectedCompanyId) && <Icon name="checkmark-outline" size={20} color={colors.primary} />}</Pressable>)}</ScrollView>
      </View></View>
    </Modal>
    {!!target && !!company && String(target.companyId) === String(company.id) && <AssignCompanyRoleModal key={`${company.id}:${target.userId}`} company={company} member={target} callerRoles={callerRoles} callerUserId={callerUserId} onClose={() => setTarget(null)} onAssigned={() => {
      if (String(currentCompanyId.current) !== String(company.id)) return;
      setTarget(null); setMessage(`Role assigned to ${target.name} in ${company.name}.`); load();
    }} />}
  </>;
}

const styles = StyleSheet.create({
  content: {padding: 16, paddingBottom: 32},
  label: {fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6},
  selector: {minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  selectorText: {flex: 1, fontSize: 14, color: colors.text, fontWeight: '600'},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginVertical: 12},
  tab: {flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent'},
  activeTab: {borderBottomColor: colors.primary},
  tabText: {fontSize: 14, color: colors.muted},
  activeTabText: {color: colors.primary, fontWeight: '700'},
  searchBox: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, marginBottom: 12},
  searchInput: {flex: 1, minHeight: 44, color: colors.text, fontSize: 13},
  count: {fontSize: 12, color: colors.muted, marginBottom: 12},
  card: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: colors.white},
  personRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  avatar: {width: 40, height: 40, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  personCopy: {flex: 1, minWidth: 0},
  name: {fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.text},
  secondary: {fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 3},
  assignAction: {minHeight: 44, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 4},
  actionText: {fontSize: 12, fontWeight: '600', color: colors.primary},
  assignment: {borderTopWidth: 1, borderColor: colors.border, marginTop: 10, paddingTop: 10},
  roleHeading: {flexDirection: 'row', alignItems: 'center', gap: 6},
  roleName: {flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600', color: colors.text},
  roleStatus: {fontSize: 9, color: colors.muted, fontWeight: '700'},
  scope: {fontSize: 11, color: colors.textMid, marginTop: 3},
  noRoles: {fontSize: 12, color: colors.muted, marginTop: 10},
  state: {paddingVertical: 24, alignItems: 'center'},
  stateText: {padding: 16, fontSize: 13, color: colors.muted, textAlign: 'center'},
  error: {fontSize: 13, lineHeight: 18, color: colors.danger},
  retry: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8},
  message: {fontSize: 13, color: colors.success, marginBottom: 12},
  backdrop: {flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 20},
  picker: {maxHeight: '75%', padding: 16, borderRadius: 8, backgroundColor: colors.white},
  pickerHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  pickerTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  companySearch: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 14, marginVertical: 12},
  companyOption: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border},
});
