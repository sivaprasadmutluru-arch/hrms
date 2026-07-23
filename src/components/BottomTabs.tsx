import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from './Icon';
import {colors} from '../theme/colors';

export type TabKey = 'home' | 'checkin' | 'profile';

export type AvailableTabKey = TabKey | 'admin';

const baseTabs: Array<{key: AvailableTabKey; label: string; icon: string; activeIcon: string}> = [
  {key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home'},
  {key: 'checkin', label: 'Check In', icon: 'finger-print-outline', activeIcon: 'finger-print'},
  {key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person'},
];

const adminTab = {key: 'admin' as AvailableTabKey, label: 'Admin', icon: 'shield-outline', activeIcon: 'shield-checkmark'};

export default function BottomTabs({
  active,
  onChange,
  showAdmin = false,
}: {
  active: AvailableTabKey;
  onChange: (tab: AvailableTabKey) => void;
  showAdmin?: boolean;
}) {
  const tabs = showAdmin ? [baseTabs[0], adminTab, baseTabs[1], baseTabs[2]] : baseTabs;

  return (
    <View style={styles.wrap}>
      {tabs.map(tab => {
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.item}>
            <View style={[styles.iconShell, selected && styles.iconShellActive]}>
              <Icon name={(selected ? tab.activeIcon : tab.icon) as any} size={22} color={selected ? colors.surface : colors.muted} />
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 9,
    paddingBottom: 19,
    paddingHorizontal: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconShell: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShellActive: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  labelActive: {
    color: colors.primaryDark,
  },
});
