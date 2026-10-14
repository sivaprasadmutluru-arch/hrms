import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {CompanySubscription, loadCompanySubscriptions, SUBSCRIPTION_PAGES, subscriptionLimit, subscriptionUsage} from '../utils/subscriptions';
import Icon from './Icon';

type Props = {
  companies: any[];
  selectedCompanyId: number | string;
  onSelectCompany: (id: number | string) => void;
  page: string;
  onSelectPage: (page: string) => void;
};

function ValueRow({label, value}: {label: string; value: string}) {
  return <View style={styles.valueRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function UsageRow({label, current, limit}: {label: string; current: any; limit: any}) {
  const ratio = typeof current === 'number' && typeof limit === 'number' && limit > 0 ? Math.min(1, Math.max(0, current / limit)) : null;
  return (
    <View style={styles.usageRow}>
      <ValueRow label={label} value={subscriptionUsage(current, limit)} />
      {ratio !== null && <View style={styles.usageTrack}><View style={[styles.usageFill, {width: `${ratio * 100}%`, backgroundColor: ratio >= 0.9 ? colors.danger : colors.info}]} /></View>}
    </View>
  );
}

export function SubscriptionCard({record, page}: {record: CompanySubscription; page: string}) {
  const {company, organization, limits, error} = record;
  const plan = limits?.plan || organization?.subscriptionPlan;
  const planColor = plan === 'ENTERPRISE' ? colors.success : plan === 'STANDARD' ? colors.info : colors.muted;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <Icon name="business-outline" size={20} color={colors.primary} />
        <Text style={styles.companyName}>{company.name || `Company ${company.id}`}</Text>
        {!!plan && <View style={[styles.planBadge, {borderColor: planColor}]}><Text style={[styles.planText, {color: planColor}]}>{plan}</Text></View>}
      </View>
      {!!organization && <View style={styles.organizationRow}>
        <Text style={styles.organizationName}>{organization.name}</Text>
        {!!organization.status && <Text style={[styles.status, {color: organization.status === 'ACTIVE' ? colors.success : colors.warning}]}>{organization.status}</Text>}
      </View>}
      {!!error && <View style={styles.errorRow}><Icon name="alert-circle-outline" size={16} color={colors.warning} /><Text style={styles.errorText}>{error}</Text></View>}
      {page === 'Subscription Details' && !!organization && <View style={styles.body}>
        <ValueRow label="Employee limit" value={subscriptionLimit(limits?.maxEmployees)} />
        <ValueRow label="Branch limit" value={subscriptionLimit(limits?.maxBranches)} />
        <ValueRow label="Cross-branch access" value={typeof limits?.crossBranchAccessAllowed === 'boolean' ? limits.crossBranchAccessAllowed ? 'Enabled' : 'Disabled' : 'Not provided'} />
      </View>}
      {page === 'Plan Limits' && !!organization && <View style={styles.body}>
        <Text style={styles.sectionLabel}>Organization usage</Text>
        <UsageRow label="Employees" current={limits?.currentEmployees} limit={limits?.maxEmployees} />
        <UsageRow label="Branches" current={limits?.currentBranches} limit={limits?.maxBranches} />
      </View>}
      {page === 'Billing Scope' && !!organization && <View style={styles.body}>
        <ValueRow label="Billing organization" value={organization.name} />
        <ValueRow label="Subscription scope" value="Organization-wide" />
        <ValueRow label="Email" value={organization.contactEmail || 'Not provided'} />
        <ValueRow label="Phone" value={organization.contactPhone || 'Not provided'} />
      </View>}
    </View>
  );
}

export default function CompanySubscriptions({companies, selectedCompanyId, onSelectCompany, page, onSelectPage}: Props) {
  const [records, setRecords] = useState<CompanySubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    setRecords([]);
    try {
      const result = await loadCompanySubscriptions(companies, selectedCompanyId, {
        organizations: api.subscriptionOrganizations,
        employees: api.companyEmployees,
        limits: api.organizationPlanLimits,
      });
      if (id === requestId.current) setRecords(result);
    } catch (err: any) {
      if (id === requestId.current) setError(err?.message || 'Unable to load subscriptions.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [companies, selectedCompanyId]);
  useEffect(() => {load(); return () => {requestId.current += 1;};}, [load]);

  const selectedName = selectedCompanyId === 'all' ? 'All companies' : companies.find(company => String(company.id) === String(selectedCompanyId))?.name || 'Select company';
  const chooseCompany = (id: number | string) => {onSelectCompany(id); setPickerOpen(false); setQuery('');};
  return (
    <>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={styles.sectionLabel}>Company</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Select subscription company" onPress={() => setPickerOpen(true)} style={styles.selector}>
          <Icon name="business-outline" size={18} color={colors.primary} />
          <Text style={styles.selectorText}>{selectedName}</Text>
          <Icon name="chevron-down-outline" size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.tabs}>
          {SUBSCRIPTION_PAGES.map((name, index) => <Pressable key={name} accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{selected: name === page}} onPress={() => onSelectPage(name)} style={[styles.tab, name === page && styles.activeTab]}>
            <Text style={[styles.tabText, name === page && styles.activeTabText]}>{['Details', 'Limits', 'Billing'][index]}</Text>
          </Pressable>)}
        </View>
        {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.label}>Loading subscriptions...</Text></View> : error ? <View style={styles.state}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Icon name="refresh-outline" size={16} color={colors.primary} /><Text style={styles.retryText}>Retry</Text></Pressable></View> : records.length ? <>
          <Text style={styles.count}>{records.length} {records.length === 1 ? 'company' : 'companies'}</Text>
          {records.map(record => <SubscriptionCard key={String(record.company.id)} record={record} page={page} />)}
          {records.some(record => record.error) && <Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Icon name="refresh-outline" size={16} color={colors.primary} /><Text style={styles.retryText}>Retry unavailable subscriptions</Text></Pressable>}
        </> : <Text style={styles.empty}>No accessible companies.</Text>}
      </ScrollView>
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.picker}>
            <View style={styles.pickerHeading}><Text style={styles.pickerTitle}>Company</Text><Pressable accessibilityRole="button" accessibilityLabel="Close company selection" onPress={() => setPickerOpen(false)} style={styles.close}><Icon name="close-outline" size={22} color={colors.text} /></Pressable></View>
            <TextInput accessibilityLabel="Search subscription companies" value={query} onChangeText={setQuery} placeholder="Search companies" placeholderTextColor={colors.subtle} style={styles.search} />
            <ScrollView>
              {[{id: 'all', name: 'All companies'}, ...companies].filter(company => company.id === 'all' || String(company.name).toLowerCase().includes(query.toLowerCase())).map(company => {
                const selected = String(company.id) === String(selectedCompanyId);
                return <Pressable key={String(company.id)} accessibilityRole="button" accessibilityLabel={`Select ${company.name}`} accessibilityState={{selected}} onPress={() => chooseCompany(company.id)} style={styles.option}>
                  <Text style={[styles.optionText, selected && styles.selectedOption]}>{company.name}</Text>
                  {selected && <Icon name="checkmark-outline" size={20} color={colors.primary} />}
                </Pressable>;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {padding: 16, paddingBottom: 32},
  sectionLabel: {fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6},
  selector: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  selectorText: {flex: 1, fontSize: 14, fontWeight: '600', color: colors.text},
  tabs: {flexDirection: 'row', marginTop: 12, marginBottom: 12, borderBottomWidth: 1, borderColor: colors.border},
  tab: {flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  activeTab: {borderBottomColor: colors.primary},
  tabText: {fontSize: 14, color: colors.muted},
  activeTabText: {color: colors.primary, fontWeight: '700'},
  count: {fontSize: 12, color: colors.muted, marginBottom: 12},
  card: {padding: 14, marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white},
  cardHeading: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8},
  companyName: {flex: 1, minWidth: 120, fontSize: 15, lineHeight: 21, fontWeight: '700', color: colors.text},
  planBadge: {borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4},
  planText: {fontSize: 10, fontWeight: '700'},
  organizationRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8},
  organizationName: {flex: 1, minWidth: 120, fontSize: 12, lineHeight: 17, color: colors.muted},
  status: {fontSize: 10, fontWeight: '600'},
  body: {borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 12},
  valueRow: {flexDirection: 'row', gap: 12, paddingVertical: 5},
  label: {flex: 1, fontSize: 12, lineHeight: 18, color: colors.muted},
  value: {flex: 1, textAlign: 'right', fontSize: 12, lineHeight: 18, fontWeight: '600', color: colors.text},
  usageRow: {marginBottom: 10},
  usageTrack: {height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 5},
  usageFill: {height: 5},
  errorRow: {flexDirection: 'row', gap: 8, marginTop: 10},
  errorText: {flexShrink: 1, fontSize: 12, lineHeight: 18, color: colors.textMid},
  state: {alignItems: 'center', gap: 12, paddingVertical: 32},
  empty: {fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 24},
  retry: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, minHeight: 44},
  retryText: {fontSize: 13, fontWeight: '600', color: colors.primary},
  modalBackdrop: {flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.4)'},
  picker: {maxHeight: '75%', borderRadius: 8, backgroundColor: colors.white, padding: 16},
  pickerHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  pickerTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  search: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text, marginVertical: 12},
  option: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border},
  optionText: {flex: 1, fontSize: 14, lineHeight: 20, color: colors.text},
  selectedOption: {color: colors.primary, fontWeight: '700'},
});
