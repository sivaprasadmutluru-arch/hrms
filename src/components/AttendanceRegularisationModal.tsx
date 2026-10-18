import React, {useEffect, useState} from 'react';
import {Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {api} from '../api/client';
import {dateText} from '../utils/format';
import {colors} from '../theme/colors';
import {fonts} from '../theme/typography';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';

type Props = {record: any; onClose: () => void; onSubmitted: () => Promise<void>};

export default function AttendanceRegularisationModal({record, onClose, onSubmitted}: Props) {
  const insets = useSafeAreaInsets();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setCheckIn(record?.id ? '' : '09:00');
    setCheckOut('');
    setReason('');
  }, [record]);
  const close = () => {if (!saving) onClose();};
  async function submit() {
    if (!record || saving) return;
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
    if ((!record.id || checkIn.trim()) && !validTime.test(checkIn.trim())) {
      Alert.alert('Regularisation', 'Enter a valid check-in time in HH:MM format.');
      return;
    }
    if (checkOut.trim() && !validTime.test(checkOut.trim())) {
      Alert.alert('Regularisation', 'Enter a valid check-out time in HH:MM format.');
      return;
    }
    if (!reason.trim()) {Alert.alert('Regularisation', 'Please enter a reason.'); return;}
    setSaving(true);
    try {
      await api.submitRegularisationRequest({
        ...(record.id ? {attendanceId: record.id} : {attendanceDate: record.attendanceDate || record.date}),
        requestType: 'MISSING_PUNCH',
        ...(checkIn.trim() ? {requestedCheckIn: checkIn.trim()} : {}),
        ...(checkOut.trim() ? {requestedCheckOut: checkOut.trim()} : {}),
        reason: reason.trim(),
      });
      onClose();
      await onSubmitted();
      Alert.alert('Regularisation', 'Request submitted successfully.');
    } catch (err: any) {
      Alert.alert('Regularisation', err?.message || 'Unable to submit request.');
    } finally {setSaving(false);}
  }
  return (
    <Modal visible={!!record} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, {paddingBottom: Math.max(insets.bottom, 16)}]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close regularisation request" disabled={saving} onPress={close} style={styles.close}><Icon name="close-outline" size={22} color={colors.textMid} /></Pressable>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.title}>Request Regularisation</Text>
            <Text style={styles.date}>{dateText(`${String(record?.attendanceDate || record?.date || '').slice(0, 10)}T00:00:00`)}</Text>
            <Text style={styles.help}>Enter corrected times in 24-hour format. HR approval is required.</Text>
            <Text style={styles.label}>Check-in time{record?.id ? ' (optional)' : ''}</Text>
            <TextInput accessibilityLabel="Requested check-in time" editable={!saving} value={checkIn} onChangeText={setCheckIn} placeholder="09:00" placeholderTextColor={colors.subtle} style={styles.input} />
            <Text style={styles.label}>Check-out time (optional)</Text>
            <TextInput accessibilityLabel="Requested check-out time" editable={!saving} value={checkOut} onChangeText={setCheckOut} placeholder="17:00" placeholderTextColor={colors.subtle} style={styles.input} />
            <Text style={styles.label}>Reason</Text>
            <TextInput accessibilityLabel="Reason for correction" editable={!saving} value={reason} onChangeText={setReason} placeholder="Reason for correction" placeholderTextColor={colors.subtle} multiline style={[styles.input, styles.reason]} />
            <PrimaryButton title="Submit Request" loading={saving} onPress={submit} />
            <Pressable accessibilityRole="button" disabled={saving} onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.5)'},
  sheet: {maxHeight: '90%', backgroundColor: colors.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 22},
  content: {paddingHorizontal: 16, paddingBottom: 10},
  close: {position: 'absolute', right: 12, top: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, zIndex: 1},
  title: {fontSize: 18, fontFamily: fonts.semibold, color: colors.text, paddingRight: 48},
  date: {fontSize: 13, color: colors.muted, marginTop: 4},
  help: {fontSize: 12, color: colors.muted, marginVertical: 16},
  label: {fontSize: 13, fontFamily: fonts.semibold, color: colors.textMid, marginBottom: 6},
  input: {borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, padding: 12, color: colors.text, marginBottom: 14, minHeight: 48},
  reason: {minHeight: 90, textAlignVertical: 'top'},
  cancel: {alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white},
  cancelText: {color: colors.textMid, fontFamily: fonts.semibold},
});
