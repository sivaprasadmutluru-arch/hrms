import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {LeaveAttachment, leaveAttachmentCompany, leaveAttachmentItems, loadLeaveAttachmentMetadata} from '../utils/leaveAttachments';
import {transferLeaveAttachment} from '../native/LeaveAttachmentFiles';
import Icon from './Icon';

export default function LeaveAttachments({request, companyId, expanded = false}: {
  request: any; companyId?: number | string | null; expanded?: boolean;
}) {
  const {token, user, profile} = useAuth();
  const company = leaveAttachmentCompany(request, companyId ?? profile?.companyId ?? user?.companyId);
  const requestId = request?.id ?? request?.requestId;
  const [files, setFiles] = useState<LeaveAttachment[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const version = useRef(0);
  const opening = useRef(false);
  useEffect(() => {
    const current = ++version.current;
    setFiles([]); setError(''); setOpen(false); setBusy(null); setLoading(true);
    if (!token || requestId == null || company == null) {setLoading(false); return;}
    loadLeaveAttachmentMetadata(() => api.leaveRequestFiles(requestId, company), () => version.current === current)
      .then(result => {if (version.current === current) setFiles(leaveAttachmentItems(result, requestId));})
      .catch(() => {if (version.current === current) setError('Documents unavailable');})
      .finally(() => {if (version.current === current) setLoading(false);});
    return () => {version.current = current + 1;};
  }, [requestId, company, token, request?.updatedAt, reload]);

  async function act(file: LeaveAttachment, download: boolean) {
    if (opening.current || company == null) return;
    const current = version.current;
    opening.current = true; setBusy(String(file.id));
    try {
      const message = await transferLeaveAttachment(requestId, file, company, download, () => version.current === current);
      if (message && version.current === current) Alert.alert('Leave document', message);
    } catch (err: any) {
      if (version.current === current) Alert.alert('Leave document', err?.message || 'Unable to open document.');
    } finally {opening.current = false; if (version.current === current) setBusy(null);}
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="small" color={colors.muted} /><Text style={styles.meta}>Checking documents…</Text></View>;
  if (error) return <Pressable accessibilityLabel="Retry loading leave documents" onPress={event => {event.stopPropagation(); setReload(value => value + 1);}}><Text style={styles.retry}>{error} · Retry</Text></Pressable>;
  if (!files.length) return null;

  const documentList = <View style={styles.list}>{files.map(file => <View key={file.id} style={styles.file}>
    <View style={styles.fileHeading}><Icon name="document-text-outline" size={20} color={colors.primary} /><Text style={styles.name}>{file.fileName}</Text></View>
    <View style={styles.actions}>
      <Pressable accessibilityLabel={`View ${file.fileName}`} disabled={busy !== null} style={styles.action} onPress={event => {event.stopPropagation(); act(file, false);}}><Icon name="eye-outline" size={19} color={colors.primary} /><Text style={styles.actionText}>View</Text></Pressable>
      <Pressable accessibilityLabel={`Download ${file.fileName}`} disabled={busy !== null} style={styles.action} onPress={event => {event.stopPropagation(); act(file, true);}}><Icon name="download-outline" size={19} color={colors.primary} /><Text style={styles.actionText}>Download</Text></Pressable>
      {busy === String(file.id) && <ActivityIndicator color={colors.primary} />}
    </View>
  </View>)}</View>;
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${files.length} attached leave document${files.length === 1 ? '' : 's'}`} onPress={event => {event.stopPropagation(); setOpen(true);}} style={styles.indicator}>
      <Icon name="document-attach-outline" size={18} color={colors.primary} /><Text style={styles.indicatorText}>{files.length} document{files.length === 1 ? '' : 's'}</Text>
    </Pressable>
    {expanded && documentList}
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.dialog}>
        <View style={styles.modalHeading}><Text style={styles.heading}>Leave documents</Text><Pressable accessibilityLabel="Close leave documents" onPress={() => setOpen(false)} style={styles.action}><Icon name="close-outline" size={24} color={colors.text} /></Pressable></View>
        <ScrollView>{documentList}</ScrollView>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  loading: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6},
  meta: {fontSize: 11, color: colors.muted}, retry: {fontSize: 12, color: colors.danger, paddingVertical: 8},
  indicator: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 10, marginTop: 6, backgroundColor: colors.primaryLight, borderRadius: 10, minHeight: 44},
  indicatorText: {fontSize: 12, color: colors.primaryDark, fontWeight: '700'},
  list: {gap: 10, paddingVertical: 10}, file: {padding: 12, backgroundColor: colors.primaryLight, borderRadius: 12},
  fileHeading: {flexDirection: 'row', alignItems: 'center', gap: 8}, name: {flex: 1, fontSize: 13, color: colors.text, fontWeight: '600'},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6}, action: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: 6},
  actionText: {fontSize: 13, fontWeight: '700', color: colors.primaryDark},
  overlay: {flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 20}, dialog: {backgroundColor: colors.white, borderRadius: 20, padding: 16, maxHeight: '80%'},
  modalHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, heading: {fontSize: 18, fontWeight: '800', color: colors.text},
});
