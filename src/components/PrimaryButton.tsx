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
      ]}>
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : colors.surface} />
      ) : (
        <Text style={[styles.text, outline && styles.outlineText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
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
  text: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  outlineText: {
    color: colors.primary,
  },
});
