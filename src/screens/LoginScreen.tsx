import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import Icon from '../components/Icon';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {biometricCredentials, isBiometricLoginEnabled, supportedBiometry} from '../utils/biometrics';

export default function LoginScreen() {
  const {signIn} = useAuth();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const isTablet = width >= 768;
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    isBiometricLoginEnabled()
      .then(enabled => setBiometricReady(Boolean(enabled)))
      .catch(() => setBiometricReady(false));
  }, []);

  async function submit() {
    if (!usernameOrEmail.trim() || !password) {
      setError('Please enter both email or username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const network = await NetInfo.fetch();
      if (!network.isConnected || network.isInternetReachable === false) {
        throw new Error('No internet connection. Please reconnect and try again.');
      }
      await signIn(usernameOrEmail.trim(), password, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    const email = resetEmail.trim();
    if (!email) {
      Alert.alert('Email required', 'Enter the email address registered with HRMS.');
      return;
    }
    setResetting(true);
    try {
      await api.forgotPassword(email);
      setResetOpen(false);
      Alert.alert('Check your email', 'If this email is registered, we sent a secure password reset link. The link expires in 15 minutes.');
    } catch (err: any) {
      Alert.alert('Unable to send reset link', err.message || 'Please contact your HR administrator.');
    } finally {
      setResetting(false);
    }
  }

  async function signInWithBiometrics() {
    if (!biometricReady) {
      const available = await supportedBiometry().catch(() => null);
      Alert.alert('Enable biometric sign-in', available
        ? 'Sign in with your password, then open Profile → Sign-in security → Enable to activate biometric sign-in on this device.'
        : 'Set up Face ID or fingerprint in your device settings and allow this app to use it. Then sign in with your password and open Profile → Sign-in security → Enable.');
      return;
    }
    setError('');
    setBiometricLoading(true);
    try {
      const credentials = await biometricCredentials();
      if (!credentials) {
        setBiometricReady(false);
        setError('Biometric sign-in is not enabled. Sign in with your password and enable it from Profile.');
        return;
      }
      await signIn(credentials.username, credentials.password, true);
    } catch (err: any) {
      setError(err.message || 'Biometric sign-in could not be completed. Use your password instead.');
    } finally {
      setBiometricLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, {paddingTop: insets.top + 24}, isTablet && styles.heroTablet]}>
            <LinearGradient pointerEvents="none" colors={['#312E81', '#6366F1', '#8B5CF6']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={StyleSheet.absoluteFill} />
            <View style={[styles.heroInner, isTablet && styles.heroInnerTablet]}>
              <View className="h-12 flex-row items-center self-start rounded-xl bg-white px-3">
                <Image
                  source={require('../../assets/brand/greaterchange-mark-transparent-1024.png')}
                  className="h-9 w-9"
                  style={{width: 36, height: 36}}
                  resizeMode="contain"
                />
                <Text className="ml-2 font-extrabold text-base tracking-[0.5px] text-textPrimary">GRECHA.AI</Text>
              </View>

              <Text className="mt-5 font-bold text-2xl text-white">HR Management</Text>
              <Text className="mt-1 font-semibold text-xs tracking-[2px] text-white/70">EMPLOYEE MOBILE</Text>

              <View className="mt-6 border-l-[3px] border-white pl-3">
                <Text className="font-medium text-base leading-6 text-white">
                  Empowering People.{`\n`}Simplifying Work.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.formPanel, {paddingBottom: insets.bottom + 16}, isTablet && styles.formPanelTablet]}>
            <Text className="text-center font-bold text-2xl text-textPrimary">Welcome Back</Text>
            <Text className="mt-2 text-center font-regular text-sm text-textSecondary">
              Sign in to access your employee workspace
            </Text>

            {!!error && (
              <View className="mt-5 rounded-xl bg-dangerBg px-4 py-3">
                <Text className="font-medium text-sm text-danger">{error}</Text>
              </View>
            )}

            <View className="mt-6 h-14 flex-row items-center rounded-2xl bg-inputBg px-4">
              <Feather name="user" size={18} color="#4F46E5" />
              <TextInput
                className="ml-3 flex-1 font-regular text-base text-textPrimary"
                value={usernameOrEmail}
                onChangeText={setUsernameOrEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email or username"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mt-4 h-14 flex-row items-center rounded-2xl bg-inputBg px-4">
              <Feather name="lock" size={18} color="#4F46E5" />
              <TextInput
                className="ml-3 flex-1 font-regular text-base text-textPrimary"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
              />
              <Pressable onPress={() => setShowPassword(value => !value)} hitSlop={10}>
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <Pressable
              className="mt-4 flex-row items-center self-start"
              onPress={() => setRememberMe(value => !value)}>
              <View
                className={`h-[22px] w-[22px] items-center justify-center rounded-full ${
                  rememberMe ? 'bg-primary' : 'border border-border bg-inputBg'
                }`}>
                {rememberMe && <Feather name="check" size={13} color="#FFFFFF" />}
              </View>
              <Text className="ml-2 font-regular text-sm text-textPrimary">Remember Me</Text>
            </Pressable>

            <Pressable
              className="mt-3 self-end"
              onPress={() => {
                setResetEmail(usernameOrEmail.trim());
                setResetOpen(true);
              }}>
              <Text className="font-semibold text-sm text-primary">Forgot password?</Text>
            </Pressable>

            <Pressable
              style={styles.primaryButton}
              onPress={submit}
              disabled={loading}>
              <View style={styles.primaryButtonFill}>
                <LinearGradient pointerEvents="none" colors={['#4F46E5', '#6366F1', '#8B5CF6']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFill} />
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={biometricReady ? 'Sign in with biometric' : 'Enable biometric sign-in'}
                style={styles.secondaryButton}
                onPress={signInWithBiometrics}
                disabled={biometricLoading}>
                {biometricLoading ? (
                  <ActivityIndicator color="#4F46E5" />
                ) : (
                  <>
                    <Icon name="finger-print-outline" size={21} color="#4F46E5" />
                    <Text style={styles.secondaryButtonText}>{biometricReady ? 'Sign in with biometric' : 'Enable biometric sign-in'}</Text>
                  </>
                )}
              </Pressable>

            <View className="mt-8 mb-6 flex-row items-center justify-center">
              <Text className="font-regular text-xs text-textPlaceholder">Version 1.0.0</Text>
              <Text className="mx-2 font-regular text-xs text-textPlaceholder">|</Text>
              <Feather name="shield" size={12} color="#9CA3AF" />
              <Text className="ml-1 font-regular text-xs text-textPlaceholder">Secure &amp; Encrypted</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-3xl bg-white p-6">
            <Text className="font-bold text-xl text-textPrimary">Reset password</Text>
            <Text className="mt-2 font-regular text-sm leading-5 text-textSecondary">
              Enter your registered email. We will send a secure link that expires in 15 minutes.
            </Text>
            <View className="mt-5 h-14 flex-row items-center rounded-2xl bg-inputBg px-4">
              <Feather name="mail" size={18} color="#4F46E5" />
              <TextInput
                className="ml-3 flex-1 font-regular text-base text-textPrimary"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Registered email"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable className="h-12 justify-center px-4" onPress={() => setResetOpen(false)} disabled={resetting}>
                <Text className="font-semibold text-sm text-textSecondary">Cancel</Text>
              </Pressable>
              <Pressable className="h-12 items-center justify-center rounded-xl bg-primary px-5" onPress={requestPasswordReset} disabled={resetting}>
                {resetting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-semibold text-sm text-white">Send link</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    backgroundColor: '#312E81',
    paddingBottom: 88,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  heroTablet: {
    marginHorizontal: 44,
    marginTop: 44,
    paddingBottom: 150,
    paddingHorizontal: 48,
    paddingTop: 86,
  },
  heroInner: {},
  heroInnerTablet: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  formPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    marginTop: -40,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  formPanelTablet: {
    alignSelf: 'center',
    borderRadius: 32,
    flex: 0,
    marginTop: 32,
    maxWidth: 760,
    paddingBottom: 34,
    paddingHorizontal: 32,
    paddingTop: 36,
    width: '100%',
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#6366F1',
    height: 56,
    marginTop: 24,
    overflow: 'hidden',
    borderRadius: 16,
    shadowColor: '#4F46E5',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
  primaryButtonFill: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#6366F1',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryButtonText: {
    color: '#4338CA',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
});
