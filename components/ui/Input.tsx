import React, { useState } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { colors, fontSize, spacing } from '@/constants/design';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: fontSize.label,
          color: colors.textMuted,
          marginBottom: 6,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      <TextInput
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        accessible
        accessibilityLabel={label}
        style={{
          height: spacing.touchTarget,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: error ? '#DC2626' : focused ? colors.accent : colors.border,
          paddingHorizontal: 14,
          fontSize: fontSize.body,
          color: colors.text,
          backgroundColor: colors.background,
        }}
      />
      {error && (
        <Text style={{ fontSize: 13, color: '#DC2626', marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
}
