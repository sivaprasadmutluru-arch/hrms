import React, {useState} from 'react';
import {Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';

export default function LoginScreen() {
  const {signIn} = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        throw new Error('No internet connection. Please reconnect and try again.');
      }
      await signIn(usernameOrEmail.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.brand}>
        <Image
          source={require('../../assets/brand/greaterchange-mark-transparent-1024.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>GRECHA.AI</Text>
        <Text style={styles.subtitle}>EMPLOYEE MOBILE</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Employee Login</Text>

        <View style={styles.inputWrap}>
          <Icon name="mail-outline" size={20} color={colors.muted} />
          <TextInput
            value={usernameOrEmail}
            onChangeText={setUsernameOrEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email or username"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <Icon name="lock-closed-outline" size={20} color={colors.muted} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Icon
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.muted}
            onPress={() => setShowPassword(value => !value)}
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton title="Sign In" onPress={submit} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 22,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 6,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 18,
  },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: '#FBFCFE',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 11,
    borderRadius: 12,
    marginBottom: 12,
    fontWeight: '700',
  },
});
