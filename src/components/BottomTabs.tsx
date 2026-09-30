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
    <View className="h-[88px] flex-row items-center justify-around border-t border-glassBorder bg-white/95 px-2.5 pb-4 pt-2" style={styles.wrap}>
      {tabs.map(tab => {
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} className="flex-1 items-center justify-center" style={styles.item}>
            <View style={[styles.iconShell, selected && styles.iconShellActive]}>
              <Icon name={(selected ? tab.activeIcon : tab.icon) as any} size={22} color={selected ? colors.surface : colors.muted} />
            </View>
            <Text className={`text-xs ${selected ? 'font-semibold text-primaryDark' : 'font-medium text-textMuted'}`} style={styles.label}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowColor: colors.sidebar,
    shadowOffset: {width: 0, height: -8},
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconShell: {
    width: 42,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShellActive: {
    backgroundColor: colors.primary,
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -27,
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  label: {
    lineHeight: 16,
  },
  labelActive: {
  },
});
