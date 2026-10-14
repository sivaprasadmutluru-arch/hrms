import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {allocationPayload, loadAllocationOptions} from '../utils/leaveAllocations';
import Icon from './Icon';

function AllocationPicker({label, value, options, disabled, onChange}: {label: string; value: string; options: {id: string; label: string}[]; disabled: boolean; onChange: (id: string) => void}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(item => item.id === value);
  const filtered = options.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label} *</Text>
      <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => {setOpen(!open); setQuery('');}} style={styles.selector}>
        <Text style={[styles.selectorText, !selected && styles.placeholder]} numberOfLines={2}>{selected?.label || `Select ${label.toLowerCase()}`}</Text>
        <Icon name={open ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.muted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.options}>
          <TextInput accessibilityLabel={`Search ${label.toLowerCase()}`} value={query} onChangeText={setQuery} placeholder={`Search ${label.toLowerCase()}...`} placeholderTextColor={colors.subtle} style={styles.input} />
          <ScrollView style={styles.optionsList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map(item => (
              <TouchableOpacity accessibilityRole="button" key={item.id} disabled={disabled} onPress={() => {onChange(item.id); setOpen(false);}} style={styles.option}>
                <Text style={styles.optionText}>{item.label}</Text>
                {item.id === value && <Icon name="checkmark-outline" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            {!filtered.length && <Text style={styles.noOptions}>No matching {label.toLowerCase()}.</Text>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function CreateLeaveAllocationModal({company, existing, onClose, onCreated}: {company: {id: number | string; name: string}; existing: any[]; onClose: () => void; onCreated: () => void}) {
  const [options, setOptions] = useState<{employees: any[]; leaveTypes: any[]}>({employees: [], leaveTypes: []});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [days, setDays] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError('');
    loadAllocationOptions(api, company.id)
      .then(result => {if (current) setOptions(result);})
      .catch(err => {if (current) setLoadError(err?.message || 'Unable to load employees and leave types.');})
      .finally(() => {if (current) setLoading(false);});
    return () => {current = false;};
  }, [company.id, reload]);

  async function submit() {
    if (submittingRef.current || loading || loadError) return;
    setError('');
    let data;
    try {
      data = allocationPayload(company.id, employeeId, leaveTypeId, days, year, options, existing);
    } catch (err: any) {
      setError(err.message);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await api.createLeaveAllocation(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to create allocation.');
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    onCreated();
  }

  const close = () => {if (!submittingRef.current) onClose();};
  const disabled = loading || submitting || !!loadError;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Allocation</Text>
            <TouchableOpacity accessibilityLabel="Close create allocation" disabled={submitting} onPress={close} style={styles.closeButton}>
              <Icon name="close-outline" size={22} color={colors.textMid} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.company}>
              <Icon name="business-outline" size={20} color={colors.primary} />
              <Text style={styles.companyName}>{company.name}</Text>
            </View>
            {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
            {!!loadError && (
              <View>
                <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
                <TouchableOpacity onPress={() => setReload(value => value + 1)}><Text style={styles.retry}>Retry</Text></TouchableOpacity>
              </View>
            )}
            <AllocationPicker label="Employee" value={employeeId} disabled={disabled} onChange={id => {setEmployeeId(id); setError('');}} options={options.employees.map(item => ({id: String(item.id), label: item.fullName || item.employeeName || [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email || `Employee ${item.id}`}))} />
            <AllocationPicker label="Leave Type" value={leaveTypeId} disabled={disabled} onChange={id => {setLeaveTypeId(id); setError('');}} options={options.leaveTypes.map(item => ({id: String(item.id), label: item.name || item.leaveTypeName}))} />
            {!loading && !loadError && (!options.employees.length || !options.leaveTypes.length) && <Text style={styles.noOptions}>{!options.employees.length ? 'No employees in this company.' : 'No leave types in this company.'}</Text>}
            <View style={styles.numberRow}>
              <View style={styles.numberField}>
                <Text style={styles.label}>Days *</Text>
                <TextInput accessibilityLabel="Allocation days" value={days} onChangeText={setDays} editable={!submitting} keyboardType="decimal-pad" placeholder="e.g. 14" placeholderTextColor={colors.subtle} style={styles.input} />
              </View>
              <View style={styles.numberField}>
                <Text style={styles.label}>Year *</Text>
                <TextInput accessibilityLabel="Allocation year" value={year} onChangeText={setYear} editable={!submitting} keyboardType="number-pad" maxLength={4} style={styles.input} />
              </View>
            </View>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={submit} style={[styles.submit, disabled && styles.disabled]}>
              {submitting ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="add-outline" size={18} color={colors.white} />}
              <Text style={styles.submitText}>{submitting ? 'Creating...' : 'Create Allocation'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={submitting} onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)'},
  sheet: {maxHeight: '85%', backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16},
  title: {flex: 1, fontSize: 18, fontWeight: '800', color: colors.text},
  closeButton: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  content: {paddingHorizontal: 16, paddingBottom: 16},
  company: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: colors.primaryLight, marginBottom: 16},
  companyName: {flex: 1, fontSize: 14, fontWeight: '800', color: colors.text},
  loader: {marginBottom: 12},
  field: {marginBottom: 14},
  label: {fontSize: 12, fontWeight: '800', color: colors.textMid, marginBottom: 7},
  selector: {minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  selectorText: {flex: 1, color: colors.text, fontSize: 13, fontWeight: '700'},
  placeholder: {color: colors.subtle},
  options: {marginTop: 6, padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  optionsList: {maxHeight: 170},
  option: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8},
  optionText: {flex: 1, fontSize: 13, color: colors.textMid},
  noOptions: {fontSize: 12, lineHeight: 18, color: colors.muted, paddingVertical: 8},
  input: {minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, color: colors.text, fontSize: 13},
  numberRow: {flexDirection: 'row', gap: 12, marginBottom: 16},
  numberField: {flex: 1},
  error: {fontSize: 12, lineHeight: 18, color: colors.danger, padding: 10, borderRadius: 8, backgroundColor: colors.dangerSoft, marginBottom: 12},
  retry: {color: colors.primary, fontSize: 13, fontWeight: '800', paddingBottom: 12},
  submit: {minHeight: 46, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8},
  submitText: {color: colors.white, fontSize: 13, fontWeight: '800'},
  disabled: {opacity: 0.5},
  cancel: {minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white},
  cancelText: {fontSize: 13, color: colors.textMid, fontWeight: '700'},
});
