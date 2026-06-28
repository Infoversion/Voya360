import React from 'react';
import { View } from 'react-native';
import { colors } from '@/constants/design';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  return (
    <View
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
      accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={{
            height: 4,
            flex: 1,
            borderRadius: 2,
            backgroundColor: i < currentStep ? colors.accent : colors.border,
          }}
        />
      ))}
    </View>
  );
}
