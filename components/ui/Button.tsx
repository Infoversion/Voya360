import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { colors, fontSize, spacing } from '@/constants/design';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isInactive = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isInactive}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: spacing.touchTarget,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: isPrimary
          ? isInactive ? `${colors.accent}80` : colors.accent
          : 'transparent',
        borderWidth: isPrimary ? 0 : 1.5,
        borderColor: isInactive ? `${colors.accent}80` : colors.accent,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : colors.accent} />
      ) : (
        <Text
          style={{
            fontSize: fontSize.body,
            fontWeight: '700',
            color: isPrimary ? '#FFFFFF' : colors.accent,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
