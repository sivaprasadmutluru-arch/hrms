import * as Keychain from 'react-native-keychain';

const SERVICE = 'ai.grecha.hrms.mobile.biometric-login';

export type BiometricCredentials = {
  username: string;
  password: string;
};

export async function supportedBiometry() {
  return Keychain.getSupportedBiometryType();
}

export async function isBiometricLoginEnabled() {
  return Keychain.hasGenericPassword({service: SERVICE});
}

export async function enableBiometricLogin(credentials: BiometricCredentials) {
  const biometry = await supportedBiometry();
  if (!biometry) {
    throw new Error('Fingerprint or Face ID is not available on this device.');
  }

  const saved = await Keychain.setGenericPassword(credentials.username, credentials.password, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
    authenticationPrompt: {
      title: 'Enable biometric login',
      subtitle: 'Confirm your device identity',
      cancel: 'Cancel',
    },
  });

  if (!saved) {
    throw new Error('Unable to enable biometric login.');
  }
}

export async function biometricCredentials(): Promise<BiometricCredentials | null> {
  const credentials = await Keychain.getGenericPassword({
    service: SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
    authenticationPrompt: {
      title: 'Sign in to GRECHA.AI',
      subtitle: 'Use your device biometric to continue',
      cancel: 'Use password',
    },
  });

  if (!credentials) {
    return null;
  }
  return {username: credentials.username, password: credentials.password};
}

export async function disableBiometricLogin() {
  await Keychain.resetGenericPassword({service: SERVICE});
}
