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
        <Text className="font-semibold text-[15px] text-white" style={outline && styles.outlineText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    shadowColor: colors.primaryDark,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dim: {
    opacity: 0.68,
  },
  outlineText: {
    color: colors.primary,
  },
});
