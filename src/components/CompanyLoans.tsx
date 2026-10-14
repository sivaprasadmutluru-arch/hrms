import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {canCreateCompanyLoan, companyLoans, LOAN_TYPES, RenderLoanDateField} from '../utils/companyLoans';
import {dateText, money} from '../utils/format';
import CreateCompanyLoanModal from './CreateCompanyLoanModal';
import Icon from './Icon';

type Props = {companies: any[]; selectedCompanyId: number | string; onSelectCompany: (id: number | string) => void; roles: string[]; renderDateField: RenderLoanDateField; companiesError?: string; onReloadCompanies?: () => void};

function LoanValue({label, value}: {label: string; value: string}) {
  return <View style={styles.valueRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

export default function CompanyLoans({companies, selectedCompanyId, onSelectCompany, roles, renderDateField, companiesError, onReloadCompanies}: Props) {
  const company = companies.find(item => String(item.id) === String(selectedCompanyId));
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState('');
  const [creatingCompany, setCreatingCompany] = useState<any>(null);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const currentCompanyId = useRef(selectedCompanyId);
  currentCompanyId.current = selectedCompanyId;
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setRecords([]); setError('');
    if (!company) {setLoading(false); return;}
    setLoading(true);
    try {const result = await api.companyLoans(company.id); if (id === requestId.current) setRecords(companyLoans(result, company));}
    catch (err: any) {if (id === requestId.current) setError(err?.message || 'Unable to load loans.');}
    finally {if (id === requestId.current) setLoading(false);}
  }, [company]);
  useEffect(() => {setQuery(''); setStatus('ALL'); setCreatingCompany(null); setMessage(''); load(); return () => {requestId.current += 1;};}, [load]);
  const scoped = records.filter(item => String(item.companyId) === String(selectedCompanyId));
  const filtered = scoped.filter(item => [item.title, item.employeeName, item.description, item.loanType].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()) && (status === 'ALL' || (status === 'SETTLED' ? item.settled === true : item.settled === false)));
  const canCreate = canCreateCompanyLoan(roles);
  const amountText = (value: any) => value == null ? 'Not provided' : `${company?.currency ? `${company.currency} ` : ''}${money(value)}`;
  return <>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={companiesError ? onReloadCompanies : load} />} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Company</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Select loans company" onPress={() => setPickerOpen(true)} style={styles.selector}><Icon name="business-outline" size={18} color={colors.primary} /><Text style={styles.selectorText}>{company?.name || 'Select company'}</Text><Icon name="chevron-down-outline" size={18} color={colors.muted} /></Pressable>
      <View style={styles.headingRow}><Text style={styles.heading}>Loan Accounts</Text>{canCreate && <Pressable accessibilityRole="button" accessibilityLabel="Create company loan" disabled={!company || !!companiesError} onPress={() => setCreatingCompany(company)} style={[styles.create, (!company || !!companiesError) && styles.disabled]}><Icon name="add-outline" size={16} color={colors.white} /><Text style={styles.createText}>Create Loan</Text></Pressable>}</View>
      <View style={styles.searchBox}><Icon name="search-outline" size={18} color={colors.muted} /><TextInput accessibilityLabel="Search company loans" value={query} onChangeText={setQuery} placeholder="Search employee or loan title" placeholderTextColor={colors.subtle} style={styles.searchInput} /></View>
      <View style={styles.filters}>{[['ALL', 'All'], ['ACTIVE', 'Active'], ['SETTLED', 'Settled']].map(([value, label]) => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={`${label} loans`} accessibilityState={{selected: status === value}} onPress={() => setStatus(value)} style={[styles.filter, status === value && styles.selectedFilter]}><Text style={[styles.filterText, status === value && styles.selectedFilterText]}>{label}</Text></Pressable>)}</View>
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      {loading ? <ActivityIndicator color={colors.primary} style={styles.state} /> : error || companiesError ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error || companiesError}</Text><Pressable accessibilityRole="button" onPress={companiesError ? onReloadCompanies : load} style={styles.retry}><Icon name="refresh-outline" size={16} color={colors.primary} /><Text style={styles.actionText}>Retry</Text></Pressable></View> : !company ? <Text style={styles.empty}>Select a company.</Text> : <>
        <Text style={styles.count}>{filtered.length} of {scoped.length} loan accounts</Text>
        {filtered.map(item => <View key={String(item.id)} style={styles.card}>
          <View style={styles.cardHeading}><Icon name="card-outline" size={20} color={colors.primary} /><Text style={styles.loanTitle}>{item.title || 'Loan'}</Text><Text style={styles.loanStatus}>{item.settled === true ? 'SETTLED' : item.settled === false ? 'ACTIVE' : 'NOT PROVIDED'}</Text></View>
          <Text style={styles.employee}>{item.employeeName}</Text><Text style={styles.secondary}>{LOAN_TYPES.find(type => type.value === item.loanType)?.label || item.loanType || 'Type not provided'}</Text>
          <View style={styles.details}><LoanValue label="Amount" value={amountText(item.loanAmount)} /><LoanValue label="Installment" value={amountText(item.installmentAmount)} /><LoanValue label="Installments Paid" value={item.paidInstallments == null || item.installments == null ? 'Not provided' : `${item.paidInstallments} / ${item.installments}`} /><LoanValue label="Provided" value={item.providedDate ? dateText(item.providedDate) : 'Not provided'} /><LoanValue label="Installment Start" value={item.installmentStartDate ? dateText(item.installmentStartDate) : 'Not provided'} /></View>
          {!!item.description && <Text style={styles.description}>{item.description}</Text>}
        </View>)}
        {!filtered.length && <View style={styles.state}><Icon name="folder-open-outline" size={28} color={colors.primary} /><Text style={styles.empty}>{scoped.length ? 'No loans match these filters.' : `No loan accounts found for ${company.name}.`}</Text></View>}
      </>}
    </ScrollView>
    <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}><View style={styles.backdrop}><View style={styles.picker}>
      <View style={styles.pickerHeader}><Text style={styles.pickerTitle}>Company</Text><Pressable accessibilityLabel="Close loans company selector" onPress={() => setPickerOpen(false)} style={styles.close}><Icon name="close-outline" size={22} color={colors.text} /></Pressable></View>
      <TextInput accessibilityLabel="Search loans companies" value={companyQuery} onChangeText={setCompanyQuery} placeholder="Search companies" placeholderTextColor={colors.subtle} style={styles.companySearch} />
      <ScrollView keyboardShouldPersistTaps="handled">{companies.filter(item => String(item.name).toLowerCase().includes(companyQuery.toLowerCase())).map(item => <Pressable key={String(item.id)} accessibilityRole="button" accessibilityLabel={`Loans company: ${item.name}`} onPress={() => {onSelectCompany(item.id); setPickerOpen(false); setCompanyQuery('');}} style={styles.companyOption}><Text style={styles.selectorText}>{item.name}</Text>{String(item.id) === String(selectedCompanyId) && <Icon name="checkmark-outline" size={20} color={colors.primary} />}</Pressable>)}</ScrollView>
    </View></View></Modal>
    {!!creatingCompany && String(creatingCompany.id) === String(selectedCompanyId) && canCreate && <CreateCompanyLoanModal key={String(creatingCompany.id)} company={creatingCompany} roles={roles} renderDateField={renderDateField} onClose={() => setCreatingCompany(null)} onCreated={() => {
      if (String(currentCompanyId.current) !== String(creatingCompany.id)) return;
      setCreatingCompany(null); setMessage(`Loan account created in ${creatingCompany.name}.`); load();
    }} />}
  </>;
}

const styles = StyleSheet.create({
  content: {padding: 16, paddingBottom: 32},
  label: {fontSize: 12, color: colors.muted, marginBottom: 6},
  selector: {minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  selectorText: {flex: 1, fontSize: 14, fontWeight: '600', color: colors.text},
  headingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginVertical: 14},
  heading: {flex: 1, fontSize: 16, fontWeight: '700', color: colors.text},
  create: {minHeight: 44, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6},
  createText: {fontSize: 13, color: colors.white, fontWeight: '700'},
  disabled: {opacity: 0.5},
  searchBox: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 8},
  searchInput: {flex: 1, minHeight: 44, fontSize: 13, color: colors.text},
  filters: {flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginVertical: 12},
  filter: {flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent'},
  selectedFilter: {borderBottomColor: colors.primary},
  filterText: {fontSize: 13, color: colors.muted},
  selectedFilterText: {color: colors.primary, fontWeight: '700'},
  count: {fontSize: 12, color: colors.muted, marginBottom: 12},
  card: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, padding: 14, marginBottom: 12},
  cardHeading: {flexDirection: 'row', alignItems: 'center', gap: 8},
  loanTitle: {flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '700', color: colors.text},
  loanStatus: {fontSize: 10, color: colors.muted, fontWeight: '600'},
  employee: {fontSize: 13, color: colors.textMid, marginTop: 8},
  secondary: {fontSize: 11, color: colors.muted, marginTop: 4},
  details: {marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderColor: colors.border},
  valueRow: {flexDirection: 'row', gap: 12, paddingVertical: 5},
  value: {flex: 1, textAlign: 'right', fontSize: 12, color: colors.text, fontWeight: '600'},
  description: {fontSize: 12, lineHeight: 18, color: colors.textMid, marginTop: 8},
  state: {paddingVertical: 24, alignItems: 'center', gap: 10},
  empty: {fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center', padding: 12},
  error: {fontSize: 13, lineHeight: 19, color: colors.danger},
  retry: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8},
  actionText: {fontSize: 13, color: colors.primary, fontWeight: '600'},
  message: {fontSize: 13, color: colors.success, marginBottom: 12},
  backdrop: {flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 20},
  picker: {maxHeight: '75%', padding: 16, borderRadius: 8, backgroundColor: colors.white},
  pickerHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  pickerTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  companySearch: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text, marginVertical: 12},
  companyOption: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border},
});
