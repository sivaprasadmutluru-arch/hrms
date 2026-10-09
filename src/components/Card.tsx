import React from 'react';
import {StyleSheet, StyleProp, View, ViewStyle} from 'react-native';
import {colors} from '../theme/colors';

export default function Card({children, style}: {children: React.ReactNode; style?: StyleProp<ViewStyle>}) {
  return (
    <View className="rounded-[20px] border border-glassBorder bg-white/90 p-4" style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Cards are separated by a subtle border; strong shadows made long pages
    // look layered and caused visible shadow artefacts while scrolling.
    shadowColor: colors.sidebar,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
});
