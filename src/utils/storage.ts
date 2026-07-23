import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hrms_mobile_session';

export async function loadSession() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSession(session: object) {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}
