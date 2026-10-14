import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {canCreateCompanyLoan, companyLoanPayload, LOAN_TYPES, LoanFormValues, RenderLoanDateField} from '../utils/companyLoans';
import {loadDocumentEmployees} from '../utils/employeeDocuments';
import Icon from './Icon';

export default function CreateCompanyLoanModal({company, roles, renderDateField, onClose, onCreated}: {company: any; roles: string[]; renderDateField: RenderLoanDateField; onClose: () => void; onCreated: () => void}) {
  const [values, setValues] = useState<LoanFormValues>({title: '', employeeId: '', loanType: 'LOAN', loanAmount: '', providedDate: '', installmentAmount: '', installments: '', installmentStartDate: '', description: ''});
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<ScrollView>(null);
  const change = (key: keyof LoanFormValues, value: string) => {setValues(current => ({...current, [key]: value})); setError('');};
  const canCreate = canCreateCompanyLoan(roles);
  useEffect(() => {
    let current = true;
    setLoading(true); setLoadError(''); setEmployees([]);
    loadDocumentEmployees(api.companyEmployees, company).then(result => {if (current) setEmployees(result);})
      .catch(err => {if (current) setLoadError(err?.message || 'Unable to load employees.');})
      .finally(() => {if (current) setLoading(false);});
    return () => {current = false;};
  }, [company, reload]);
  const filtered = employees.filter(employee => [employee.fullName, employee.email, employee.departmentName].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const selectedEmployee = employees.find(employee => String(employee.id) === values.employeeId);
  const disabled = !canCreate || loading || !!loadError || submitting || !employees.length;
  const close = () => {if (!submittingRef.current) onClose();};
  async function submit() {
    if (disabled || submittingRef.current) return;
    setError('');
    let payload;
    try {payload = companyLoanPayload(company.id, values, employees);}
    catch (err: any) {setError(err.message); formRef.current?.scrollTo({y: 0, animated: true}); return;}
    submittingRef.current = true; setSubmitting(true);
    try {await api.createCompanyLoan(payload, company.id);}
    catch (err: any) {setError(err?.message || 'Unable to create loan.'); formRef.current?.scrollTo({y: 0, animated: true}); submittingRef.current = false; setSubmitting(false); return;}
    onCreated();
  }
  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.sheet}>
        <View style={styles.header}><Text style={styles.heading}>Create Loan</Text><TouchableOpacity accessibilityLabel="Close create loan" disabled={submitting} onPress={close} style={styles.iconButton}><Icon name="close-outline" size={22} color={colors.text} /></TouchableOpacity></View>
        <ScrollView ref={formRef} style={styles.form} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" pointerEvents={submitting ? 'none' : 'auto'}>
          <Text style={styles.company}>{company.name}</Text>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!canCreate && <Text accessibilityRole="alert" style={styles.error}>Your role cannot create loan accounts.</Text>}
          <Text style={styles.label}>Employee *</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Loan employee" disabled={loading || submitting || !!loadError} onPress={() => setEmployeeOpen(!employeeOpen)} style={styles.selector}><Text style={styles.selectorText}>{selectedEmployee?.fullName || selectedEmployee?.email || 'Select employee'}</Text><Icon name="chevron-down-outline" size={18} color={colors.muted} /></TouchableOpacity>
          {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : loadError ? <View><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><TouchableOpacity onPress={() => setReload(value => value + 1)}><Text style={styles.textAction}>Retry employees</Text></TouchableOpacity></View> : !employees.length ? <Text style={styles.empty}>No active employees in this company.</Text> : employeeOpen && <View style={styles.options}>
            <TextInput accessibilityLabel="Search loan employees" value={query} onChangeText={setQuery} placeholder="Search employee or department" placeholderTextColor={colors.subtle} style={styles.search} />
            <ScrollView nestedScrollEnabled style={styles.employeeOptions} keyboardShouldPersistTaps="handled">{filtered.map(employee => <TouchableOpacity key={String(employee.id)} accessibilityLabel={`Loan employee: ${employee.fullName || employee.email}`} accessibilityRole="radio" accessibilityState={{selected: values.employeeId === String(employee.id)}} disabled={submitting} onPress={() => {change('employeeId', String(employee.id)); setEmployeeOpen(false);}} style={styles.option}><View style={styles.employeeCopy}><Text style={styles.optionText}>{employee.fullName || employee.email}</Text>{!!employee.departmentName && <Text style={styles.secondary}>{employee.departmentName}</Text>}</View>{values.employeeId === String(employee.id) && <Icon name="checkmark-outline" size={18} color={colors.primary} />}</TouchableOpacity>)}{!filtered.length && <Text style={styles.empty}>No matching employees.</Text>}</ScrollView>
          </View>}
          <Text style={styles.label}>Title *</Text>
          <TextInput accessibilityLabel="Loan title" value={values.title} onChangeText={value => change('title', value)} editable={!submitting} maxLength={255} placeholder="Loan title" placeholderTextColor={colors.subtle} style={styles.input} />
          <Text style={styles.label}>Loan Type</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Loan type" disabled={submitting} onPress={() => setTypeOpen(!typeOpen)} style={styles.selector}><Text style={styles.selectorText}>{LOAN_TYPES.find(type => type.value === values.loanType)?.label}</Text><Icon name="chevron-down-outline" size={18} color={colors.muted} /></TouchableOpacity>
          {typeOpen && <View style={styles.options}>{LOAN_TYPES.map(type => <TouchableOpacity key={type.value} accessibilityLabel={`Loan type: ${type.label}`} onPress={() => {change('loanType', type.value); setTypeOpen(false);}} disabled={submitting} style={styles.option}><Text style={styles.optionText}>{type.label}</Text></TouchableOpacity>)}</View>}
          <View style={styles.row}><View style={styles.column}><Text style={styles.label}>Amount *{company.currency ? ` (${company.currency})` : ''}</Text><TextInput accessibilityLabel="Loan amount" value={values.loanAmount} onChangeText={value => change('loanAmount', value)} editable={!submitting} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.subtle} style={styles.input} /></View><View style={styles.column}>{renderDateField('Provided Date', values.providedDate, value => change('providedDate', value))}</View></View>
          <Text style={styles.sectionTitle}>Installments</Text>
          <View style={styles.row}><View style={styles.column}><Text style={styles.label}>Installment Amount</Text><TextInput accessibilityLabel="Loan installment amount" value={values.installmentAmount} onChangeText={value => change('installmentAmount', value)} editable={!submitting} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor={colors.subtle} style={styles.input} /></View><View style={styles.column}><Text style={styles.label}>Number of Installments</Text><TextInput accessibilityLabel="Loan installment count" value={values.installments} onChangeText={value => change('installments', value)} editable={!submitting} keyboardType="number-pad" placeholder="Optional" placeholderTextColor={colors.subtle} style={styles.input} /></View></View>
          <View style={styles.dateField}>{renderDateField('Installment Start Date', values.installmentStartDate, value => change('installmentStartDate', value))}</View>
          <Text style={styles.label}>Description</Text><TextInput accessibilityLabel="Loan description" value={values.description} onChangeText={value => change('description', value)} editable={!submitting} multiline placeholder="Optional" placeholderTextColor={colors.subtle} style={[styles.input, styles.description]} />
        </ScrollView>
        <View style={styles.actions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Submit company loan" onPress={submit} disabled={disabled} style={[styles.submit, disabled && styles.disabled]}>{submitting ? <ActivityIndicator color={colors.white} size="small" /> : <Icon name="add-outline" size={18} color={colors.white} />}<Text style={styles.submitText}>{submitting ? 'Creating...' : 'Create Loan'}</Text></TouchableOpacity><TouchableOpacity disabled={submitting} onPress={close} style={styles.cancel}><Text style={styles.textAction}>Cancel</Text></TouchableOpacity></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)'},
  sheet: {maxHeight: '90%', paddingBottom: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.bg},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8},
  heading: {fontSize: 18, fontWeight: '700', color: colors.text},
  iconButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  form: {flexShrink: 1},
  content: {padding: 16},
  company: {fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 16},
  label: {fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 6},
  selector: {minHeight: 46, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, marginBottom: 14},
  selectorText: {flex: 1, fontSize: 14, color: colors.text},
  input: {minHeight: 46, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, color: colors.text, fontSize: 13, marginBottom: 14},
  row: {flexDirection: 'row', gap: 12},
  column: {flex: 1, minWidth: 0},
  sectionTitle: {fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4, marginBottom: 12},
  dateField: {marginBottom: 14},
  options: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, marginBottom: 14},
  employeeOptions: {maxHeight: 180},
  search: {minHeight: 44, paddingHorizontal: 12, fontSize: 13, color: colors.text, borderBottomWidth: 1, borderColor: colors.border},
  option: {minHeight: 44, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8},
  employeeCopy: {flex: 1},
  optionText: {fontSize: 13, color: colors.text, flexShrink: 1},
  secondary: {fontSize: 11, color: colors.muted, marginTop: 3},
  empty: {fontSize: 12, color: colors.muted, padding: 12},
  loading: {marginBottom: 14},
  description: {minHeight: 76, textAlignVertical: 'top'},
  error: {fontSize: 12, lineHeight: 18, color: colors.danger, backgroundColor: colors.dangerSoft, padding: 10, marginBottom: 12, borderRadius: 8},
  actions: {padding: 16, paddingBottom: 0, borderTopWidth: 1, borderColor: colors.border},
  submit: {minHeight: 46, backgroundColor: colors.primary, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8},
  submitText: {fontSize: 14, fontWeight: '700', color: colors.white},
  disabled: {opacity: 0.5},
  cancel: {minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  textAction: {fontSize: 13, fontWeight: '600', color: colors.primary},
});
