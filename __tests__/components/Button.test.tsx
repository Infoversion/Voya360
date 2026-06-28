import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders the label', async () => {
    const { getByText } = await render(<Button label="Confirm & Pay" onPress={() => {}} />);
    expect(getByText('Confirm & Pay')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Confirm & Pay" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Confirm & Pay" onPress={onPress} disabled />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Confirm & Pay" onPress={onPress} loading />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides label text when loading', async () => {
    const { queryByText } = await render(<Button label="Confirm & Pay" onPress={() => {}} loading />);
    expect(queryByText('Confirm & Pay')).toBeNull();
  });
});
