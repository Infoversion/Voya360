import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders label text', async () => {
    const { getByText } = await render(
      <Input label="Email address" value="" onChangeText={() => {}} />,
    );
    expect(getByText('Email address')).toBeTruthy();
  });

  it('shows error message when provided', async () => {
    const { getByText } = await render(
      <Input label="Email address" value="" onChangeText={() => {}} error="Invalid email" />,
    );
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('does not show error when error prop is absent', async () => {
    const { queryByText } = await render(
      <Input label="Email address" value="" onChangeText={() => {}} />,
    );
    expect(queryByText('Invalid email')).toBeNull();
  });

  it('calls onChangeText when user types', async () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = await render(
      <Input label="Email address" value="" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });
});
