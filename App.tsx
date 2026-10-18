import './global.css';
import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import BottomTabs, {AvailableTabKey} from './src/components/BottomTabs';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import AdminScreen from './src/screens/AdminScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import {colors} from './src/theme/colors';
import {captureCurrentLocation} from './src/utils/location';
import {isAdminRole, userRoles} from './src/utils/roles';
import {fonts} from './src/theme/typography';

// Keep typography consistent across legacy and newly styled screens.
const AppText = Text as typeof Text & {defaultProps?: Record<string, unknown>};
const AppTextInput = TextInput as typeof TextInput & {defaultProps?: Record<string, unknown>};
AppText.defaultProps = {...AppText.defaultProps, style: [{fontFamily: fonts.regular}, AppText.defaultProps?.style]};
AppTextInput.defaultProps = {...AppTextInput.defaultProps, style: [{fontFamily: fonts.regular}, AppTextInput.defaultProps?.style]};

function Shell() {
  const {booting, token, user, profile} = useAuth();
  const [tab, setTab] = useState<AvailableTabKey>('checkin');
  const [homeAtRoot, setHomeAtRoot] = useState(true);
  const [checkInAtRoot, setCheckInAtRoot] = useState(true);
  const showAdmin = isAdminRole(userRoles(user, profile));

  useEffect(() => {
    if (!booting) {
      BootSplash.hide({fade: true});
    }
  }, [booting]);

  useEffect(() => {
    if (token) {
      captureCurrentLocation().catch(() => {
        // Check In/Out remains blocked until location is enabled.
      });
    }
  }, [token]);

  useEffect(() => {
    if (!showAdmin && tab === 'admin') {
      setTab('home');
    }
  }, [showAdmin, tab]);

  if (booting) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <SafeAreaView style={styles.safe} />
      </>
    );
  }

  if (!token) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <LoginScreen />
      </>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.content}>
        {tab === 'home' && <HomeScreen onRootChange={setHomeAtRoot} />}
        {tab === 'admin' && showAdmin && <AdminScreen />}
        {tab === 'checkin' && <CheckInScreen onRootChange={setCheckInAtRoot} />}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      {(tab !== 'home' || homeAtRoot) && (tab !== 'checkin' || checkInAtRoot) && <BottomTabs active={tab} onChange={setTab} showAdmin={showAdmin} />}
    </View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});

export default App;
