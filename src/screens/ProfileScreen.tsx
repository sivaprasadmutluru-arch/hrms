import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {launchImageLibrary} from 'react-native-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../components/Card';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import {API_BASE_URL, API_MEDIA_BASE_URL, api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {fonts} from '../theme/typography';
import {dateText, employeeName, initials, money} from '../utils/format';
import {disableBiometricLogin, enableBiometricLogin, isBiometricLoginEnabled, supportedBiometry} from '../utils/biometrics';

type EditForm = {
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  permanentAddress: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  emergencyContactName: string;
  emergencyContact: string;
  emergencyContactRelation: string;
};

const emptyForm: EditForm = {
  phone: '',
  dateOfBirth: '',
  currentAddress: '',
  permanentAddress: '',
  country: '',
  state: '',
  city: '',
  zip: '',
  emergencyContactName: '',
  emergencyContact: '',
  emergencyContactRelation: '',
};

function formFromProfile(profile: any): EditForm {
  return {
    phone: profile?.phone || '',
    dateOfBirth: profile?.dateOfBirth || '',
    currentAddress: profile?.currentAddress || '',
    permanentAddress: profile?.permanentAddress || '',
    country: profile?.country || '',
    state: profile?.state || '',
    city: profile?.city || '',
    zip: profile?.zip || '',
    emergencyContactName: profile?.emergencyContactName || '',
    emergencyContact: profile?.emergencyContact || '',
    emergencyContactRelation: profile?.emergencyContactRelation || '',
  };
}

function photoUrl(profile: any) {
  const path = profile?.photoPath || profile?.photoUrl || profile?.avatarUrl;
  if (!path) {
    return null;
  }
  if (String(path).startsWith('http')) {
    return String(path);
  }
  return `${API_MEDIA_BASE_URL}/media/${String(path).replace(/^\//, '')}`;
}

function fileUrl(path?: string | null) {
  if (!path) {
    return null;
  }
  if (String(path).startsWith('http')) {
    return String(path);
  }
  return `${API_BASE_URL}/files/${String(path).replace(/^\//, '')}`;
}

function companyLogoUrl(company: any, profile: any) {
  return fileUrl(
    company?.logoPath ||
      company?.companyLogoPath ||
      company?.logoUrl ||
      profile?.companyLogoPath ||
      profile?.logoPath ||
      profile?.organizationLogoPath,
  );
}

function organizationName(company: any, profile: any, user: any) {
  return company?.name || company?.companyName || profile?.companyName || user?.companyName || 'Organization';
}

function pickedPhoto(file: any) {
  return {
    uri: file.uri,
    name: file.fileName || `profile-photo-${Date.now()}.jpg`,
    type: file.type || 'image/jpeg',
  };
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Icon name={icon as any} size={18} color={colors.primary} />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </Card>
  );
}

function MiniStat({label, value, tone = 'primary'}: {label: string; value?: string | number | null; tone?: 'primary' | 'success' | 'info'}) {
  const palette = {
    primary: [colors.primaryLight, colors.primary],
    success: [colors.successLight, colors.success],
    info: [colors.infoLight, colors.info],
  }[tone];

  return (
    <View style={styles.miniStat}>
      <View style={[styles.miniIcon, {backgroundColor: palette[0]}]}>
        <Icon name="ellipse" size={8} color={palette[1]} />
      </View>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );
}

function InfoRow({label, value}: {label: string; value?: string | number | null}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );
}

function EditableField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.editField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={colors.subtle}
        multiline={multiline}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {user, profile, signOut, refreshProfile} = useAuth();
  const [workInfo, setWorkInfo] = useState<any>(null);
  const [bank, setBank] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(Date.now());
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const currency = profile?.currencySymbol || '';
  const profilePhotoUrl = photoUrl(profile);
  const avatarSource = profilePhotoUrl ? `${profilePhotoUrl}${profilePhotoUrl.includes('?') ? '&' : '?'}_t=${photoVersion}` : null;
  const orgName = organizationName(companyInfo, profile, user);
  const orgLogo = companyLogoUrl(companyInfo, profile);
  const orgLocation = [companyInfo?.city || profile?.companyCity, companyInfo?.state || profile?.companyState, companyInfo?.country || profile?.companyCountry]
    .filter(Boolean)
    .join(', ');

  const load = useCallback(async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected) {
      return;
    }
    const [workRes, bankRes, companyRes] = await Promise.allSettled([
      api.workInfo(),
      api.bankDetails(),
      api.myCompanyInfo(),
      refreshProfile(),
    ]);
    if (workRes.status === 'fulfilled') {
      setWorkInfo(workRes.value);
    }
    if (bankRes.status === 'fulfilled') {
      setBank(bankRes.value);
    } else {
      setBank(null);
    }
    if (companyRes.status === 'fulfilled') {
      setCompanyInfo(companyRes.value);
    }
  }, [refreshProfile]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editing) {
      setForm(formFromProfile(profile));
    }
  }, [editing, profile]);

  useEffect(() => {
    isBiometricLoginEnabled().then(setBiometricEnabled).catch(() => setBiometricEnabled(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function updateField(key: keyof EditForm, value: string) {
    setForm(current => ({...current, [key]: value}));
  }

  function startEdit() {
    setForm(formFromProfile(profile));
    setEditing(true);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.updateMyProfile({
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        currentAddress: form.currentAddress || undefined,
        permanentAddress: form.permanentAddress || undefined,
        country: form.country || undefined,
        state: form.state || undefined,
        city: form.city || undefined,
        zip: form.zip || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContact: form.emergencyContact || undefined,
        emergencyContactRelation: form.emergencyContactRelation || undefined,
      });
      await refreshProfile();
      setEditing(false);
      Alert.alert('Profile', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Profile', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function changeProfilePhoto() {
    if (uploadingPhoto) {
      return;
    }
    setUploadingPhoto(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel) {
        return;
      }
      const file = result.assets?.[0];
      if (!file?.uri) {
        Alert.alert('Profile Photo', 'Please select a valid photo.');
        return;
      }
      await api.uploadMyPhoto(pickedPhoto(file));
      await refreshProfile();
      setPhotoVersion(Date.now());
      Alert.alert('Profile Photo', 'Profile photo updated successfully.');
    } catch (err: any) {
      const message = String(err?.message || '');
      if (!message.toLowerCase().includes('cancel')) {
        Alert.alert('Profile Photo', message || 'Failed to upload profile photo.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function requestBiometricEnable() {
    try {
      const available = await supportedBiometry();
      if (!available) {
        Alert.alert('Biometric login', 'Fingerprint or Face ID is not available on this device.');
        return;
      }
      setBiometricPassword('');
      setBiometricModalOpen(true);
    } catch {
      Alert.alert('Biometric login', 'Unable to check device biometric support.');
    }
  }

  async function confirmBiometricEnable() {
    const username = user?.email || user?.username || profile?.email;
    if (!username || !biometricPassword) {
      Alert.alert('Biometric login', 'Enter your current password to enable biometric login.');
      return;
    }
    setBiometricLoading(true);
    try {
      // Verify the current password before placing it in the device keychain.
      await api.login(username, biometricPassword);
      await enableBiometricLogin({username, password: biometricPassword});
      setBiometricEnabled(true);
      setBiometricModalOpen(false);
      setBiometricPassword('');
      Alert.alert('Biometric login enabled', 'You can now use your device biometric to sign in securely.');
    } catch (err: any) {
      Alert.alert('Biometric login', err.message || 'Unable to enable biometric login.');
    } finally {
      setBiometricLoading(false);
    }
  }

  async function turnOffBiometricLogin() {
    setBiometricLoading(true);
    try {
      await disableBiometricLogin();
      setBiometricEnabled(false);
    } catch (err: any) {
      Alert.alert('Biometric login', err.message || 'Unable to turn off biometric login.');
    } finally {
      setBiometricLoading(false);
    }
  }

  async function confirmSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setSignOutModalOpen(false);
    }
  }

  return (
    <View className="flex-1 bg-background" style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.sidebar} />
      <View style={[styles.fixedHeader, {paddingTop: insets.top + 12}]}>
        <LinearGradient pointerEvents="none" colors={['#1E1B4B', '#3730A3', '#6366F1']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFill} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Your employee workspace</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Cancel profile editing' : 'Edit profile'} onPress={editing ? () => setEditing(false) : startEdit} style={styles.editButton}>
          <Icon name={editing ? 'close-outline' : 'create-outline'} size={16} color={colors.white} />
          <Text style={styles.editButtonText}>{editing ? 'Cancel' : 'Edit'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.hero}>
          <LinearGradient pointerEvents="none" colors={['#24205E', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={StyleSheet.absoluteFill} />
          <View style={styles.heroIdentity}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={changeProfilePhoto} disabled={uploadingPhoto} style={[styles.avatarWrap, uploadingPhoto && styles.pressed]}>
              <View style={styles.avatar}>
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.primary} />
                ) : avatarSource ? (
                  <Image source={{uri: avatarSource}} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials(profile)}</Text>
                )}
              </View>
              <View style={styles.avatarBadge}>
                <Icon name="camera-outline" size={13} color={colors.white} />
              </View>
            </Pressable>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>Employee Profile</Text>
              <Text style={styles.name}>{employeeName(profile)}</Text>
              <Text style={styles.role}>{profile?.jobPositionName || workInfo?.jobPositionName || 'Employee'}</Text>
              <Text style={styles.company}>{profile?.companyName || user?.companyName || 'HRMS'}</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <MiniStat label="Employee ID" value={profile?.badgeId || profile?.id} />
            <MiniStat label="Department" value={profile?.departmentName || workInfo?.departmentName} tone="info" />
            <MiniStat label="Status" value={profile?.isActive === false ? 'Inactive' : 'Active'} tone="success" />
          </View>
        </View>

        <Card style={styles.organizationCard}>
          <View style={styles.organizationHead}>
            <View style={styles.orgLogo}>
              {orgLogo ? (
                <Image source={{uri: orgLogo}} style={styles.orgLogoImage} />
              ) : (
                <Text style={styles.orgLogoText}>{orgName.slice(0, 2).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.orgCopy}>
              <Text style={styles.orgLabel}>Organization</Text>
              <Text style={styles.orgName} numberOfLines={1}>{orgName}</Text>
              <Text style={styles.orgSub} numberOfLines={1}>
                {companyInfo?.companyType || companyInfo?.type || profile?.branchName || 'Employee workplace'}
              </Text>
            </View>
          </View>
          <View style={styles.orgDetails}>
            <MiniStat label="Branch" value={profile?.branchName || companyInfo?.branchName || companyInfo?.parentName || 'Head Office'} tone="info" />
            <MiniStat label="Department" value={profile?.departmentName || workInfo?.departmentName} />
            <MiniStat label="Location" value={orgLocation || companyInfo?.address || '-'} tone="success" />
          </View>
          {(companyInfo?.email || companyInfo?.phone || companyInfo?.website) && (
            <View style={styles.orgContact}>
              {!!companyInfo?.email && <Text style={styles.orgContactText} numberOfLines={1}>{companyInfo.email}</Text>}
              {!!companyInfo?.phone && <Text style={styles.orgContactText} numberOfLines={1}>{companyInfo.phone}</Text>}
              {!!companyInfo?.website && <Text style={styles.orgContactText} numberOfLines={1}>{companyInfo.website}</Text>}
            </View>
          )}
        </Card>

        {editing ? (
          <Section title="Edit Details" subtitle="Update personal and emergency information" icon="create-outline">
          <EditableField label="Phone" value={form.phone} onChangeText={value => updateField('phone', value)} />
          <EditableField label="Date of Birth" value={form.dateOfBirth} onChangeText={value => updateField('dateOfBirth', value)} placeholder="YYYY-MM-DD" />
          <EditableField label="Current Address" value={form.currentAddress} onChangeText={value => updateField('currentAddress', value)} multiline />
          <EditableField label="Permanent Address" value={form.permanentAddress} onChangeText={value => updateField('permanentAddress', value)} multiline />
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <EditableField label="City" value={form.city} onChangeText={value => updateField('city', value)} />
            </View>
            <View style={styles.col}>
              <EditableField label="State" value={form.state} onChangeText={value => updateField('state', value)} />
            </View>
          </View>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <EditableField label="Country" value={form.country} onChangeText={value => updateField('country', value)} />
            </View>
            <View style={styles.col}>
              <EditableField label="ZIP" value={form.zip} onChangeText={value => updateField('zip', value)} />
            </View>
          </View>
          <EditableField label="Emergency Contact Name" value={form.emergencyContactName} onChangeText={value => updateField('emergencyContactName', value)} />
          <EditableField label="Emergency Contact" value={form.emergencyContact} onChangeText={value => updateField('emergencyContact', value)} />
          <EditableField label="Relation" value={form.emergencyContactRelation} onChangeText={value => updateField('emergencyContactRelation', value)} />
          <View style={styles.saveAction}>
            <PrimaryButton title="Save Changes" loading={saving} onPress={saveProfile} />
          </View>
          </Section>
        ) : (
          <Section title="Contact & Personal" subtitle="Employee personal details" icon="person-circle-outline">
          <InfoRow label="Email" value={profile?.email || user?.email} />
          <InfoRow label="Work Email" value={profile?.workEmail || workInfo?.workEmail} />
          <InfoRow label="Phone" value={profile?.phone} />
          <InfoRow label="Work Phone" value={profile?.workPhone || workInfo?.workMobile} />
          <InfoRow label="Gender" value={profile?.gender} />
          <InfoRow label="Date of Birth" value={dateText(profile?.dateOfBirth)} />
          <InfoRow label="Nationality" value={profile?.nationality} />
          <InfoRow label="Current Address" value={profile?.currentAddress} />
          <InfoRow label="Permanent Address" value={profile?.permanentAddress} />
          <InfoRow label="Emergency Contact" value={[profile?.emergencyContactName, profile?.emergencyContact].filter(Boolean).join(' - ')} />
          </Section>
        )}

        <Section title="Work & Shift" subtitle="Current HR assignment" icon="briefcase-outline">
        <InfoRow label="Department" value={profile?.departmentName || workInfo?.departmentName} />
        <InfoRow label="Job Role" value={profile?.jobRoleName || workInfo?.jobRoleName} />
        <InfoRow label="Job Position" value={profile?.jobPositionName || workInfo?.jobPositionName} />
        <InfoRow label="Shift" value={profile?.shiftName || workInfo?.shiftName} />
        <InfoRow label="Work Type" value={profile?.workTypeName || workInfo?.workTypeName} />
        <InfoRow label="Reporting Manager" value={profile?.reportingManagerName || workInfo?.reportingManagerName} />
        <InfoRow label="Date Joining" value={dateText(profile?.dateJoining || workInfo?.dateJoining)} />
        </Section>

        <Section title="Compensation" subtitle="Salary structure summary" icon="wallet-outline">
        <View style={styles.payGrid}>
          <MiniStat label="Basic" value={money(profile?.basicPay || workInfo?.basicSalary, currency)} />
          <MiniStat label="Housing" value={money(profile?.housingAllowance || workInfo?.housingAllowance, currency)} />
          <MiniStat label="Transport" value={money(profile?.transportAllowance || workInfo?.transportAllowance, currency)} />
          <MiniStat label="Total" value={money(profile?.totalSalary || workInfo?.totalSalary, currency)} tone="success" />
        </View>
        </Section>

        <Section title="Bank Details" subtitle="Payroll bank account" icon="business-outline">
        {bank ? (
          <>
            <InfoRow label="Bank Name" value={bank.bankName} />
            <InfoRow label="Account Number" value={bank.accountNumber} />
            <InfoRow label="Branch" value={bank.branch} />
            <InfoRow label="IFSC Code" value={bank.ifscCode} />
            <InfoRow label="SWIFT Code" value={bank.swiftCode} />
            <InfoRow label="Bank Address" value={bank.address || [bank.city, bank.state, bank.country].filter(Boolean).join(', ')} />
          </>
        ) : (
          <Text style={styles.emptyText}>No bank details are available for this employee.</Text>
        )}
        </Section>

        <Section title="Sign-in security" subtitle="Use this device to sign in faster" icon="finger-print-outline">
          <View style={styles.securityRow}>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Biometric login · {biometricEnabled ? 'Enabled' : 'Not enabled'}</Text>
              <Text style={styles.securityText}>
                {biometricEnabled ? 'Fingerprint or Face ID is enabled on this device.' : 'Enable fingerprint or Face ID after confirming your password.'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={biometricEnabled ? 'Turn off biometric login' : 'Enable biometric login'}
              disabled={biometricLoading}
              onPress={biometricEnabled ? turnOffBiometricLogin : requestBiometricEnable}
              style={[styles.securityButton, biometricEnabled && styles.securityButtonEnabled, biometricLoading && styles.pressed]}>
              {biometricLoading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.securityButtonText}>{biometricEnabled ? 'Turn off' : 'Enable'}</Text>}
            </Pressable>
          </View>
        </Section>

        <View style={styles.logout}>
          <PrimaryButton title="Sign Out" variant="danger" onPress={() => setSignOutModalOpen(true)} />
        </View>
      </ScrollView>

      <Modal visible={biometricModalOpen} transparent animationType="fade" onRequestClose={() => setBiometricModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enable biometric login</Text>
            <Text style={styles.modalText}>Confirm your current password once. It will be encrypted in your device’s secure storage and protected by fingerprint or Face ID.</Text>
            <TextInput
              value={biometricPassword}
              onChangeText={setBiometricPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Current password"
              placeholderTextColor={colors.subtle}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setBiometricModalOpen(false)} disabled={biometricLoading} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Confirm enable biometric login" onPress={confirmBiometricEnable} disabled={biometricLoading} style={styles.modalConfirm}>
                {biometricLoading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.modalConfirmText}>Enable</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={signOutModalOpen} transparent animationType="fade" onRequestClose={() => !signingOut && setSignOutModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.signOutModalCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sign-out dialog"
              disabled={signingOut}
              onPress={() => setSignOutModalOpen(false)}
              style={[styles.signOutModalClose, signingOut && styles.pressed]}>
              <Icon name="close" size={22} color={colors.textMid} />
            </Pressable>
            <View style={styles.signOutModalIcon}>
              <Icon name="log-out-outline" size={25} color={colors.danger} />
            </View>
            <Text style={styles.signOutModalTitle}>Sign out?</Text>
            <Text style={styles.signOutModalText}>You will need to enter your credentials again to access your employee workspace.</Text>
            <View style={styles.signOutModalActions}>
              <Pressable accessibilityRole="button" disabled={signingOut} onPress={() => setSignOutModalOpen(false)} style={[styles.signOutCancel, signingOut && styles.pressed]}>
                <Text style={styles.signOutCancelText}>Stay signed in</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Sign out" disabled={signingOut} onPress={confirmSignOut} style={[styles.signOutConfirm, signingOut && styles.pressed]}>
                {signingOut ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.signOutConfirmText}>Sign out</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  scroller: {flex: 1},
  content: {padding: 14, paddingTop: 12, paddingBottom: 28},
  fixedHeader: {
    backgroundColor: colors.sidebar,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {flex: 1, paddingRight: 12},
  headerTitle: {color: colors.white, fontSize: 22, lineHeight: 28, fontFamily: fonts.bold},
  headerSubtitle: {color: '#C7D2FE', fontSize: 12, fontFamily: fonts.medium, marginTop: 2},
  hero: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#24205E',
    overflow: 'hidden',
  },
  heroIdentity: {flexDirection: 'row', alignItems: 'center', gap: 12},
  heroCopy: {flex: 1},
  avatarWrap: {position: 'relative'},
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {width: '100%', height: '100%'},
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.sidebar,
  },
  avatarText: {color: colors.primaryDark, fontSize: 20, fontWeight: '900'},
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  editButtonText: {color: colors.white, fontSize: 12, fontWeight: '900'},
  pressed: {opacity: 0.72},
  heroLabel: {color: '#C7D2FE', fontSize: 10, fontWeight: '900', textTransform: 'uppercase'},
  name: {color: colors.surface, fontSize: 20, lineHeight: 27, fontFamily: fonts.bold, marginTop: 4},
  role: {color: '#E0E7FF', fontSize: 13, fontWeight: '800', marginTop: 2},
  company: {color: '#C7D2FE', fontSize: 13, fontWeight: '700', marginTop: 2},
  heroStats: {flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 18},
  organizationCard: {padding: 13, marginBottom: 10, borderRadius: 12},
  organizationHead: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12},
  orgLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orgLogoImage: {width: '100%', height: '100%'},
  orgLogoText: {color: colors.primary, fontSize: 17, fontWeight: '900'},
  orgCopy: {flex: 1},
  orgLabel: {color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase'},
  orgName: {color: colors.text, fontSize: 18, lineHeight: 23, fontFamily: fonts.bold, marginTop: 2},
  orgSub: {color: colors.textMid, fontSize: 12, fontWeight: '800', marginTop: 2},
  orgDetails: {flexDirection: 'row', gap: 8},
  orgContact: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    paddingTop: 10,
    gap: 4,
  },
  orgContactText: {color: colors.muted, fontSize: 12, fontWeight: '800'},
  miniStat: {
    flex: 1,
    minHeight: 58,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 9,
    justifyContent: 'center',
  },
  miniIcon: {width: 16, height: 16, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 5},
  miniLabel: {color: colors.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase'},
  miniValue: {color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '900', marginTop: 3},
  section: {marginBottom: 10, padding: 0, overflow: 'hidden', borderRadius: 12},
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 9,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  sectionCopy: {flex: 1},
  sectionTitle: {color: colors.text, fontSize: 16, fontFamily: fonts.semibold},
  sectionSub: {color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 1},
  payGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 16},
  emptyText: {color: colors.muted, fontWeight: '700', paddingHorizontal: 16, paddingBottom: 16},
  infoRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {width: 112, color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase'},
  infoValue: {flex: 1, color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '800'},
  editField: {paddingHorizontal: 16, marginBottom: 12},
  inputLabel: {color: colors.textMid, fontSize: 12, fontWeight: '900', marginBottom: 7},
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: colors.surfaceAlt,
  },
  multilineInput: {minHeight: 82, paddingTop: 12, textAlignVertical: 'top'},
  twoCol: {flexDirection: 'row', gap: 10, paddingHorizontal: 16},
  col: {flex: 1},
  saveAction: {paddingHorizontal: 16, paddingBottom: 16},
  logout: {marginTop: 4},
  securityRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 14},
  securityCopy: {flex: 1},
  securityTitle: {color: colors.text, fontSize: 14, fontFamily: fonts.semibold},
  securityText: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3},
  securityButton: {minWidth: 78, minHeight: 44, flexShrink: 0, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10},
  securityButtonEnabled: {backgroundColor: colors.danger},
  securityButtonText: {color: colors.white, fontSize: 12, fontFamily: fonts.semibold},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(17,24,39,0.48)', justifyContent: 'center', padding: 22},
  modalCard: {backgroundColor: colors.white, borderRadius: 18, padding: 20},
  modalTitle: {color: colors.text, fontSize: 18, fontFamily: fonts.bold},
  modalText: {color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8},
  modalInput: {borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: 10, height: 48, marginTop: 18, paddingHorizontal: 12},
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18},
  modalCancel: {height: 42, justifyContent: 'center', paddingHorizontal: 14},
  modalCancelText: {color: colors.textMid, fontSize: 13, fontFamily: fonts.semibold},
  modalConfirm: {height: 42, minWidth: 82, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14},
  modalConfirmText: {color: colors.white, fontSize: 13, fontFamily: fonts.semibold},
  signOutModalCard: {backgroundColor: colors.white, borderRadius: 20, padding: 22, alignItems: 'center'},
  signOutModalClose: {position: 'absolute', top: 10, right: 10, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, zIndex: 1},
  signOutModalIcon: {width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerLight},
  signOutModalTitle: {color: colors.text, fontSize: 20, fontFamily: fonts.bold, marginTop: 14},
  signOutModalText: {color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7},
  signOutModalActions: {flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 21},
  signOutCancel: {flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt},
  signOutCancelText: {color: colors.textMid, fontSize: 13, fontFamily: fonts.semibold},
  signOutConfirm: {flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger},
  signOutConfirmText: {color: colors.white, fontSize: 13, fontFamily: fonts.semibold},
});
