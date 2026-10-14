import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {loadDocumentEmployees} from '../utils/employeeDocuments';
import {DOCUMENT_FORMATS, documentRequestPayload} from '../utils/documentRequests';
import Icon from './Icon';

export default function CreateDocumentRequestModal({company, onClose, onCreated}: {company: {id: number | string; name: string}; onClose: () => void; onCreated: () => void}) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<string>('ANY');
  const [formatOpen, setFormatOpen] = useState(false);
  const [size, setSize] = useState('');
  const [description, setDescription] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<ScrollView>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError('');
    loadDocumentEmployees(api.companyEmployees, company)
      .then(result => {if (current) setEmployees(result);})
      .catch(err => {if (current) setLoadError(err?.message || 'Unable to load employees.');})
      .finally(() => {if (current) setLoading(false);});
    return () => {current = false;};
  }, [company, reload]);

  const filteredEmployees = employees.filter(employee => [employee.fullName, employee.name, employee.email, employee.departmentName].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const disabled = loading || !!loadError || submitting;

  async function submit() {
    if (submittingRef.current || loading || loadError) return;
    setError('');
    let data;
    try {
      data = documentRequestPayload(company.id, {title, documentFormat: format, maxSizeMb: size, description, employeeIds}, employees);
    } catch (err: any) {
      setError(err.message);
      formRef.current?.scrollTo({y: 0, animated: true});
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await api.createDocumentRequest(data, company.id);
    } catch (err: any) {
      setError(err?.message || 'Unable to create document request.');
      formRef.current?.scrollTo({y: 0, animated: true});
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    onCreated();
  }

  const close = () => {if (!submittingRef.current) onClose();};
  return (
    <Modal visible animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.heading}>Create Request</Text>
            <TouchableOpacity accessibilityLabel="Close create request" disabled={submitting} onPress={close} style={styles.iconButton}><Icon name="close-outline" size={22} color={colors.textMid} /></TouchableOpacity>
          </View>
          <ScrollView ref={formRef} style={styles.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.company}><Icon name="business-outline" size={20} color={colors.primary} /><Text style={styles.companyName}>{company.name}</Text></View>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Text style={styles.label}>Title *</Text>
            <TextInput accessibilityLabel="Document request title" value={title} onChangeText={value => {setTitle(value); setError('');}} editable={!submitting} maxLength={255} placeholder="e.g. Updated passport copy" placeholderTextColor={colors.subtle} style={styles.input} />
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Format</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Document format" disabled={submitting} onPress={() => setFormatOpen(!formatOpen)} style={styles.selector}>
                  <Text style={styles.selectorText}>{format === 'ANY' ? 'Any format' : format}</Text>
                  <Icon name={formatOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Max Size (MB)</Text>
                <TextInput accessibilityLabel="Maximum document size" value={size} onChangeText={setSize} editable={!submitting} keyboardType="number-pad" placeholder="Optional" placeholderTextColor={colors.subtle} style={styles.input} />
              </View>
            </View>
            {formatOpen && <View style={styles.formats}>{DOCUMENT_FORMATS.map(value => (
              <TouchableOpacity accessibilityRole="radio" accessibilityLabel={`Format ${value}`} accessibilityState={{selected: format === value}} key={value} onPress={() => {setFormat(value); setFormatOpen(false);}} style={styles.formatOption} disabled={submitting}>
                <Text style={styles.optionText}>{value === 'ANY' ? 'Any format' : value}</Text>
                {format === value && <Icon name="checkmark-outline" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}</View>}
            <Text style={styles.label}>Description</Text>
            <TextInput accessibilityLabel="Document request description" value={description} onChangeText={setDescription} editable={!submitting} multiline placeholder="Optional" placeholderTextColor={colors.subtle} style={[styles.input, styles.description]} />
            <View style={styles.employeeHeader}>
              <Text style={styles.label}>Employees ({employeeIds.length} selected)</Text>
              <View style={styles.row}>
                <TouchableOpacity disabled={disabled} onPress={() => setEmployeeIds(current => [...new Set([...current, ...filteredEmployees.map(item => String(item.id))])])}><Text style={styles.textAction}>{query ? 'Select filtered' : 'Select all'}</Text></TouchableOpacity>
                <TouchableOpacity disabled={disabled} onPress={() => setEmployeeIds([])}><Text style={styles.textAction}>Clear</Text></TouchableOpacity>
              </View>
            </View>
            <TextInput accessibilityLabel="Search request employees" value={query} onChangeText={setQuery} editable={!submitting} placeholder="Search name, email or department..." placeholderTextColor={colors.subtle} style={styles.input} />
            {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : loadError ? (
              <View><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><TouchableOpacity onPress={() => setReload(value => value + 1)}><Text style={styles.textAction}>Retry</Text></TouchableOpacity></View>
            ) : (
              <ScrollView style={styles.employeeList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredEmployees.map(employee => {
                  const id = String(employee.id);
                  const selected = employeeIds.includes(id);
                  const name = employee.fullName || employee.name || employee.email || `Employee ${id}`;
                  return <TouchableOpacity key={id} accessibilityRole="checkbox" accessibilityLabel={name} accessibilityState={{checked: selected}} disabled={submitting} onPress={() => setEmployeeIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])} style={styles.employee}>
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected && <Icon name="checkmark-outline" size={14} color={colors.white} />}</View>
                    <View style={styles.employeeCopy}><Text style={styles.optionText}>{name}</Text>{!!employee.departmentName && <Text style={styles.employeeDepartment}>{employee.departmentName}</Text>}</View>
                  </TouchableOpacity>;
                })}
                {!filteredEmployees.length && <Text style={styles.empty}>No matching employees.</Text>}
              </ScrollView>
            )}
            {!!employeeIds.length && <Text style={styles.notificationText}>{employeeIds.length} employee{employeeIds.length === 1 ? '' : 's'} will be notified.</Text>}
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create document request" disabled={disabled} onPress={submit} style={[styles.submit, disabled && styles.disabled]}>
              {submitting ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="add-outline" size={18} color={colors.white} />}
              <Text style={styles.submitText}>{submitting ? 'Creating...' : 'Create Request'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={submitting} onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)'},
  sheet: {maxHeight: '90%', backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16},
  heading: {flex: 1, fontSize: 18, fontWeight: '800', color: colors.text},
  iconButton: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  content: {paddingHorizontal: 16, paddingBottom: 16},
  formBody: {flexShrink: 1},
  actions: {paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border},
  company: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: colors.primaryLight, marginBottom: 16},
  companyName: {flex: 1, fontSize: 14, fontWeight: '800', color: colors.text},
  label: {fontSize: 12, fontWeight: '800', color: colors.textMid, marginBottom: 7},
  input: {minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, color: colors.text, fontSize: 13, marginBottom: 14},
  row: {flexDirection: 'row', gap: 12},
  column: {flex: 1},
  selector: {minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, marginBottom: 14},
  selectorText: {flex: 1, color: colors.text, fontSize: 13},
  formats: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, marginBottom: 14},
  formatOption: {minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12},
  optionText: {fontSize: 13, color: colors.textMid, flexShrink: 1},
  description: {minHeight: 76, textAlignVertical: 'top'},
  employeeHeader: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 8},
  textAction: {color: colors.primary, fontSize: 12, fontWeight: '800', paddingVertical: 5},
  employeeList: {maxHeight: 180, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, marginBottom: 12},
  employee: {minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border},
  checkbox: {width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.borderDark, alignItems: 'center', justifyContent: 'center'},
  checkboxSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  employeeCopy: {flex: 1, minWidth: 0},
  employeeDepartment: {color: colors.muted, fontSize: 11, marginTop: 3},
  loading: {marginVertical: 16},
  empty: {fontSize: 12, color: colors.muted, padding: 12},
  notificationText: {fontSize: 12, color: colors.muted, marginBottom: 12},
  error: {fontSize: 12, lineHeight: 18, color: colors.danger, padding: 10, borderRadius: 8, backgroundColor: colors.dangerSoft, marginBottom: 12},
  submit: {minHeight: 46, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8},
  submitText: {color: colors.white, fontSize: 13, fontWeight: '800'},
  disabled: {opacity: 0.5},
  cancel: {minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white},
  cancelText: {fontSize: 13, color: colors.textMid, fontWeight: '700'},
});
