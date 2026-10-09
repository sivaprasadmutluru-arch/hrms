import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text} from 'react-native';
import {colors} from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
};

export default function PrimaryButton({title, onPress, loading, disabled, variant = 'primary'}: Props) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [
        styles.button,
        outline && styles.outline,
        variant === 'danger' && styles.danger,
        (pressed || disabled || loading) && styles.dim,
      ]}
      className="min-h-[52px] items-center justify-center rounded-2xl bg-primary px-[18px]">
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : colors.surface} />
      ) : (
        <Text numberOfLines={1} style={[styles.text, outline && styles.outlineText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    shadowColor: colors.primaryDark,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dim: {
    opacity: 0.68,
  },
  text: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  outlineText: {
    color: colors.textMid,
  },
});
