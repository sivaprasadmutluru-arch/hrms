import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {api, apiAuthHeaders, API_BASE_URL} from '../api/client';
import {colors} from '../theme/colors';
import {dateText} from '../utils/format';
import {documentFile, documentsForEmployee} from '../utils/employeeDocuments';
import Icon from './Icon';

export default function EmployeeDocuments({employeeId, companyId}: {employeeId: number | string; companyId: number | string | null}) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [opening, setOpening] = useState<string | null>(null);
  const openingRef = useRef(false);

  useEffect(() => {
    let current = true;
    setDocuments([]);
    setError('');
    setLoading(true);
    if (companyId == null || companyId === 'all') {
      setError('Select the employee company to view documents.');
      setLoading(false);
      return;
    }
    api.employeeDocuments(employeeId, companyId)
      .then(result => {if (current) setDocuments(documentsForEmployee(result, employeeId, companyId));})
      .catch(err => {if (current) setError(err?.message || 'Unable to load employee documents.');})
      .finally(() => {if (current) setLoading(false);});
    return () => {current = false;};
  }, [companyId, employeeId, reload]);

  async function openDocument(item: any, key: string) {
    if (openingRef.current || companyId == null) return;
    openingRef.current = true;
    setOpening(key);
    try {
      const file = documentFile(item, API_BASE_URL);
      if (!file) throw new Error('No file has been uploaded for this document.');
      const scopeName = `${companyId}-${employeeId}-${item.id || key}`.replace(/[^a-zA-Z0-9_-]/g, '-');
      const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/employee-document-${scopeName}-${file.filename}`;
      const headers = file.authenticated
        ? apiAuthHeaders({'X-Company-Id': String(companyId), 'X-Filter-Company-Id': String(companyId)})
        : {};
      const response = await ReactNativeBlobUtil.config({fileCache: true, path}).fetch('GET', file.url, headers);
      const info = response.info();
      if (info.status < 200 || info.status >= 300) throw new Error(`Unable to download document (${info.status}).`);
      if (Platform.OS === 'ios') {
        await ReactNativeBlobUtil.ios.openDocument(response.path());
      } else {
        await ReactNativeBlobUtil.android.actionViewIntent(response.path(), file.mime);
      }
    } catch (err: any) {
      Alert.alert('Employee Document', err?.message || 'Unable to open this document.');
    } finally {
      openingRef.current = false;
      setOpening(null);
    }
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.heading}>Documents{!loading && !error ? ` (${documents.length})` : ''}</Text>
        <TouchableOpacity accessibilityLabel="Refresh employee documents" onPress={() => setReload(value => value + 1)} disabled={loading} style={styles.iconButton}>
          <Icon name="refresh-outline" size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>Loading documents...</Text></View>
      ) : error ? (
        <View style={styles.state}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={() => setReload(value => value + 1)}><Text style={styles.retry}>Retry</Text></TouchableOpacity>
        </View>
      ) : !documents.length ? (
        <View style={styles.state}><Icon name="folder-open-outline" size={28} color={colors.muted} /><Text style={styles.stateText}>No documents for this employee.</Text></View>
      ) : documents.map((item, index) => {
        const key = String(item.id || index);
        const title = item.title || item.fileName || item.documentType || 'Document';
        const status = String(item.status || '').toUpperCase();
        const hasFile = !!(item.filePath || item.fileUrl || item.documentPath || item.url);
        const isOpening = opening === key;
        const statusColor = status === 'APPROVED' ? colors.success : status === 'REJECTED' ? colors.danger : colors.warning;
        return (
          <View key={key} style={styles.document}>
            <View style={styles.documentTop}>
              <View style={styles.fileIcon}><Icon name="document-text-outline" size={22} color={colors.primary} /></View>
              <View style={styles.copy}>
                <Text style={styles.title}>{title}</Text>
                {!!status && <Text style={[styles.status, {color: statusColor}]}>{status}</Text>}
                {!!item.createdAt && <Text style={styles.meta}>Added {dateText(item.createdAt)}</Text>}
              </View>
              {hasFile && (
                <TouchableOpacity accessibilityLabel={`Open ${title}`} disabled={opening !== null} onPress={() => openDocument(item, key)} style={styles.iconButton}>
                  {isOpening ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="eye-outline" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            </View>
            {(item.issueDate || item.expiryDate) && <View style={styles.dates}>
              {!!item.issueDate && <Text style={styles.meta}>Issued {dateText(item.issueDate)}</Text>}
              {!!item.expiryDate && <Text style={styles.meta}>Expires {dateText(item.expiryDate)}</Text>}
            </View>}
            {!hasFile && <Text style={styles.meta}>No file uploaded</Text>}
            {!!item.rejectReason && <Text style={styles.error}>{item.rejectReason}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  heading: {color: colors.text, fontSize: 16, fontWeight: '800'},
  iconButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  state: {paddingVertical: 32, alignItems: 'center', gap: 12},
  stateText: {color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center'},
  error: {color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 6},
  retry: {color: colors.primary, fontSize: 13, fontWeight: '800'},
  document: {backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10},
  documentTop: {flexDirection: 'row', alignItems: 'center', gap: 10},
  fileIcon: {width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  copy: {flex: 1, minWidth: 0},
  title: {color: colors.text, fontSize: 14, fontWeight: '800'},
  status: {fontSize: 11, fontWeight: '800', marginTop: 4},
  meta: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4},
  dates: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border},
});
