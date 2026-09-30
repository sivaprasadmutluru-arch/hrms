import React, {useState} from 'react';
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
  Text,
  TextInput,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';

export default function LoginScreen() {
  const {signIn} = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);

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
      await signIn(usernameOrEmail.trim(), password);
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

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{flexGrow: 1}} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={['#312E81', '#6366F1', '#8B5CF6']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={{paddingTop: 72, paddingHorizontal: 24, paddingBottom: 88}}>
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
          </LinearGradient>

          <View className="-mt-10 flex-1 rounded-t-[32px] bg-white px-6 pt-8">
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
              className="mt-6 h-14 overflow-hidden rounded-2xl"
              onPress={submit}
              disabled={loading}>
              <LinearGradient
                colors={['#4F46E5', '#6366F1', '#8B5CF6']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                className="absolute inset-0 flex-row items-center justify-center rounded-2xl">
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="mr-2 font-semibold text-base text-white">Sign In</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              className="mt-3 h-14 flex-row items-center justify-center rounded-2xl border-[1.5px] border-primary"
              onPress={() => Alert.alert('Biometric Login', 'Biometric login will be available soon.')}>
              <MaterialCommunityIcons name="fingerprint" size={21} color="#4F46E5" />
              <Text className="ml-2 font-semibold text-base text-primaryDark">Login with Biometric</Text>
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
