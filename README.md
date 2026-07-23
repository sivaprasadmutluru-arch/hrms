# GRECHA HRMS Mobile

React Native CLI employee mobile app for the HRMS backend.

## Included

- Native React Native CLI project, not Expo
- Professional Ionicons vector icons
- Native splash screen through `react-native-bootsplash`
- iOS and Android launcher icons generated from `assets/brand/hrms-logo.svg`
- Location permissions for geofenced attendance
- NetInfo connectivity checks
- AsyncStorage session persistence
- Employee login
- Employee details
- Geofence clock-in and clock-out
- Document upload
- Three bottom tabs: Home, Check In, Profile

## Backend API

Default API URLs:

- iOS simulator: `http://localhost:8080/api`
- Android emulator: `http://10.0.2.2:8080/api`

For a physical phone, edit:

```text
src/api/config.ts
```

Set:

```ts
export const API_BASE_URL_OVERRIDE = 'http://YOUR_MAC_IP:8080/api';
```

## Run

Start Metro:

```bash
cd /Users/berymobe4/Desktop/HRMSMobile
ulimit -n 65536 && npm start
```

Run iOS:

```bash
npm run ios
```

Run Android:

```bash
npm run android
```

## Local Test Login

```text
sivaprasadmutluru@gmail.com
Siva@1234
```
