import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Alert} from 'react-native';
import LoginScreen from '../src/screens/LoginScreen';
import {useAuth} from '../src/context/AuthContext';
import {biometricCredentials, isBiometricLoginEnabled, supportedBiometry} from '../src/utils/biometrics';

jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 54, bottom: 34, left: 0, right: 0})}));
jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/utils/biometrics', () => ({supportedBiometry: jest.fn(), isBiometricLoginEnabled: jest.fn(), biometricCredentials: jest.fn()}));

const signIn = jest.fn().mockResolvedValue(undefined);
beforeEach(() => {
  jest.mocked(useAuth).mockReturnValue({signIn} as any);
  jest.mocked(supportedBiometry).mockResolvedValue('FaceID' as any);
  jest.mocked(isBiometricLoginEnabled).mockResolvedValue(false);
});
afterEach(() => {jest.restoreAllMocks(); jest.clearAllMocks();});

it('offers setup on supported devices without saved credentials and explains how to enable it', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<LoginScreen />);});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Enable biometric sign-in'}).props.onPress();});
  expect(alert).toHaveBeenCalledWith('Enable biometric sign-in', expect.stringContaining('Profile'));
  expect(biometricCredentials).not.toHaveBeenCalled();
  expect(signIn).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('uses protected credentials for biometric sign-in when setup is complete', async () => {
  jest.mocked(isBiometricLoginEnabled).mockResolvedValue(true);
  jest.mocked(biometricCredentials).mockResolvedValue({username: 'employee@example.com', password: 'saved-password'});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<LoginScreen />);});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Sign in with biometric'}).props.onPress();});
  expect(biometricCredentials).toHaveBeenCalledTimes(1);
  expect(signIn).toHaveBeenCalledWith('employee@example.com', 'saved-password', true);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
