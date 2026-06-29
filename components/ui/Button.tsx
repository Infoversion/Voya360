import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { colors, fontSize, spacing } from '@/constants/design';

interface ButtonProps {
  label:      string;
  onPress:    () => void;
  variant?:   'primary' | 'secondary';
  loading?:   boolean;
  disabled?:  boolean;
  large?:     boolean;
  icon?:      string;
  iconColor?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  large = false,
  icon,
  iconColor,
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
        paddingVertical: large ? 14 : 12,
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon && (
            <Text style={{
              fontSize: large ? 24 : fontSize.body,
              lineHeight: large ? 28 : 22,
              marginRight: 8,
              color: iconColor ?? (isPrimary ? '#FFFFFF' : colors.accent),
            }}>
              {icon}
            </Text>
          )}
          <Text
            style={{
              fontSize: large ? 20 : fontSize.body,
              fontWeight: '700',
              color: isPrimary ? '#FFFFFF' : colors.accent,
              lineHeight: large ? 28 : 22,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
