import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress(): void;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  loading,
  disabled,
  danger,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        danger && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          {Icon ? <Icon color="#FFFFFF" size={18} strokeWidth={2.2} /> : null}
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  danger: { backgroundColor: colors.danger },
  disabled: { backgroundColor: colors.disabled },
  pressed: { opacity: 0.82 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

