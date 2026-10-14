import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {assignableCompanyRoles, companyRolePayload, RoleMember, roleScopes} from '../utils/companyRoles';
import {companyDepartments} from '../utils/departments';
import {roleLabel} from '../utils/roles';
import Icon from './Icon';

function OptionField({label, value, options, onChange, disabled}: {label: string; value: string; options: {value: string; label: string}[]; onChange: (value: string) => void; disabled: boolean}) {
  const [open, setOpen] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => setOpen(!open)} style={styles.selector}>
      <Text style={styles.selectorText}>{options.find(option => option.value === value)?.label || 'Select'}</Text><Icon name={open ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.muted} />
    </TouchableOpacity>
    {open && <View style={styles.options}>{options.map(option => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{selected: value === option.value}} disabled={disabled} style={styles.option} onPress={() => {onChange(option.value); setOpen(false);}}>
      <Text style={styles.optionText}>{option.label}</Text>{value === option.value && <Icon name="checkmark-outline" size={18} color={colors.primary} />}
    </TouchableOpacity>)}</View>}
  </View>;
}

export default function AssignCompanyRoleModal({company, member, callerRoles, callerUserId, onClose, onAssigned}: {company: any; member: RoleMember; callerRoles: string[]; callerUserId?: number | string; onClose: () => void; onAssigned: (assignment: any) => void}) {
  const [roleName, setRoleName] = useState('');
  const [scope, setScope] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState('');
  const [reload, setReload] = useState(0);
  const [accessLevel, setAccessLevel] = useState('FULL');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<ScrollView>(null);
  const roles = assignableCompanyRoles(callerRoles, company, member.userId, callerUserId);
  const scopes = roleScopes(roleName, company);

  useEffect(() => {
    if (scope !== 'DEPARTMENT') return;
    let current = true;
    setDepartmentsLoading(true);
    setDepartmentsError('');
    setDepartments([]);
    api.departments(company.id).then(result => {if (current) setDepartments(companyDepartments(result, company));})
      .catch(err => {if (current) setDepartmentsError(err?.message || 'Unable to load departments.');})
      .finally(() => {if (current) setDepartmentsLoading(false);});
    return () => {current = false;};
  }, [company, scope, reload]);

  const selectRole = (role: string) => {setRoleName(role); setScope(roleScopes(role, company)[0] || ''); setDepartmentId(''); setAccessLevel('FULL'); setError('');};
  const disabled = submitting || (scope === 'DEPARTMENT' && (departmentsLoading || !!departmentsError));
  const close = () => {if (!submittingRef.current) onClose();};
  async function submit() {
    if (submittingRef.current || disabled) return;
    setError('');
    let payload;
    try {payload = companyRolePayload(company, member, {roleName, accessScope: scope, departmentId, accessLevel, reason}, callerRoles, callerUserId, departments);}
    catch (err: any) {setError(err.message); formRef.current?.scrollTo({y: 0, animated: true}); return;}
    submittingRef.current = true;
    setSubmitting(true);
    let result;
    try {result = await api.assignRole(payload);}
    catch (err: any) {
      setError(err?.message || 'Unable to assign role.');
      formRef.current?.scrollTo({y: 0, animated: true});
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    onAssigned(result);
  }

  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.sheet}>
        <View style={styles.header}><Text style={styles.heading}>Assign Role</Text><TouchableOpacity accessibilityLabel="Close role assignment" disabled={submitting} onPress={close} style={styles.iconButton}><Icon name="close-outline" size={22} color={colors.text} /></TouchableOpacity></View>
        <ScrollView ref={formRef} style={styles.form} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.employeeName}>{member.name}</Text><Text style={styles.companyName}>{company.name}</Text>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <OptionField label="Role" value={roleName} options={roles.map(role => ({value: role, label: roleLabel(role)}))} onChange={selectRole} disabled={submitting} />
          {scopes.length === 1 ? <View style={styles.field}><Text style={styles.label}>Access Scope</Text><Text style={styles.fixedScope}>{roleLabel(scopes[0])}</Text></View> : !!roleName && <OptionField label="Access Scope" value={scope} options={scopes.map(value => ({value, label: roleLabel(value)}))} onChange={setScope} disabled={submitting} />}
          {scope === 'DEPARTMENT' && (departmentsLoading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : departmentsError ? <View><Text accessibilityRole="alert" style={styles.error}>{departmentsError}</Text><TouchableOpacity onPress={() => setReload(value => value + 1)}><Text style={styles.textAction}>Retry departments</Text></TouchableOpacity></View> : <OptionField label="Department" value={departmentId} options={departments.map(department => ({value: String(department.id), label: department.name}))} onChange={setDepartmentId} disabled={submitting} />)}
          {roleName === 'ACCOUNT_MANAGER' && <View style={styles.field}>
            <Text style={styles.label}>Company Access</Text><View style={styles.accessOptions}>{['FULL', 'PARTIAL'].map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityLabel={`${roleLabel(value)} company access`} accessibilityState={{selected: accessLevel === value}} disabled={submitting} onPress={() => setAccessLevel(value)} style={[styles.accessOption, accessLevel === value && styles.selectedAccess]}><Text style={styles.optionText}>{value === 'FULL' ? 'Full' : 'Partial (no Payroll)'}</Text></TouchableOpacity>)}</View>
          </View>}
          <Text style={styles.label}>Assignment Reason *</Text>
          <TextInput accessibilityLabel="Role assignment reason" value={reason} onChangeText={setReason} editable={!submitting} maxLength={500} multiline placeholder="e.g. Promoted to HR Manager" placeholderTextColor={colors.subtle} style={styles.reason} />
        </ScrollView>
        <View style={styles.actions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Submit company role assignment" disabled={disabled || !roleName} onPress={submit} style={[styles.submit, (disabled || !roleName) && styles.disabled]}>{submitting ? <ActivityIndicator color={colors.white} size="small" /> : <Icon name="shield-checkmark-outline" size={18} color={colors.white} />}<Text style={styles.submitText}>{submitting ? 'Assigning...' : 'Assign Role'}</Text></TouchableOpacity>
          <TouchableOpacity disabled={submitting} onPress={close} style={styles.cancel}><Text style={styles.textAction}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)'},
  sheet: {maxHeight: '90%', paddingBottom: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.bg},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10},
  heading: {fontSize: 18, fontWeight: '700', color: colors.text},
  iconButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  form: {flexShrink: 1},
  content: {padding: 16},
  employeeName: {fontSize: 15, fontWeight: '700', color: colors.text},
  companyName: {fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 16},
  field: {marginBottom: 14},
  label: {fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 6},
  selector: {minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  selectorText: {flex: 1, fontSize: 14, color: colors.text},
  options: {marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  option: {minHeight: 44, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  optionText: {fontSize: 13, color: colors.text, flexShrink: 1},
  fixedScope: {fontSize: 14, color: colors.text, padding: 12, borderRadius: 8, backgroundColor: colors.primaryLight},
  reason: {minHeight: 76, padding: 12, fontSize: 14, color: colors.text, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  error: {fontSize: 12, lineHeight: 18, color: colors.danger, padding: 10, borderRadius: 8, backgroundColor: colors.dangerSoft, marginVertical: 10},
  loading: {margin: 12},
  accessOptions: {flexDirection: 'row', gap: 8},
  accessOption: {flex: 1, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white},
  selectedAccess: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  actions: {padding: 16, paddingBottom: 0, borderTopWidth: 1, borderColor: colors.border},
  submit: {minHeight: 46, backgroundColor: colors.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  submitText: {fontSize: 14, fontWeight: '700', color: colors.white},
  disabled: {opacity: 0.5},
  cancel: {minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4},
  textAction: {fontSize: 13, fontWeight: '600', color: colors.primary},
});
