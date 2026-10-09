import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export type Position = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
};

export async function requestLocationPermission() {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });
  });
}

export async function captureCurrentLocation() {
  const allowed = await requestLocationPermission();
  if (!allowed) {
    throw new Error('Location permission is required for attendance.');
  }
  return getCurrentPosition();
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          // Nominatim rejects anonymous clients intermittently. Identify the app
          // so a failed reverse lookup is handled predictably by the UI.
          'User-Agent': 'Grecha-HRMS-Mobile/1.0',
        },
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}
