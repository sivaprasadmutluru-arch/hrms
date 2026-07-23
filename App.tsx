import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';
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

function Shell() {
  const {booting, token, user, profile} = useAuth();
  const [tab, setTab] = useState<AvailableTabKey>('home');
  const [homeAtRoot, setHomeAtRoot] = useState(true);
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
      <StatusBar barStyle="light-content" backgroundColor={colors.sidebar} />
      <View style={styles.content}>
        {tab === 'home' && <HomeScreen onRootChange={setHomeAtRoot} />}
        {tab === 'admin' && showAdmin && <AdminScreen />}
        {tab === 'checkin' && <CheckInScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      {(tab !== 'home' || homeAtRoot) && <BottomTabs active={tab} onChange={setTab} showAdmin={showAdmin} />}
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
