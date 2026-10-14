import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {allocationItems} from '../utils/leaveAllocations';
import {dateText} from '../utils/format';
import Icon from './Icon';

export default function DocumentRequestDetail({request, companyId}: {request: any; companyId: number | string}) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    api.documentRequestSubmissions(request.id, companyId)
      .then(result => {if (current) setSubmissions(allocationItems(result));})
      .catch(err => {if (current) setError(err?.message || 'Unable to load submission statuses.');})
      .finally(() => {if (current) setLoading(false);});
    return () => {current = false;};
  }, [companyId, request.id, reload]);
  return (
    <View>
      <View style={styles.request}>
        <Text style={styles.title}>{request.title}</Text>
        <Text style={styles.company}>{request.companyName || request.company?.name}</Text>
        <Text style={styles.meta}>{request.documentFormat === 'ANY' ? 'Any format' : request.documentFormat || 'Any format'}{request.maxSizeMb ? ` | Max ${request.maxSizeMb} MB` : ''}</Text>
        {!!request.description && <Text style={styles.description}>{request.description}</Text>}
        {!!request.createdAt && <Text style={styles.meta}>Created {dateText(request.createdAt)}</Text>}
      </View>
      <View style={styles.header}>
        <Text style={styles.heading}>Employee Submissions{!loading && !error ? ` (${submissions.length})` : ''}</Text>
        <TouchableOpacity accessibilityLabel="Refresh submission statuses" disabled={loading} onPress={() => setReload(value => value + 1)} style={styles.iconButton}><Icon name="refresh-outline" size={19} color={colors.primary} /></TouchableOpacity>
      </View>
      {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>Loading submissions...</Text></View> : error ? (
        <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><TouchableOpacity onPress={() => setReload(value => value + 1)}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View>
      ) : !submissions.length ? <View style={styles.state}><Text style={styles.stateText}>No employees tagged to this request.</Text></View> : submissions.map(item => {
        const status = String(item.status || 'PENDING').toUpperCase();
        const color = status === 'APPROVED' ? colors.success : status === 'REJECTED' ? colors.danger : status === 'SUBMITTED' ? colors.info : colors.warning;
        return <View key={String(item.employeeId)} style={styles.submission}>
          <View style={styles.top}><Text style={styles.employeeName}>{item.employeeName || 'Employee'}</Text><Text style={[styles.status, {color}]}>{status}</Text></View>
          {!!item.email && <Text style={styles.meta}>{item.email}</Text>}
          {!!item.submittedAt && <Text style={styles.meta}>Submitted {dateText(item.submittedAt)}</Text>}
          {!!item.rejectReason && <Text style={styles.error}>{item.rejectReason}</Text>}
        </View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  request: {paddingVertical: 12, marginBottom: 14},
  title: {color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: '800'},
  company: {color: colors.primary, fontSize: 13, lineHeight: 19, marginTop: 6, fontWeight: '700'},
  meta: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5},
  description: {color: colors.textMid, fontSize: 13, lineHeight: 20, marginTop: 12},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  heading: {flex: 1, color: colors.text, fontSize: 15, fontWeight: '800'},
  iconButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  state: {paddingVertical: 24, alignItems: 'center', gap: 12},
  stateText: {fontSize: 13, lineHeight: 19, color: colors.muted},
  retry: {color: colors.primary, fontSize: 13, fontWeight: '800'},
  error: {color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 6},
  submission: {padding: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 8},
  top: {flexDirection: 'row', alignItems: 'center', gap: 10},
  employeeName: {flex: 1, fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: '700'},
  status: {fontSize: 11, fontWeight: '800'},
});
