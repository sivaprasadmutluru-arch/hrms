import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TextInput} from 'react-native';
import ProfileScreen from '../src/screens/ProfileScreen';
import {api} from '../src/api/client';
import {disableBiometricLogin, enableBiometricLogin, isBiometricLoginEnabled, supportedBiometry} from '../src/utils/biometrics';

jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})}));
jest.mock('../src/context/AuthContext', () => {
  const value = {user: {email: 'employee@example.com'}, profile: {firstName: 'Employee'}, signOut: jest.fn(), refreshProfile: jest.fn().mockResolvedValue({})};
  return {useAuth: () => value};
});
jest.mock('../src/utils/biometrics', () => ({supportedBiometry: jest.fn(), isBiometricLoginEnabled: jest.fn(), enableBiometricLogin: jest.fn(), disableBiometricLogin: jest.fn()}));

beforeEach(() => {
  jest.mocked(supportedBiometry).mockResolvedValue('FaceID' as any);
  jest.mocked(isBiometricLoginEnabled).mockResolvedValue(false);
  jest.mocked(enableBiometricLogin).mockResolvedValue();
  jest.mocked(disableBiometricLogin).mockResolvedValue();
  jest.spyOn(api, 'workInfo').mockResolvedValue({});
  jest.spyOn(api, 'bankDetails').mockResolvedValue(null);
  jest.spyOn(api, 'myCompanyInfo').mockResolvedValue({});
});
afterEach(() => {jest.restoreAllMocks(); jest.clearAllMocks();});

it('enables biometrics only after password verification and allows turning it off', async () => {
  const login = jest.spyOn(api, 'login').mockResolvedValue({token: 'verified'} as any);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<ProfileScreen />);});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Enable biometric login'}).props.onPress();});
  expect(enableBiometricLogin).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => {renderer.root.findAllByType(TextInput).find(input => input.props.placeholder === 'Current password')!.props.onChangeText('current-password');});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Confirm enable biometric login'}).props.onPress();});
  expect(login).toHaveBeenCalledWith('employee@example.com', 'current-password');
  expect(enableBiometricLogin).toHaveBeenCalledWith({username: 'employee@example.com', password: 'current-password'});
  expect(login.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(enableBiometricLogin).mock.invocationCallOrder[0]);
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Turn off biometric login'}).props.onPress();});
  expect(disableBiometricLogin).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByProps({accessibilityLabel: 'Enable biometric login'})).toBeTruthy();
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('keeps biometrics disabled when the password cannot be verified', async () => {
  jest.spyOn(api, 'login').mockRejectedValue(new Error('Invalid credentials'));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<ProfileScreen />);});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Enable biometric login'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findAllByType(TextInput).find(input => input.props.placeholder === 'Current password')!.props.onChangeText('wrong-password');});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Confirm enable biometric login'}).props.onPress();});
  expect(enableBiometricLogin).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({accessibilityLabel: 'Enable biometric login'})).toBeTruthy();
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
